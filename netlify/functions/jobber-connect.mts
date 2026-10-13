// One-time setup: sends a Jobber admin to Jobber's consent screen (OAuth code flow + PKCE).
import type { Config } from "@netlify/functions"
import { checkSetupKey, clientId, redirectUri, store } from "../lib/jobber.mts"

const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

export default async (req: Request) => {
  if (!checkSetupKey(req)) return new Response("Not found", { status: 404 })

  const state = b64url(crypto.getRandomValues(new Uint8Array(24)))
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)))
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)))
  await store().setJSON(`pending/${state}`, { verifier, created: Date.now() })

  const url = new URL("https://api.getjobber.com/api/oauth/authorize")
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId(),
    redirect_uri: redirectUri(req),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString()
  return Response.redirect(url.toString(), 302)
}

export const config: Config = { path: "/jobber/connect", method: "GET" }
