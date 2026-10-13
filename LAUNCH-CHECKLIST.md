# DMAK'S HVAC: launch checklist

Moving dmakshvac.com from the old WordPress host to the new Netlify site.
Status as of 2026-10-13. `[x]` = done, `[ ]` = to do, ⚠️ = needs a decision.

## 1. Email: moving to Google Workspace (dan@dmakshvac.com)

The old host's dan@dmakshvac.com forwarded to dmakshvac@gmail.com and kept a 266 MB copy on the server; Dan says it wasn't working well. He's setting up Google Workspace on dmakshvac.com instead (new account; keep dmakshvac@gmail.com, it likely owns the Google Business Profile and other logins). DNS is still in the old host's cPanel (hosting.com, plan paid through Oct 15, 2027). Open cPanel via my.hosting.com, then cpanel.dmakshvac.com (port 2083 is blocked on the office network).

- [x] TTL 300 on the A, www and MX records.
- [x] Dan created Google Workspace for dmakshvac.com (Oct 13).
- [x] Google verification TXT added (Oct 13); domain verified.
- [x] MX is now `1 smtp.google.com` (TTL 300), old MX removed (Oct 13). Confirmed on the authoritative DNS and Google DNS.
- [x] SPF replaced with `v=spf1 include:_spf.google.com ~all` (live on all 4 nameservers, Oct 13). Was: replace SPF with `v=spf1 include:_spf.google.com ~all`, or whatever Workspace shows. Nothing else sends as the domain: Netlify form emails come from Netlify.
- [ ] Turn on DKIM in the Workspace admin and add its TXT record (in Netlify DNS; also in cPanel if before Oct 15). Optional: add a DMARC record (`_dmarc` TXT `v=DMARC1; p=none; rua=mailto:dan@dmakshvac.com`).
- [ ] Test: email dan@dmakshvac.com from outside and reply from it.
- [ ] Later: add dan@dmakshvac.com as an owner of the Google Business Profile; point Netlify form notifications at it. Before the hosting ever lapses, download the old 266 MB mailbox if Dan wants it.

## 2. Site fixes

- [x] Forms: form detection is on and redeployed. All 5 forms are registered (quote, schedule, schedule-a/b/c, plus the internal jobber-alerts form).
- [x] Forms: email notifications set up in Netlify (Oct 13).
- [ ] Forms: submit the quote and schedule forms from your phone on the preview site. All five forms were already tested by sending real submissions to the live site; they reached Netlify and Jobber.
- [x] Analytics: GA4 `G-5BGJHY2MSM` on every page incl. scheduler A/B/C. Events: `generate_lead` (form_name, variant), `phone_call` (link_location), `scheduler_step` (variant, step). Add `?test` to any URL to keep that browser session out of GA4.
- [x] Test pages: keep /schedule-a/, /schedule-b/ and /schedule-c/ live for now. They are the A/B scheduler variants still being tested, and they're wired into Jobber. Revisit once a winner is picked.
- [x] Scheduler A wording/flow approved as-is (Oct 13).
- [x] Booking links: every "Schedule" / "Book online" / "Book a visit" link now goes to scheduler A (`BOOK_URL` in build.js). /schedule/ stays live for search and old links; B and C stay unlinked.
- [x] Claims: Dan confirmed the shop location, financing, "answered within the hour" and "licensed" are all fine (Oct 13).
- [x] Service area: 50 miles (straight line) from Edwardsville per Dan, 236 ZIPs from the Census ZIP file. Outside ZIPs can still book. To change the radius: `node tools/area-zips.js <2025_Gaz_zcta_national.txt> <miles>`, then commit `service-area-zips.js`.
- [x] Not serviced: East St. Louis area ZIPs 62201, 62203, 62204, 62205, 62206, 62207 get "Sorry, Dan doesn't service this ZIP code" and can't book (`EXCLUDED` in tools/area-zips.js). Still serviced, nearby: Brooklyn 62059, Venice 62090, Madison 62060. Confirm with Dan.
- [ ] Service-area tiers: green = known ZIPs (`CORE` in tools/area-zips.js: the 11 Illinois site towns), yellow = within 25 mi ("Dan will confirm") or beyond ("outside our usual area"), red = not serviced. Ask Dan which St. Louis ZIPs/neighborhoods should be green, then add them to `CORE` and re-run the script.
- [x] Domain added in Netlify; `www.dmakshvac.com` is primary and `dmakshvac.com` redirects to it (Oct 13).

### GA4 property settings (property "Dmak", stream https://www.dmakshvac.com)
- [x] Stream measurement ID confirmed as `G-5BGJHY2MSM`. It's the same property the old WordPress site uses, so history carries over.
- [x] Custom dimensions: Scheduler variant (`variant`), Lead form (`form_name`), Scheduler step (`step`), Call link location (`link_location`).
- [x] Event data retention raised from 2 to 14 months.
- [ ] Mark `generate_lead` and `phone_call` as key events (Admin → Events → star them). This is only possible after GA4 has seen each event once, up to 24h after the first real one.
- [x] Internal traffic: rule "Nick work" (71.91.229.8) added and the Internal Traffic filter set to Active, on both Dmak and BetterCram.
- [ ] Add Nick's home IP and Dan's IP as more rules (Dmak + BetterCram: stream → Configure tag settings → Define internal traffic). mangiore.com uses Plausible, so its IPs go under Plausible → Site settings → Shields → IP addresses.
- Note: the preview site (dmakshvac-redesign.netlify.app) reports into the same property until launch. Filter by hostname if those visits get in the way.

## 3. Switch (independent of email; do whenever ready)

- [x] DNS switched (Oct 13): `dmakshvac.com` A → 75.2.60.5, `www` CNAME → dmakshvac-redesign.netlify.app, TTL 300. Old answers stay cached for up to 4h on some resolvers.
- [x] Let's Encrypt certificate issued 1:35 PM Oct 13 (dmakshvac.com + www), auto-renews.

## 4. Check right after

- [x] The bare domain and http both redirect to `https://www.dmakshvac.com` (verified).
- [x] The 6 old city addresses plus /contact-us/ and /about-us/ redirect to the new pages (verified, 301).
- [ ] A form sent from the live domain reaches Dan, by email and in Jobber.
- [ ] The tap-to-call links work.
- [ ] Email (Google Workspace) still works both ways.
- [ ] You show up in GA4 Realtime.
- [ ] Submit the sitemap in Search Console and update the website link on Dan's Google Business Profile.
- [ ] Jobber: add `https://www.dmakshvac.com/jobber/callback` as a callback URL on the "DMAK Website Leads" app. No reconnect needed.

## Jobber integration

- [x] App "DMAK Website Leads" created (Draft; Clients + Requests read/write) and connected to the DMAK'S HVAC account.
- [x] All five forms create a Jobber request, and repeat leads reuse an existing client when the phone or email matches.
- [x] Daily connection check at 9am Central, with failure alerts through Netlify Forms notifications.
- [ ] Delete the test client "TEST Delete-me" and its 5 test requests in Jobber.
- [ ] Optional: generate a new `JOBBER_SETUP_KEY` (the current one appeared in a chat transcript), update it in Netlify, and redeploy.

## Can wait until later this week

- [ ] Real availability in scheduler A: read Dan's Jobber schedule (add "Scheduled items" scope to the Jobber app) and offer only open slots; optionally book the assessment straight onto his calendar. Needs Dan's rules (hours, buffer, max per day).
- [ ] Closed-loop tracking: Jobber webhooks (request → quote → job → paid invoice) → GA4 `qualify_lead` / `close_convert_lead` with job value; same events to Meta Conversions API for his IG/FB ads.
- [ ] Faster lead response: instant text to Dan + auto-reply text to the customer. Check Jobber's built-in notifications / Receptionist first.
- [ ] Google review requests after completed jobs (Jobber's review feature → Dan's Google listing).
- [ ] Jobber Payments: Dan finishes business verification; add a "Customer login: quotes & invoices" link to his Client Hub on the site.
- [ ] Seasonal tune-up reminders to past Jobber clients; optional maintenance-plan page.
- [ ] Google Business Profile booking button → `https://www.dmakshvac.com/schedule-a/?utm_source=google&utm_medium=organic&utm_campaign=gbp_booking` (Dan is setting this up; may need Jobber's Google booking turned off first).
- [ ] More copy on the town pages.
- [ ] Color contrast fixes.
- [ ] Image compression.
- [ ] Facebook link.
- [x] 320px header: logo stays on one line and header keeps its padding down to 320px (verified at 320/360/375/390/412).
- [x] Make the repo private (GitHub reports LordMangiore/Dmak is private).
- [ ] Keep the old hosting for at least 2 weeks. dan@dmakshvac.com is probably a cPanel forwarder to Dan's Gmail (check cPanel → Email → Forwarders / Email Accounts). The forwarding runs on the old host, so BEFORE cancelling: move it to a free forwarder (ImprovMX, or Cloudflare Email Routing) and change the MX to theirs. If it's a real mailbox, save its mail first.
- [x] DNS moved to Netlify DNS (Oct 13, 1:49 PM; registry confirmed). Nameservers: dns1-4.p02.nsone.net. Netlify zone has: site (NETLIFY records for apex + www), MX 1 smtp.google.com, SPF `v=spf1 include:_spf.google.com ~all`, google-site-verification TXT, cpanel + webmail A → 69.72.136.205 (old host, for the old mailbox).
- [ ] Until Oct 15 (~48h): some resolvers still use the old nameservers, so keep the cPanel zone identical. Make any DNS change (e.g. DKIM) in BOTH Netlify and cPanel, and don't cancel the old hosting.
- [ ] Renew the domain before Feb 18, 2027 (registered via hosting.com; registrar Netregistry). Consider transferring it to Netlify or another registrar later so the old account isn't needed at all.
