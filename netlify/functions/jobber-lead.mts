// Every verified Netlify Forms submission (quote, schedule, schedule-a/b/c) becomes a
// Client + Request in Jobber. Netlify still stores the submission and sends its email
// notification, so a Jobber outage never loses a lead; failures land in the function log.
import type { FormSubmittedEvent } from "@netlify/functions"
import { assertNoUserErrors, gql, store } from "../lib/jobber.mts"

type Lead = {
  form: string
  firstName: string
  lastName: string
  phone: string
  email: string
  street: string
  city: string
  state: string
  zip: string
  title: string
  details: string
}

const clean = (v?: string) => (v || "").trim()

// "Edwardsville, IL" → ["Edwardsville", "IL"]; "Other / nearby" → ["", ""]
const splitTown = (town: string): [string, string] => {
  const m = town.match(/^(.+),\s*([A-Z]{2})$/)
  return m ? [m[1], m[2]] : ["", ""]
}

export function toLead(d: Record<string, string>): Lead {
  // Which form: Netlify includes form-name; otherwise infer from the fields each form has
  const form = clean(d["form-name"]) || (d.variant ? `schedule-${clean(d.variant).toLowerCase()}` : d.window || d.date ? "schedule" : "quote")
  const [firstName, ...rest] = clean(d.name).split(/\s+/)
  const [townCity, townState] = splitTown(clean(d.town))
  const city = clean(d.city) || townCity
  const problem = clean(d.problem) || clean(d.service)
  const when = [clean(d.date), clean(d.window)].filter(Boolean).join(", ") || clean(d.when)
  const isBooking = form.startsWith("schedule")

  const details = [
    ["Problem", problem],
    ["Urgency", clean(d.urgency)],
    ["Preferred time", when],
    ["Address", clean(d.address) && [clean(d.address), city, clean(d.zip)].filter(Boolean).join(", ")],
    ["Town", clean(d.town)],
    ["Message", clean(d.message) || clean(d.notes)],
    ["Source", `Website form "${form}"`],
  ].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n")

  return {
    form,
    firstName: firstName || "Website",
    lastName: rest.join(" "),
    phone: clean(d.phone),
    email: clean(d.email),
    street: clean(d.address),
    city,
    state: townState || (city.toLowerCase().includes("st. louis") ? "MO" : city ? "IL" : ""),
    zip: clean(d.zip),
    title: `${isBooking ? "Website booking" : "Website quote"}: ${problem || "Service request"}${clean(d.urgency) ? ` (${clean(d.urgency)})` : ""}`.slice(0, 120),
    details,
  }
}

// Reuse an existing Jobber client when the phone or email already matches one
async function findClient(lead: Lead): Promise<string | null> {
  for (const term of [lead.phone.replace(/\D/g, ""), lead.email]) {
    if (!term) continue
    try {
      const { clients } = await gql(`query($term: String!) { clients(searchTerm: $term, first: 1) { nodes { id } } }`, { term })
      if (clients.nodes[0]) return clients.nodes[0].id
    } catch (e) {
      console.warn("Client lookup skipped:", (e as Error).message)
      return null
    }
  }
  return null
}

async function createClient(lead: Lead): Promise<string> {
  const input: Record<string, unknown> = { firstName: lead.firstName }
  if (lead.lastName) input.lastName = lead.lastName
  if (lead.phone) input.phones = [{ number: lead.phone, primary: true, description: "MAIN" }]
  if (lead.email) input.emails = [{ address: lead.email, primary: true, description: "MAIN" }]
  if (lead.street) {
    const address = { street1: lead.street, city: lead.city, province: lead.state, postalCode: lead.zip, country: "United States" }
    input.billingAddress = address
    input.properties = [{ address }]
  }
  const { clientCreate } = await gql(
    `mutation($input: ClientCreateInput!) { clientCreate(input: $input) { client { id } userErrors { message path } } }`,
    { input }
  )
  assertNoUserErrors("clientCreate", clientCreate)
  return clientCreate.client.id
}

async function createRequest(lead: Lead, clientId: string): Promise<string> {
  const { requestCreate } = await gql(
    `mutation($input: RequestCreateInput!) { requestCreate(input: $input) { request { id } userErrors { message path } } }`,
    { input: { clientId, title: lead.title, assessment: { instructions: lead.details } } }
  )
  assertNoUserErrors("requestCreate", requestCreate)
  return requestCreate.request.id
}

export default {
  async formSubmitted(event: FormSubmittedEvent) {
    const lead = toLead(event.data)
    try {
      const clientId = (await findClient(lead)) || (await createClient(lead))
      const requestId = await createRequest(lead, clientId)
      console.log(`Jobber: ${lead.form} → client ${clientId}, request ${requestId}`)
      await store().setJSON("last-lead", { ok: true, form: lead.form, clientId, requestId, at: new Date().toISOString() })
    } catch (e) {
      // Netlify Forms still has the submission; log enough to re-enter it by hand
      console.error(`Jobber push failed for ${lead.form} (${lead.firstName} ${lead.lastName}, ${lead.phone}):`, (e as Error).message)
      await store().setJSON("last-lead", { ok: false, form: lead.form, error: (e as Error).message, at: new Date().toISOString() })
    }
  },
}
