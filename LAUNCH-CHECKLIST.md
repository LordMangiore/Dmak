# DMAK'S HVAC: launch checklist

Moving dmakshvac.com from the old WordPress host to the new Netlify site.
Status as of 2026-10-13. `[x]` = done, `[ ]` = to do, ⚠️ = needs a decision.

## 1. Protect email (do this first)

DNS is managed in the old host's control panel, so these changes happen there.

- [ ] `mail.dmakshvac.com` is currently an alias that follows the main domain. Change it to a direct A record pointing to `69.72.136.205`.
- [ ] Change the MX record to `0 mail.dmakshvac.com`.
- [ ] In the SPF record, replace `+a` with `ip4:69.72.136.205`.
- [ ] Lower the TTL to 300 on the main domain, www and mail records.
- [ ] On Dan's phone and computer, set the incoming and outgoing mail server to `mail.dmakshvac.com`. If either uses plain `dmakshvac.com`, his mail stops at the switch.
- [ ] Then wait at least 4 hours.

## 2. Site fixes (during the wait)

- [x] Forms: form detection is on and redeployed. All 5 forms are registered (quote, schedule, schedule-a/b/c, plus the internal jobber-alerts form).
- [ ] Forms: set email notifications to Dan and you (Netlify → Forms → Notifications). Lead-sync failure alerts arrive through the same notifications.
- [ ] Forms: submit the quote and schedule forms from your phone on the preview site. All five forms were already tested by sending real submissions to the live site; they reached Netlify and Jobber.
- [x] Analytics: GA4 `G-5BGJHY2MSM` on every page incl. scheduler A/B/C. Events: `generate_lead` (form_name, variant), `phone_call` (link_location), `scheduler_step` (variant, step). Add `?test` to any URL to keep that browser session out of GA4.
- [x] Test pages: keep /schedule-a/, /schedule-b/ and /schedule-c/ live for now. They are the A/B scheduler variants still being tested, and they're wired into Jobber. Revisit once a winner is picked.
- [ ] Claims: text Dan to confirm the shop is in town, the financing, "answered within the hour," and "licensed." Remove anything he can't confirm.
- [ ] Domain: in Netlify, add `www.dmakshvac.com` as the primary domain and `dmakshvac.com` as an alias. The live site doesn't change until DNS does.

### GA4 property settings (property "Dmak", stream https://www.dmakshvac.com)
- [x] Stream measurement ID confirmed as `G-5BGJHY2MSM`. It's the same property the old WordPress site uses, so history carries over.
- [x] Custom dimensions: Scheduler variant (`variant`), Lead form (`form_name`), Scheduler step (`step`), Call link location (`link_location`).
- [x] Event data retention raised from 2 to 14 months.
- [ ] Mark `generate_lead` and `phone_call` as key events (Admin → Events → star them). This is only possible after GA4 has seen each event once, up to 24h after the first real one.
- [ ] Internal traffic filter for your and Dan's IPs (Admin → Data streams → Configure tag settings → Define internal traffic, then activate the filter under Data filters).
- Note: the preview site (dmakshvac-redesign.netlify.app) reports into the same property until launch. Filter by hostname if those visits get in the way.

## 3. Switch (after the 4 hours)

- [ ] Send a test email to dan@dmakshvac.com and reply from his account. Don't continue until both work.
- [ ] Point `www` at `dmakshvac-redesign.netlify.app` and the main domain at `75.2.60.5` (Netlify). Leave the mail record alone.
- [ ] Wait for Netlify to issue the SSL certificate.

## 4. Check right after

- [ ] The bare domain and http both redirect to `https://www.dmakshvac.com`.
- [ ] The 6 old city addresses plus /contact-us/ and /about-us/ redirect to the new pages.
- [ ] A form sent from the live domain reaches Dan, by email and in Jobber.
- [ ] The tap-to-call links work.
- [ ] Email still works both ways.
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

- [ ] More copy on the town pages.
- [ ] Color contrast fixes.
- [ ] Image compression.
- [ ] Facebook link.
- [ ] 320px header: likely done by the mobile pass (hamburger menu, tighter header at ≤360px). Re-check on a real phone.
- [x] Make the repo private (GitHub reports LordMangiore/Dmak is private).
- [ ] Keep the old hosting for at least 2 weeks.
