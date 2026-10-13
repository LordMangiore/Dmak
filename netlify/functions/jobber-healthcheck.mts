// Daily check that the Jobber connection still works (it also keeps the token fresh), so a
// disconnect or retiring API version is caught before a real lead fails.
import type { Config } from "@netlify/functions"
import { API_VERSION, gql, sendAlert, store, tokenStatus } from "../lib/jobber.mts"

export default async () => {
  // Not connected yet: setup is still in progress, nothing to alert on
  if (!(await tokenStatus()).connected) return

  try {
    const { account } = await gql<{ account: { name: string } }>("query { account { name } }")
    console.log(`Jobber connection OK (${account.name})`)
  } catch (e) {
    await sendAlert(
      "Jobber connection is broken",
      `The website can't reach Jobber, so new leads won't appear there (they're still saved in Netlify Forms).\n\n` +
        `Usually this means the app was disconnected in Jobber. Reconnect at /jobber/connect?key=<JOBBER_SETUP_KEY>.\n\n` +
        `Error: ${(e as Error).message}`
    )
    return
  }

  const v = (await store().get("version-warning", { type: "json" })) as { warning: string; at: string } | null
  if (v && Date.now() - Date.parse(v.at) < 26 * 3600e3)
    await sendAlert(`Jobber API version ${API_VERSION} is being retired`, `Update API_VERSION in netlify/lib/jobber.mts.\n\n${v.warning}`)
}

export const config: Config = {
  schedule: "0 14 * * *", // 14:00 UTC = 9am Central (CDT) / 8am (CST)
}
