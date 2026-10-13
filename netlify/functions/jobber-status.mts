// Setup diagnostics: connection state, plus the live schema for the inputs jobber-lead sends,
// so field names/enums can be checked against Jobber's current API version.
import type { Config } from "@netlify/functions"
import { API_VERSION, checkSetupKey, gql, store, tokenStatus } from "../lib/jobber.mts"

const TYPES = ["ClientCreateInput", "RequestCreateInput", "AssessmentCreateInput", "RequestDetailsInput",
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
    out.schema = schema
  } catch (e) {
    out.error = String((e as Error).message)
  }
  return Response.json(out)
}

export const config: Config = { path: "/jobber/status", method: "GET" }
