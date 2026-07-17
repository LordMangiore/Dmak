# DMAK'S HVAC — Website (implemented from Claude Design handoff)

A real, responsive, **multi-page static site** built from the "Bold Contractor" design. Production HTML/CSS/JS (the design's prototype-only runtime has been stripped). Safe to host anywhere — does **not** touch the live WordPress site.

## Pages (real routes — good for SEO)
- `/` — Home (hero + interactive "Problem Solver" triage widget + services + owner + reviews + **on-page quote form** `#quote`)
- `/services/` — Services overview
- `/services/heating/`, `/cooling/`, `/humidifiers/`, `/installs/`, `/maintenance/` — 5 service detail pages
- `/services/<service>/<town>/` — **60 service×town marketing pages** (5 services × 12 towns), each with unique intro, "what we see in <town>" note, 2 town-specific FAQs (FAQPage schema), reviews, and cross-links to sibling towns/services
- `/schedule/` — **online booking**: pick a day + time window, urgency, address; submits as Netlify form `schedule` (Dan confirms by call/text)
- `/about/` · `/service-area/` (live Google Map embed) · `/reviews/` · `/contact/` (working form) · `/privacy/`

## How it's built
- `build.js` — Node generator: holds the content data + page templates, writes every `index.html`. **Edit content/data here, then re-run.**
- `content/combos.json` — the unique copy for the 60 service×town pages (intro / localNote / 2 FAQs per combo). Edit freely; `build.js` reads it at build time. If a combo is missing, that page is skipped with a warning.
- `styles.css` — the design system (exact tokens from the handoff: Ink/Cream/Red/Blue palette, Archivo + Mulish fonts).
- `app.js` — triage widget, solver→quote-form prefill, and schedule-page date guard (no past dates).
- `images/` — all real client photos + logo (optimized: ≤1600px, PNG photos converted to JPEG; `og-image.jpg` is the 1200×630 share image).

**Rebuild after editing `build.js`:**
```
node build.js
```
No framework, no bundler — just regenerates the HTML.

## Preview locally
`node build.js` then open **http://localhost:8787** (a static server on that port). Any file change → just refresh; no relaunch.

## Deploy to Netlify
Drag the whole folder to **app.netlify.com/drop** (or connect via Git; build command: `node build.js`, publish dir: the folder root). The folder/`index.html` structure gives clean URLs (`/services/heating/`) automatically.

**Both forms are wired to Netlify Forms** (`data-netlify="true"`): `quote` (home + contact) and `schedule` (the booking page). Once live: submissions appear under **Site → Forms**; add Dan's email under **Forms → Notifications** so leads reach him. (This is also the clean answer to "where do the leads go" — Dan, not the old vendor's CRM.)

## Placeholder / to finalize
- Reviews: 1 real Google review (Ryan Land) + 5 realistic samples — swap in the real set, and add the real Google Business Profile URL so the 4.9★ badges can link to it.
- Service-area map: real Google embed of the Edwardsville area (no API key). Swap for the exact GBP map if desired.
- Gallery uses a few stock-style `image-2x.jpg` frames where real job photos weren't available for that service — replace as photos come in.
- "Usually within the hour" response claim appears on contact/home/thanks — confirm with Dan or soften.
- The scheduler is a request-a-time form (no backend needed). If Dan ever wants true calendar-slot booking, embed Calendly/Housecall Pro etc. on `/schedule/` in `build.js`.

---
*Implemented from `DMAKS HVAC Site.dc.html` (Claude Design). Live site remains at dmakshvac.com on WordPress.*
