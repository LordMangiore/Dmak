# DMAK'S HVAC — Website (implemented from Claude Design handoff)

A real, responsive, **multi-page static site** built from the "Bold Contractor" design. Production HTML/CSS/JS (the design's prototype-only runtime has been stripped). Safe to host anywhere — does **not** touch the live WordPress site.

## Pages (real routes — good for SEO)
- `/` — Home (hero + interactive "Problem Solver" triage widget + services + owner + reviews)
- `/services/` — Services overview
- `/services/heating/`, `/cooling/`, `/humidifiers/`, `/installs/`, `/maintenance/` — 5 service detail pages
- `/about/` · `/service-area/` (live Google Map embed) · `/reviews/` · `/contact/` (working form)

## How it's built
- `build.js` — Node generator: holds the content data + page templates, writes every `index.html`. **Edit content/data here, then re-run.**
- `styles.css` — the design system (exact tokens from the handoff: Ink/Cream/Red/Blue palette, Archivo + Mulish fonts).
- `app.js` — the triage widget interactivity.
- `images/` — all real client photos + logo.

**Rebuild after editing `build.js`:**
```
node build.js
```
No framework, no bundler — just regenerates the HTML.

## Preview locally
`node build.js` then open **http://localhost:8787** (a static server on that port). Any file change → just refresh; no relaunch.

## Deploy to Netlify
Drag the whole folder to **app.netlify.com/drop** (or connect via Git; build command: `node build.js`, publish dir: the folder root). The folder/`index.html` structure gives clean URLs (`/services/heating/`) automatically.

**The contact form is wired to Netlify Forms** (`data-netlify="true"`). Once live: submissions appear under **Site → Forms**; add Dan's email under **Forms → Notifications** so leads reach him. (This is also the clean answer to "where do the leads go" — Dan, not the old vendor's CRM.)

## Placeholder / to finalize
- Reviews: 1 real Google review (Ryan Land) + 5 realistic samples — swap in the real set.
- Service-area map: real Google embed of the Edwardsville area (no API key). Swap for the exact GBP map if desired.
- Gallery uses a few stock-style `image-*.png` frames where real job photos weren't available for that service — replace as photos come in.

---
*Implemented from `DMAKS HVAC Site.dc.html` (Claude Design). Live site remains at dmakshvac.com on WordPress.*
