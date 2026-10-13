// Every verified Netlify Forms submission (quote, schedule, schedule-a/b/c) becomes a
// Client + Request in Jobber. Netlify still stores the submission and sends its email
// notification, so a Jobber outage never loses a lead; failures land in the function log.
import type { FormSubmittedEvent } from "@netlify/functions"
import { ALERT_FORM, assertNoUserErrors, gql, sendAlert, store } from "../lib/jobber.mts"

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
  // Q&A for the request's "Service details" section (same place Jobber's own request form fills)
  answers: [string, string][]
}

const clean = (v?: string) => (v || "").trim()

// "Edwardsville, IL" → ["Edwardsville", "IL"]; "Other / nearby" → ["", ""]
const splitTown = (town: string): [string, string] => {
  const m = town.match(/^(.+),\s*([A-Z]{2})$/)
  return m ? [m[1], m[2]] : ["", ""]
}
// Service-area ZIPs are Illinois 62xxx or Missouri 63xxx-65xxx
const stateForZip = (zip: string) => (/^62\d{3}$/.test(zip) ? "IL" : /^6[3-5]\d{3}$/.test(zip) ? "MO" : "")
// "nicho mangiore" → "Nicho Mangiore"; leave mixed-case names (McDonald, DeShawn) as typed
const tidyName = (s: string) => (s === s.toLowerCase() || s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, c => c.toUpperCase()) : s)
const sameStreet = (a: string, b: string) => a.toLowerCase().replace(/[^a-z0-9]/g, "") === b.toLowerCase().replace(/[^a-z0-9]/g, "")

export function toLead(d: Record<string, string>): Lead {
  // Which form: Netlify includes form-name; otherwise infer from the fields each form has
  const form = clean(d["form-name"]) || (d.variant ? `schedule-${clean(d.variant).charAt(0).toLowerCase()}` : d.window || d.date ? "schedule" : "quote")
  const [firstName, ...rest] = tidyName(clean(d.name)).split(/\s+/)
  const [townCity, townState] = splitTown(clean(d.town))
  // City can arrive as its own field ("Edwardsville, IL" from the town list), as the schedule
  // page's town, or (older scheduler A submissions) after a comma in the street field
  let street = clean(d.address)
  let [city, cityState] = splitTown(clean(d.city))
  if (!city) city = clean(d.city) || townCity
  if (!city && street.includes(",")) { const i = street.indexOf(","); city = street.slice(i + 1).trim(); street = street.slice(0, i).trim() }
  const zip = clean(d.zip)
  const problem = clean(d.problem) || clean(d.service)
  const when = [clean(d.date), clean(d.window)].filter(Boolean).join(", ") || clean(d.when)
  const isBooking = form.startsWith("schedule")

  const details = [
    ["Problem", problem],
    ["Urgency", clean(d.urgency)],
    ["Preferred time", when],
    ["Address", street && [street, city, zip].filter(Boolean).join(", ")],
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
    street,
    city,
    state: cityState || townState || stateForZip(zip) || (city.toLowerCase().includes("st. louis") ? "MO" : city ? "IL" : ""),
    zip,
    title: `${problem || "Service request"}${clean(d.urgency) ? ` (${clean(d.urgency)})` : ""}`.slice(0, 120),
    details,
    answers: ([
      ["What do you need help with?", problem],
      ["How soon do you need us?", clean(d.urgency)],
      ["Preferred time", when],
      ["Please provide as much information as you can", clean(d.message) || clean(d.notes)],
      ["How did you hear about us?", `Website (${isBooking ? "online booking" : "quote form"})`],
    ] as [string, string][]).filter(([, v]) => v),
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

const addressOf = (lead: Lead) =>
  ({ street1: lead.street, city: lead.city, province: lead.state, postalCode: lead.zip, country: "United States" })

// New client: created with the address as its billing address and first property
async function createClient(lead: Lead): Promise<{ clientId: string; propertyId: string | null }> {
  const input: Record<string, unknown> = { firstName: lead.firstName, sourceAttribution: { sourceText: "Website" } }
  if (lead.lastName) input.lastName = lead.lastName
  if (lead.phone) input.phones = [{ number: lead.phone, primary: true, description: "MAIN" }]
  if (lead.email) input.emails = [{ address: lead.email, primary: true, description: "MAIN" }]
  if (lead.street) {
    input.billingAddress = addressOf(lead)
    input.properties = [{ address: addressOf(lead) }]
  }
  const { clientCreate } = await gql(
    `mutation($input: ClientCreateInput!) { clientCreate(input: $input) {
      client { id clientProperties(first: 1) { nodes { id } } } userErrors { message path } } }`,
    { input }
  )
  assertNoUserErrors("clientCreate", clientCreate)
  const client = clientCreate.client
  return { clientId: client.id, propertyId: client.clientProperties?.nodes?.[0]?.id || null }
}

// Returning client: reuse the property at this street if they have one, otherwise add it
async function propertyFor(lead: Lead, clientId: string): Promise<string | null> {
  if (!lead.street) return null
  const { client } = await gql(
    `query($id: EncodedId!) { client(id: $id) { clientProperties(first: 50) { nodes { id address { street1 } } } } }`,
    { id: clientId }
  )
  const match = client?.clientProperties?.nodes?.find((p: any) => p.address?.street1 && sameStreet(p.address.street1, lead.street))
  if (match) return match.id
  const { propertyCreate } = await gql(
    `mutation($clientId: EncodedId!, $input: PropertyCreateInput!) { propertyCreate(clientId: $clientId, input: $input) {
      properties { id } userErrors { message path } } }`,
    { clientId, input: { properties: [{ address: addressOf(lead) }] } }
  )
  assertNoUserErrors("propertyCreate", propertyCreate)
  return propertyCreate.properties?.[0]?.id || null
}

const REQUEST_CREATE = `mutation($input: RequestCreateInput!) { requestCreate(input: $input) { request { id } userErrors { message path } } }`

// Details go in "Service details" like Jobber's own request form. If Jobber ever rejects that
// shape, fall back to the assessment instructions so the lead is never lost.
async function createRequest(lead: Lead, clientId: string, propertyId: string | null): Promise<string> {
  const base: Record<string, unknown> = { clientId, title: lead.title }
  if (propertyId) base.propertyId = propertyId
  try {
    const details = { form: { sections: [{ label: "Service details", items: lead.answers.map(([label, answerText]) => ({ label, answerText })) }] } }
    const { requestCreate } = await gql(REQUEST_CREATE, { input: { ...base, requestDetails: details } })
    assertNoUserErrors("requestCreate", requestCreate)
    return requestCreate.request.id
  } catch (e) {
    console.warn("Service details rejected, using assessment instructions:", (e as Error).message)
    const { requestCreate } = await gql(REQUEST_CREATE, { input: { ...base, assessment: { instructions: lead.details } } })
    assertNoUserErrors("requestCreate", requestCreate)
    return requestCreate.request.id
  }
}

export default {
  async formSubmitted(event: FormSubmittedEvent) {
    // Our own failure alerts are form submissions too; never push those to Jobber
    if (event.data.alert || event.data["form-name"] === ALERT_FORM) return
    const lead = toLead(event.data)
    try {
      const existing = await findClient(lead)
      let clientId: string, propertyId: string | null = null
      if (existing) {
        clientId = existing
        // A property problem shouldn't cost the lead: fall back to a request without one
        try { propertyId = await propertyFor(lead, clientId) } catch (e) { console.warn("Property lookup/create skipped:", (e as Error).message) }
      } else {
        ;({ clientId, propertyId } = await createClient(lead))
      }
      const requestId = await createRequest(lead, clientId, propertyId)
      console.log(`Jobber: ${lead.form} → client ${clientId}, property ${propertyId}, request ${requestId}`)
      await store().setJSON("last-lead", { ok: true, form: lead.form, clientId, propertyId, requestId, at: new Date().toISOString() })
    } catch (e) {
      // Netlify Forms still has the submission; log enough to re-enter it by hand
      console.error(`Jobber push failed for ${lead.form} (${lead.firstName} ${lead.lastName}, ${lead.phone}):`, (e as Error).message)
      await store().setJSON("last-lead", { ok: false, form: lead.form, error: (e as Error).message, at: new Date().toISOString() })
      await sendAlert(
        `Jobber sync failed: ${lead.firstName} ${lead.lastName}`.trim(),
        `A website lead did NOT reach Jobber. It is still saved in Netlify Forms.\n\n` +
          `Name: ${lead.firstName} ${lead.lastName}\nPhone: ${lead.phone}\nEmail: ${lead.email}\n${lead.details}\n\n` +
          `Error: ${(e as Error).message}`
      )
    }
  },
}
