// OAuth redirect target: trades Jobber's code for tokens and stores them in Blobs.
import type { Config } from "@netlify/functions"
import { exchangeCode, gql, store } from "../lib/jobber.mts"

const page = (title: string, msg: string, status = 200) =>
  new Response(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
      `<body style="font:16px/1.5 system-ui;max-width:520px;margin:15vh auto;padding:0 20px"><h1>${title}</h1><p>${msg}</p>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  )

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)

export default async (req: Request) => {
  const params = new URL(req.url).searchParams
  const code = params.get("code"), state = params.get("state")
  if (!code || !state) return page("Jobber connection failed", "Missing code or state. Start again from the connect link.", 400)

  const pending = (await store().get(`pending/${state}`, { type: "json" })) as { verifier: string; created: number } | null
  await store().delete(`pending/${state}`)
  if (!pending || Date.now() - pending.created > 10 * 60e3)
    return page("Jobber connection failed", "This link expired or was already used. Start again from the connect link.", 400)

  try {
    await exchangeCode(code, pending.verifier, req)
    const { account } = await gql<{ account: { id: string; name: string } }>("query { account { id name } }")
    await store().setJSON("account", { ...account, connectedAt: new Date().toISOString() })
    return page("Jobber connected", `Website leads will now be sent to <b>${esc(account.name)}</b> in Jobber. You can close this tab.`)
  } catch (e) {
    console.error(e)
    return page("Jobber connection failed", esc(String((e as Error).message)), 500)
  }
}

export const config: Config = { path: "/jobber/callback", method: "GET" }
