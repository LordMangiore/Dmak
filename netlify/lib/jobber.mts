// Jobber API client: OAuth token storage/refresh (Netlify Blobs) + GraphQL calls.
// Setup flow: /jobber/connect?key=… → Jobber consent → /jobber/callback stores the tokens.
import { getStore } from "@netlify/blobs"

const API = "https://api.getjobber.com/api"
// Pinned API version (newest in Jobber's changelog as of Oct 2026). Bump deliberately.
export const API_VERSION = "2026-09-25"

type Tokens = { access_token: string; refresh_token: string; expires_at: number }

// Strong consistency: Jobber rotates refresh tokens, so a stale read would hand back a dead token.
export const store = () => getStore({ name: "jobber", consistency: "strong" })

const env = (k: string) => {
  const v = Netlify.env.get(k)
  if (!v) throw new Error(`Missing env var ${k}`)
  return v
}
export const clientId = () => env("JOBBER_CLIENT_ID")
const clientSecret = () => env("JOBBER_CLIENT_SECRET")

export const redirectUri = (req: Request) =>
  Netlify.env.get("JOBBER_REDIRECT_URI") || new URL("/jobber/callback", req.url).toString()

// Gate for the setup/status endpoints so strangers can't (re)connect the account
export const checkSetupKey = (req: Request) => {
  const key = new URL(req.url).searchParams.get("key")
  return !!key && key === Netlify.env.get("JOBBER_SETUP_KEY")
}

// Access tokens are JWTs; fall back to their `exp` claim if expires_in is missing
const jwtExp = (token: string) => {
  try { return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp * 1000 }
  catch { return Date.now() + 55 * 60e3 }
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), ...params }),
  })
  if (!res.ok) throw new Error(`Jobber token request failed (${res.status}): ${await res.text()}`)
  return res.json()
}

async function saveTokens(json: any, previous?: Tokens): Promise<Tokens> {
  const tokens: Tokens = {
    access_token: json.access_token,
    // With rotation on, every refresh returns a new refresh token; keep the old one if not
    refresh_token: json.refresh_token || previous?.refresh_token || "",
    expires_at: json.expires_in ? Date.now() + json.expires_in * 1000 : jwtExp(json.access_token),
  }
  await store().setJSON("tokens", tokens)
  return tokens
}

export const exchangeCode = (code: string, verifier: string, req: Request) =>
  tokenRequest({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: redirectUri(req) })
    .then(json => saveTokens(json))

export async function tokenStatus() {
  const t = (await store().get("tokens", { type: "json" })) as Tokens | null
  return t ? { connected: true, accessTokenExpires: new Date(t.expires_at).toISOString() } : { connected: false }
}

async function accessToken(): Promise<string> {
  const t = (await store().get("tokens", { type: "json" })) as Tokens | null
  if (!t) throw new Error("Jobber is not connected yet. Visit /jobber/connect?key=<JOBBER_SETUP_KEY>")
  if (t.expires_at - Date.now() > 5 * 60e3) return t.access_token
  const fresh = await saveTokens(await tokenRequest({ grant_type: "refresh_token", refresh_token: t.refresh_token }), t)
  return fresh.access_token
}

export async function gql<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "X-JOBBER-GRAPHQL-VERSION": API_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.errors) throw new Error(`Jobber GraphQL error (${res.status}): ${JSON.stringify(body.errors || body)}`)
  // Jobber warns here ~3 months before API_VERSION stops being supported
  const warning = body.extensions?.versioning?.warning
  if (warning) { console.warn("Jobber API version:", warning); await store().setJSON("version-warning", { warning, at: new Date().toISOString() }) }
  return body.data
}

// Alerts go through a hidden Netlify form ("jobber-alerts", defined in build.js) so they land in
// the same inbox as lead notifications without adding an email service.
export const ALERT_FORM = "jobber-alerts"
export async function sendAlert(subject: string, message: string) {
  const site = Netlify.env.get("URL") || "https://dmakshvac-redesign.netlify.app"
  try {
    const res = await fetch(new URL("/jobber-alerts/", site), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ "form-name": ALERT_FORM, alert: "1", subject, message }).toString(),
    })
    if (!res.ok) console.error(`Alert form POST failed (${res.status})`)
  } catch (e) {
    console.error("Alert form POST failed:", (e as Error).message)
  }
}

// Mutations report validation problems in userErrors rather than as GraphQL errors
export const assertNoUserErrors = (label: string, payload: { userErrors?: { message: string; path?: string[] }[] }) => {
  if (payload?.userErrors?.length) throw new Error(`${label}: ${JSON.stringify(payload.userErrors)}`)
}
