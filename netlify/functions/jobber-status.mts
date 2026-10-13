// Setup diagnostics: connection state, plus the live schema for the inputs jobber-lead sends,
// so field names/enums can be checked against Jobber's current API version.
import type { Config } from "@netlify/functions"
import { API_VERSION, checkSetupKey, gql, store, tokenStatus } from "../lib/jobber.mts"

const TYPES = ["PropertyCreateInput", "PropertyCreateAttributes", "ClientCreateInput", "RequestCreateInput", "AssessmentCreateInput", "RequestDetailsInput",
  "PhoneNumberCreateAttributes", "PhoneNumberDescription", "EmailCreateAttributes", "EmailDescription",
  "AddressAttributes", "PropertyAttributes", "SourceAttributionAttributes"]

const typeQuery = `query($name: String!) { __type(name: $name) {
  name kind
  inputFields { name type { kind name ofType { kind name ofType { kind name ofType { name } } } } }
  fields { name }
  enumValues { name }
} }`

const typeName = (t: any): string =>
  !t ? "?" : t.kind === "NON_NULL" ? typeName(t.ofType) + "!" : t.kind === "LIST" ? `[${typeName(t.ofType)}]` : t.name

export default async (req: Request) => {
  if (!checkSetupKey(req)) return new Response("Not found", { status: 404 })
  const out: Record<string, unknown> = { apiVersion: API_VERSION, ...(await tokenStatus()) }
  out.account = await store().get("account", { type: "json" })
  out.lastLead = await store().get("last-lead", { type: "json" })
  if (!out.connected) return Response.json(out)

  // Most recent requests, to confirm website leads land with the right client + property
  try {
    const { __type: sk } = await gql(`{ __type(name: "RequestsSortKey") { enumValues { name } } }`)
    const keys = sk.enumValues.map((v: any) => v.name)
    const key = keys.find((k: string) => /CREATED/.test(k)) || keys.find((k: string) => /REQUESTED|DATE/.test(k)) || keys[0]
    out.requestSortKeys = keys
    const { requests } = await gql(`{ requests(first: 6, sort: [{ key: ${key}, direction: DESCENDING }]) { nodes {
      title createdAt client { name } property { address { street city province postalCode } } } } }`)
    out.recentRequests = requests.nodes.map((r: any) => ({
      at: r.createdAt, client: r.client?.name, title: r.title,
      property: r.property ? [r.property.address.street, r.property.address.city, r.property.address.province, r.property.address.postalCode].filter(Boolean).join(", ") : null,
    }))
  } catch (e) {
    out.recentRequestsError = String((e as Error).message)
  }

  try {
    const schema: Record<string, unknown> = {}
    for (const name of TYPES) {
      const { __type: t } = await gql(typeQuery, { name })
      schema[name] = !t ? "not found"
        : t.inputFields ? Object.fromEntries(t.inputFields.map((f: any) => [f.name, typeName(f.type)]))
        : t.enumValues?.map((v: any) => v.name)
    }
    const { __type: q } = await gql(`{ __type(name: "Query") { fields { name args { name } } } }`)
    schema["Query.clients args"] = q.fields.find((f: any) => f.name === "clients")?.args.map((a: any) => a.name)
    // Property handling: which mutations exist and what a Client exposes
    const { __type: m } = await gql(`{ __type(name: "Mutation") { fields { name args { name type { name kind ofType { name } } } } } }`)
    schema["Mutation (property/request)"] = m.fields.filter((f: any) => /propert|request/i.test(f.name))
      .map((f: any) => f.name + "(" + f.args.map((a: any) => a.name + ":" + (a.type.name || a.type.ofType?.name)).join(", ") + ")")
    const { __type: c } = await gql(`{ __type(name: "Client") { fields { name } } }`)
    schema["Client fields (property)"] = c.fields.map((f: any) => f.name).filter((n: string) => /propert|billing/i.test(n))
    const { __type: cp } = await gql(`{ __type(name: "ClientCreatePayload") { fields { name } } }`)
    schema["ClientCreatePayload fields"] = cp?.fields.map((f: any) => f.name)
    const fieldsOf = async (name: string) => {
      const { __type: t } = await gql(`query($n: String!) { __type(name: $n) { fields { name type { name kind ofType { name kind ofType { name } } } } } }`, { n: name })
      return t ? t.fields.map((f: any) => `${f.name}:${typeName(f.type)}`) : "not found"
    }
    for (const n of ["PropertyCreatePayload", "Property", "PropertyAddress", "PropertyConnection"]) schema[n + " fields"] = await fieldsOf(n)
    schema["Client.clientProperties type"] = (await fieldsOf("Client") as string[]).find(f => f.startsWith("clientProperties"))
    out.schema = schema
  } catch (e) {
    out.error = String((e as Error).message)
  }
  return Response.json(out)
}

export const config: Config = { path: "/jobber/status", method: "GET" }
