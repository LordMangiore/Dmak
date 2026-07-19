// Static site generator for DMAK'S HVAC — "Bold Contractor" (from Claude Design handoff)
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const PHONE = '(314) 420-9851', TEL = 'tel:+13144209851';
// Business hours (single source of truth): Mon–Sat 8am–8pm, closed Sunday
const HOURS = 'Open daily 8a–8p';
const HOURS_FULL = 'Open daily 8:00a – 8:00p';
// Dan's real Google Business Profile (resolved from the GBP share link). Rating/count are the live figures.
const GBP = 'https://maps.google.com/?cid=7991446230126163755';
const RATING = '5.0', REVIEW_COUNT = '95+';
const STAR = '<span class="star">★</span>'; // optically-centered star glyph (Archivo lacks ★)
const RED = '#CE3F26', BLUE = '#2E76AE', ORANGE = '#E0823F';
const amp = s => String(s).replace(/&(?![a-z]+;)/gi, '&amp;');
const img = p => '/images/' + p.replace(/^uploads\//, '');
// House style: body copy uses commas where an em-dash would go. Titles keep their dashes.
const dash = s => String(s).replace(/\s*—\s*/g, ', ');

const SERVICES = [
  { id:'heating', name:'Heating', short:'Furnaces, heat pumps, repairs & tune-ups.', accent:RED,
    card:'DSC07711-scaled.jpeg', hero:'DSC07707-scaled.jpeg',
    tagline:'Furnaces, heat pumps, and fast repairs — so nobody rides out a cold night.',
    intro:"When the temperature drops and your furnace quits, you need someone who picks up and shows up. We repair, tune, and replace gas furnaces and heat pumps across the Metro East — and we stock common parts on the truck, so most heating calls get fixed the same day.",
    includes:['Furnace repair & diagnostics','Heat pump service & repair','New furnace installation','Igniter, blower & control board work','Thermostat replacement','Annual heating tune-ups'],
    signs:[{t:'No heat at all',d:"Furnace won't start or blows cold — often an igniter, flame sensor, or safety switch."},{t:'Short cycling',d:'Turns on and off constantly. Usually airflow, a sensor, or an oversized system.'},{t:'Burning or gas smell',d:"Shut it down and call us. We'll find the cause before it becomes a bigger repair."}],
    gallery:['DSC07707-scaled.jpeg','image-24.jpg','image-25.jpg'] },
  { id:'cooling', name:'Cooling', short:'AC install & fast repair for hot summers.', accent:BLUE,
    card:'DSC07667-scaled.jpeg', hero:'DSC07649-scaled.jpeg',
    tagline:'AC repair and installs that keep up with a St. Louis summer.',
    intro:"A dead AC in July is an emergency in this heat. We diagnose and repair central air fast, and when it's time to replace, we size the new system right for your home — no guesswork, no upsell.",
    includes:['Central AC repair','Refrigerant leak diagnosis','Capacitor & compressor service','New AC installation','Coil cleaning','Cooling tune-ups'],
    signs:[{t:'Warm air',d:'Running but not cooling — often low refrigerant or a failed capacitor.'},{t:"Won't turn on",d:'No response at the thermostat could be electrical, a breaker, or the contactor.'},{t:'High summer bills',d:"An aging or low-charge system runs constantly. We'll measure real efficiency."}],
    gallery:['DSC07649-scaled.jpeg','DSC07667-scaled.jpeg','image-27.jpg'] },
  { id:'humidifiers', name:'Humidifiers & Air Quality', short:'Whole-home humidity & cleaner air.', accent:BLUE,
    card:'Humidifier.jpg', hero:'Humidifier.jpg',
    tagline:'Whole-home humidity and cleaner air, built right into your system.',
    intro:"Dry winter air cracks woodwork, dries out skin, and makes your home feel colder than it is. We install and service whole-home humidifiers and air-quality upgrades that work quietly in the background — no countertop units to refill.",
    includes:['Whole-home humidifier install','Humidifier repair & pad replacement','Air quality assessments','Media & HEPA filtration','Humidity control setup','Seasonal maintenance'],
    signs:[{t:'Dry, staticky air',d:'Shocks, cracked wood trim, and dry skin all winter mean your air needs moisture.'},{t:'Dust everywhere',d:'Better filtration cuts the dust that settles hours after you clean.'},{t:'Indoor allergies',d:'The right filtration and humidity make a real difference for sensitive households.'}],
    gallery:['Humidifier.jpg','DSC07688-scaled.jpeg','DSC07694-scaled.jpeg'] },
  { id:'installs', name:'System Installs', short:'New systems sized & installed right.', accent:RED,
    card:'image-26.jpg', hero:'image-26.jpg',
    tagline:'New systems, sized right and installed clean.',
    intro:"Replacing a system is a big decision, so we make it a straight one. We measure your home, walk you through honest options at a few price points, and install it clean — then we're here for it after. Free in-home estimates, always.",
    includes:['Free in-home estimates','Load calculation & correct sizing','Furnace & AC replacement','Heat pump systems','High-efficiency upgrades','Financing options available'],
    signs:[{t:'Repairs adding up',d:"When repair costs start approaching a replacement, we'll tell you straight."},{t:'System over 12 years',d:'Older systems lose efficiency. A new one can pay for part of itself.'},{t:'Uneven comfort',d:'Hot and cold rooms often mean the system was never sized right.'}],
    gallery:['image-26.jpg','image-24.jpg','image-25.jpg'] },
  { id:'maintenance', name:'Maintenance', short:'Seasonal tune-ups, fewer breakdowns.', accent:ORANGE,
    card:'DSC07694-scaled.jpeg', hero:'DSC07693-scaled.jpeg',
    tagline:'Seasonal tune-ups that head off the breakdowns.',
    intro:"The cheapest repair is the one you never need. A seasonal tune-up keeps your system efficient, protects your manufacturer warranty, and catches small problems before they leave you without heat or cool. Best booked just before summer and winter.",
    includes:['Full system inspection','Filter replacement','Coil & burner cleaning','Refrigerant & pressure check','Electrical & safety check','Priority scheduling for members'],
    signs:[{t:"It's been a while",d:"If you can't remember the last tune-up, you're overdue."},{t:'Rising bills',d:'A dirty, unmaintained system works harder and costs more every month.'},{t:'Peak season ahead',d:'Tune up before the first heat wave or cold snap — not during.'}],
    gallery:['DSC07693-scaled.jpeg','DSC07694-scaled.jpeg','DSC07711-scaled.jpeg'] }
];

// SEO-facing names for the service×city marketing pages
const COMBO_NAME = {
  heating: 'Furnace Repair & Heating',
  cooling: 'AC Repair & Cooling',
  humidifiers: 'Humidifiers & Air Quality',
  installs: 'HVAC Installation & Replacement',
  maintenance: 'HVAC Tune-Ups & Maintenance'
};

const SYMPTOMS = [
  { id:'cool',    accent:BLUE,   label:"AC isn't cooling",    sub:"Warm air or won't kick on" },
  { id:'heat',    accent:RED,    label:'No heat',             sub:"Furnace won't start" },
  { id:'noise',   accent:RED,    label:'Strange noise / smell', sub:'Banging, buzzing, burning' },
  { id:'bills',   accent:ORANGE, label:'High energy bills',   sub:'System runs constantly' },
  { id:'install', accent:ORANGE, label:'New system',          sub:'Replace or install' },
  { id:'maint',   accent:BLUE,   label:'Tune-up',             sub:'Seasonal maintenance' }
];

// Real reviews from Dan's Google Business Profile (5.0★, 95+ reviews). Verbatim (lightly trimmed)
// from the listing; names as shown on Google. Add more or tag towns as they're confirmed.
const REVIEWS = [
  { text:"My regular maintenance company quoted me almost $4,500. I called around and reread reviews, and DMAK's came out the next day, did the repair, and saved me more than $1,000.", name:'Damon Campbell', town:'' },
  { text:"We had Dan out to replace our old system. We'd gotten a few other quotes, but once Dan inspected our system we knew the search was over. Knowledgeable, friendly, honest, and he gave us a few options to fit our budget.", name:'Jonathan', town:'' },
  { text:"Our coil went out right as it got hot out. Another large company tried to give me the runaround, so I called DMAK for a second opinion. They were quick to show, gave a fair price, and replaced the coil same day.", name:'Gary Clinton', town:'' },
  { text:"Dan came soon after I called. Our furnace was old and not working and it was freezing. He installed a new furnace as fast as possible, his price was fair, and he fixed a problem with our air conditioner while he was here.", name:'Debra Greenwell', town:'' },
  { text:"Dan came to my house and set up my new unit, and he was very kind and informative about his procedures. He got the job done and kept us protected from the heat. I'll use his services again for sure.", name:'Michael Valentini', town:'' },
  { text:"Dan was fantastic to work with, down to earth, honest, and hardworking. I had a full install done, and as a first-time homeowner he made me feel included and comfortable with all of it.", name:'Phillip Wahby', town:'' },
  { text:"Dan was smart, efficient, super helpful, and super reasonable on price. He had my system up and running in a matter of minutes and was at my house the next day. We have a new HVAC guy for life.", name:'Don Myatt', town:'' },
  { text:"Dan was extremely responsive. Even though I'm a good distance from his business, he agreed to come out for a very fair travel fee, and he even offered to FaceTime first to help diagnose the problem.", name:'Mary Smith', town:'' },
  { text:"Dan provided the best and quickest service possible. Our AC went out on a hot summer day and the company we'd booked canceled on us, and Dan got us up and running again.", name:'Jervis Atagana', town:'' },
  { text:"Dan is genuinely the best HVAC guy I've worked with. He's fixed multiple things at my house with no problems since. If you want a fair price with workmanship and pride behind the work, this is your guy.", name:'Cody Alvarez', town:'' },
  { text:"DMAK'S HVAC provided excellent heating and cooling service. The furnace repair was fast, professional, and very affordable, and the technician explained everything clearly and finished on time.", name:'Aspen Abbott', town:'' },
  { text:"I highly recommend Dan for all your HVAC needs. He's respectful, informative, timely, communicates well, and has very fair pricing. Most of all, he's honest about what he recommends.", name:'Janiece Stewart', town:'' },
  { text:"Our furnace needed replacing and he was here right away. When we had a thermostat issue afterward, he came right back. Great with us, great with our dog, and great customer service.", name:'Alicia Barton', town:'' },
  { text:"Dan was prompt, professional, and knowledgeable. He quickly diagnosed and resolved my HVAC issue, and the pricing was fair and transparent. Highly recommend for anyone needing HVAC work.", name:'Zach Thompson', town:'' },
  { text:"Dan did a great job. He was quick and thorough, explained everything, and now I have a great working system. He'll be my go-to HVAC person.", name:'Kathy Lowry', town:'' },
  { text:"My furnace went out on the first extremely cold day this year. Dan was out in a matter of hours and had me up and running in a very short amount of time, and the cost was a relief.", name:'Chloe Cummings', town:'' },
  { text:"Our blower went out on one of the coldest days of the year. Dan was an absolute lifesaver, and his swift response turned a potentially disastrous situation into a manageable one.", name:'Andrew Guelker', town:'' },
  { text:"Same-day service, and quick with the diagnostics and repairs. Will do business with him again in the future.", name:'Patrick Ampleman', town:'' }
];

const AREAS = [
  { name:'Edwardsville', slug:'edwardsville', st:'IL', hq:true, blurb:"Edwardsville is our home base, so you get the fastest response in town. From the historic downtown to the newer subdivisions off Governors' Parkway, we know the homes here and the systems inside them." },
  { name:'Glen Carbon', slug:'glen-carbon', st:'IL', blurb:"Right next door to our shop, Glen Carbon gets quick same-day service. We handle everything from older ranch homes to the newer builds near Cottonwood and Orchard Farms." },
  { name:'Maryville', slug:'maryville', st:'IL', blurb:"Maryville is a short drive from Edwardsville, so we get there fast. We keep families comfortable through the humid Illinois summers and the cold snaps that follow." },
  { name:'Troy', slug:'troy', st:'IL', blurb:"We cover Troy and the surrounding Triad area with full heating and cooling service. Whether a furnace quit overnight or an AC just cannot keep up, we are a quick call away." },
  { name:'Collinsville', slug:'collinsville', st:'IL', blurb:"From the Horseshoe to the neighborhoods off Route 159, we keep Collinsville homes comfortable year round with honest repairs and clean installs." },
  { name:'Alton', slug:'alton', st:'IL', blurb:"Alton's mix of historic river-town homes and newer construction keeps us on our toes. We service aging systems and install high-efficiency replacements throughout the area." },
  { name:'Godfrey', slug:'godfrey', st:'IL', blurb:"We serve Godfrey and the greater Riverbend with the same fast, no-pressure service we are known for. Furnace, AC, or air quality, we have it covered." },
  { name:'Bethalto', slug:'bethalto', st:'IL', blurb:"Bethalto homeowners count on us for dependable heating and cooling. We stock common parts on the truck, so most repairs get done the same day." },
  { name:'Wood River', slug:'wood-river', st:'IL', blurb:"We keep Wood River comfortable through every season with repairs, tune-ups, and replacements priced fairly and done right the first time." },
  { name:'Granite City', slug:'granite-city', st:'IL', blurb:"Granite City's older housing stock often means aging equipment. We will tell you straight whether a repair makes sense or a replacement will save you money." },
  { name:'Highland', slug:'highland', st:'IL', blurb:"A little further out but well within range, Highland gets the same reliable service. We plan our routes so you are not waiting days for a visit." },
  { name:'St. Louis', slug:'st-louis-mo', st:'MO', blurb:"We cross the river to serve St. Louis and the near suburbs. A St. Louis summer is no joke, so we treat a dead AC like the emergency it is." }
];

// Per-city copy for the service×city pages (generated once, see content/combos.json)
let COMBOS = null;
try { COMBOS = JSON.parse(dash(fs.readFileSync(path.join(ROOT, 'content', 'combos.json'), 'utf8'))); }
catch (e) { console.warn('content/combos.json missing — skipping service×city pages'); }
const comboFor = (svcId, slug) => {
  if (!COMBOS) return null;
  const c = COMBOS.find(x => x.slug === slug);
  const s = c && c.services.find(x => x.id === svcId);
  return s || null;
};

// ---------- shared chrome ----------
const header = active => {
  const a = k => active === k ? ' class="active"' : '';
  const links = `
      <a href="/services/"${a('services')}>Services</a>
      <a href="/service-area/"${a('area')}>Service Area</a>
      <a href="/schedule/"${a('schedule')}>Schedule</a>
      <a href="/reviews/"${a('reviews')}>Reviews</a>
      <a href="/about/"${a('about')}>About</a>`;
  return `<header class="site-header"><div class="wrap header-inner">
    <a class="brand" href="/"><img src="/images/favicon.png" alt=""><div><b>DMAK'S HVAC</b><span>HEATING &amp; COOLING</span></div></a>
    <nav class="nav">${links}</nav>
    <a class="btn btn-red btn-sm nav-quote" href="/contact/">Get a Free Quote</a>
    <a class="btn btn-red btn-sm nav-call" href="${TEL}"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right:2px"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.2 2.2z"/></svg>Call</a>
  </div>
  <div class="wrap nav-chips">${links}<a href="/contact/"${a('contact')}>Contact</a></div></header>`;
};
const ctaBand = () => `<section class="band-dark"><div class="wrap cta">
    <div><h2>Ready when you are.</h2><p>Same-day repairs and free quotes across the Metro East &amp; St. Louis.</p><p class="cta-hours">${HOURS} · <b>Same-day repairs on most calls</b></p></div>
    <div class="actions"><a class="btn btn-red" href="${TEL}">Call ${PHONE}</a><a class="btn btn-outline" href="/schedule/">Book online</a><a class="btn btn-outline" href="/contact/">Get a free quote</a></div>
  </div></section>`;
const footer = () => `<footer class="footer"><div class="wrap grid">
    <div><div class="bname">DMAK'S HVAC LLC</div><div class="btag">HEATING &amp; COOLING</div><p class="blurb">Family-owned heating &amp; cooling, serving the Metro East &amp; St. Louis.</p></div>
    <div><div class="h4">SERVICES</div>${SERVICES.map(s=>`<a href="/services/${s.id}/">${amp(s.name)}</a>`).join('')}</div>
    <div><div class="h4">COMPANY</div><a href="/about/">About</a><a href="/service-area/">Service Area</a><a href="/schedule/">Schedule Service</a><a href="/reviews/">Reviews</a><a href="/contact/">Contact</a><a href="/privacy/">Privacy</a></div>
    <div><div class="h4">CONTACT</div><div class="cd"><a href="${TEL}">${PHONE}</a><br><a href="mailto:dan@dmakshvac.com">dan@dmakshvac.com</a><br>812 Sherman Ave,<br>Edwardsville, IL 62025<br>${HOURS}</div></div>
  </div></footer>`;
const reviewCard = (r, town) => `<div class="review"><div class="stars">★★★★★</div><p>"${amp(r.text)}"</p><div class="nm">${r.name}</div>${town && r.town?`<div class="tw">${r.town}</div>`:''}</div>`;
// Clickable rating badge -> Dan's real Google listing
const revScore = () => `<a class="rev-score" href="${GBP}" target="_blank" rel="noopener"><b>${RATING}${STAR}</b> Google · ${REVIEW_COUNT} reviews</a>`;

// ---------- schema (JSON-LD) ----------
const SITE = 'https://www.dmakshvac.com';
const localBusinessSchema = () => ({
  "@context":"https://schema.org","@type":"HVACBusiness","@id":SITE+"/#business",
  "name":"DMAK'S HVAC LLC","telephone":"+13144209851","email":"dan@dmakshvac.com",
  "url":SITE+"/","image":SITE+"/images/logo.png","priceRange":"$$","sameAs":[GBP],
  "address":{"@type":"PostalAddress","streetAddress":"812 Sherman Ave","addressLocality":"Edwardsville","addressRegion":"IL","postalCode":"62025","addressCountry":"US"},
  "geo":{"@type":"GeoCoordinates","latitude":38.8114,"longitude":-89.9532},
  "openingHoursSpecification":[
    {"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],"opens":"08:00","closes":"20:00"}
  ],
  "areaServed":AREAS.map(a=>({"@type":"City","name":a.name+", "+a.st})),
  "makesOffer":SERVICES.map(s=>({"@type":"Offer","itemOffered":{"@type":"Service","name":s.name.replace(/&/g,'and')}}))
});
const serviceSchema = (svc, city) => ({
  "@context":"https://schema.org","@type":"Service","serviceType":svc.name.replace(/&/g,'and'),
  "name":(city ? COMBO_NAME[svc.id].replace(/&/g,'and')+' in '+city.name+', '+city.st : svc.name.replace(/&/g,'and')),
  "description":dash(svc.tagline),
  "provider":{"@type":"HVACBusiness","name":"DMAK'S HVAC LLC","telephone":"+13144209851","url":SITE+"/"},
  "areaServed":(city ? [city.name+", "+city.st] : AREAS.map(a=>a.name+", "+a.st)),
  "url":SITE+"/services/"+svc.id+"/"+(city ? city.slug+"/" : "")
});
const faqSchema = faqs => ({
  "@context":"https://schema.org","@type":"FAQPage",
  "mainEntity":faqs.map(f=>({"@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}}))
});
const breadcrumbSchema = items => ({
  "@context":"https://schema.org","@type":"BreadcrumbList",
  "itemListElement":items.map((it,i)=>({"@type":"ListItem","position":i+1,"name":it[0],"item":SITE+it[1]}))
});

const svcCard = (s, citySlug) => `<a class="svc-card" href="/services/${s.id}/${citySlug ? citySlug + '/' : ''}" style="border-bottom-color:${s.accent}">
      <div class="img"><img src="${img(s.card)}" alt="${amp(s.name)} — DMAK'S HVAC" loading="lazy"></div>
      <div class="body"><div class="nm">${amp(s.name)}</div><div class="sh">${amp(s.short)}</div></div>
    </a>`;

const quoteFormCard = () => `<form class="form-card" name="quote" method="POST" data-netlify="true" netlify-honeypot="bot-field" action="/thanks/">
      <input type="hidden" name="form-name" value="quote">
      <p style="display:none"><label>Skip if human: <input name="bot-field"></label></p>
      <div class="k">Free quote in 60 seconds</div>
      <input name="name" placeholder="Your name" aria-label="Your name" autocomplete="name" required>
      <input name="phone" type="tel" placeholder="Phone number" aria-label="Phone number" autocomplete="tel" required>
      <input name="email" type="email" placeholder="Email (optional)" aria-label="Email (optional)" autocomplete="email">
      <select name="town" aria-label="Your town">
        <option value="" disabled selected>Your town</option>${AREAS.map(a=>`<option>${a.name}, ${a.st}</option>`).join('')}<option>Other / nearby</option>
      </select>
      <select name="problem" aria-label="What's the problem?" required>
        <option value="" disabled selected>What's the problem?</option><option>AC isn't cooling</option><option>No heat</option><option>Strange noise or smell</option><option>High energy bills</option><option>New system / replacement</option><option>Tune-up &amp; maintenance</option>
      </select>
      <textarea name="message" rows="3" placeholder="Anything else we should know?" aria-label="Anything else we should know?"></textarea>
      <button class="btn btn-dark btn-block" type="submit">Send my request →</button>
      <div class="form-fine">No obligation · usually answered within the hour · <a href="/schedule/" style="font-weight:800;color:inherit;text-decoration:underline">book a visit online</a> · <a href="/privacy/" style="color:inherit">privacy</a></div>
    </form>`;
// Stable string hash so each page deterministically rotates through the review pool.
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
// Prefer reviews tagged to this town (if any get tagged later); otherwise rotate by seed so
// different service-area / combo pages don't all show the same 3 reviews.
const cityReviews = (c, seed) => {
  const matched = REVIEWS.filter(r => r.town && r.town.indexOf(c.name) === 0);
  if (matched.length >= 3) return matched.slice(0, 3);
  const start = hashStr(seed || c.slug) % REVIEWS.length;
  const rotated = REVIEWS.slice(start).concat(REVIEWS.slice(0, start)).filter(r => !matched.includes(r));
  return matched.concat(rotated).slice(0, 3);
};
// Honest heading: only claim reviews are from the town when at least one actually is
const revHeading = c => REVIEWS.some(r=>r.town.indexOf(c.name)===0) ? `What ${c.name} neighbors say` : 'What Metro East neighbors say';

const page = ({title, desc, active, body, cta = true, schema, noindex = false}) => {
  desc = dash(desc); body = dash(body);
  const ld = (schema || [localBusinessSchema()]).map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n');
  return (`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="icon" href="/images/favicon.png">
<link rel="apple-touch-icon" href="/images/favicon.png">
<link rel="canonical" href="__CANONICAL__">
<meta name="theme-color" content="#141416">${noindex ? '\n<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="DMAK'S HVAC LLC">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="__CANONICAL__">
<meta property="og:image" content="${SITE}/images/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700;800&family=Archivo:wght@800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
${ld}
</head><body>
<a class="skip-link" href="#main">Skip to content</a>
${header(active)}
<main id="main">
${body}
${cta ? ctaBand() : ''}
</main>
${footer()}
<script src="/app.js"></script>
</body></html>`);
};

// ---------- page bodies ----------
const solver = () => `<div class="solver">
        <div class="sv-eye">PROBLEM SOLVER</div>
        <div class="sv-title">What's wrong? Tap it.</div>
        <div class="sv-grid">${SYMPTOMS.map(s=>`
          <button class="sym${s.id==='cool'?' active':''}" data-sym="${s.id}" aria-pressed="${s.id==='cool'?'true':'false'}">
            <span class="top"><span class="dot" style="background:${s.accent}"></span><span class="lb">${amp(s.label)}</span></span>
            <span class="sub">${s.sub}</span>
          </button>`).join('')}
        </div>
        <div class="sv-result" aria-live="polite">
          <span class="sv-tag" style="background:${BLUE}">Same-day priority</span>
          <p class="sv-diag">Most likely low refrigerant, a worn capacitor, or blocked airflow. We stock common parts on the truck and fix the majority of cooling calls the same day.</p>
          <div class="sv-actions"><a class="btn btn-red" href="${TEL}">Call now</a><a class="btn btn-outline sv-learn" href="/services/cooling/">See AC repair →</a></div>
          <div class="sv-links"><a class="sv-quote" href="#quote">Get a free quote →</a><a class="sv-quote" href="/schedule/">Book a visit →</a></div>
        </div>
      </div>`;

const home = () => page({ active:'', cta:true,
  title:"DMAK'S HVAC — Heating & Cooling in Edwardsville, IL | Same-Day Repairs",
  desc:"Family-owned, fully licensed HVAC in Edwardsville IL & the Metro East. Same-day heating & cooling repairs, honest pricing, 5.0★ on Google. Call (314) 420-9851.",
  body:`
<section class="band band-dark pos hero" style="padding:60px 0 64px">
  <span class="blob blob-red"></span><span class="blob blob-blue"></span>
  <div class="wrap">
    <div class="grid">
      <div>
        <span class="pill">SAME-DAY SERVICE · METRO EAST + ST. LOUIS</span>
        <h1>No heat?<br>No cool?<br><span class="accent-red">No problem.</span></h1>
        <p class="lead">Family-owned, fully licensed, and on the way. Same-day repairs and honest pricing across Edwardsville and beyond.</p>
        <div class="actions"><a class="btn btn-red" href="${TEL}">Call ${PHONE}</a><a class="btn btn-outline" href="#quote">Get a free quote</a></div>
        <a class="hero-book" href="/schedule/">or book a visit online →</a>
      </div>
      ${solver()}
    </div>
    <div class="trust">
      <a class="trust-link" href="${GBP}" target="_blank" rel="noopener"><b style="color:${BLUE_L()}">${RATING}${STAR}</b> on Google</a>
      <span><b style="color:${RED}">${REVIEW_COUNT}</b> Google reviews</span>
      <span><b style="color:${ORANGE}">5+</b> years local</span>
      <span><b style="color:#fff">Licensed</b> &amp; insured</span>
    </div>
  </div>
</section>
<section class="band band-cream"><div class="wrap">
  <div class="sec-head"><h2 class="title">Our services</h2><a class="link-red" href="/services/">See all services →</a></div>
  <div class="svc-cards">${SERVICES.map(s=>`
    <a class="svc-card" href="/services/${s.id}/" style="border-bottom-color:${s.accent}">
      <div class="img"><img src="${img(s.card)}" alt="${amp(s.name)} — DMAK'S HVAC" loading="lazy"></div>
      <div class="body"><div class="nm">${amp(s.name)}</div><div class="sh">${amp(s.short)}</div></div>
    </a>`).join('')}</div>
</div></section>
<section class="split">
  <div class="owner-media">
    <img class="bg" src="/images/image_50727169-scaled.jpg" alt="Daniel Makarov, owner of DMAK'S HVAC">
    <div class="grad"></div>
    <img class="dorothy" src="/images/image_123650291.jpg" alt="Dorothy, the DMAK'S HVAC team mascot">
    <div class="owner-card"><div class="k">THE OWNER</div><div class="nm">Daniel Makarov</div><p>"You get me on the phone and on the job. Dorothy handles morale."</p></div>
  </div>
  <div class="why">
    <h2>Why choose us</h2>
    <div class="checks">${['Licensed & certified','Locally owned','Competitive pricing','Quality assurance','Skilled team','Reliable & on time'].map(c=>`<div class="c"><b>✓</b>${amp(c)}</div>`).join('')}</div>
    <a class="btn btn-red" href="/about/">Meet the team →</a>
  </div>
</section>
<section class="band band-cream"><div class="wrap">
  <div class="sec-head"><h2 class="title">Real reviews</h2>${revScore()}</div>
  <div class="rev-grid">${REVIEWS.slice(0,3).map(r=>reviewCard(r,false)).join('')}</div>
  <a class="link-red" href="/reviews/" style="display:inline-block;margin-top:22px">Read more reviews →</a>
</div></section>
<section class="band-red" id="quote" style="padding:60px 0"><div class="wrap">
  <div class="contact-grid">
    <div class="contact-info">
      <span class="eyebrow">FREE QUOTE</span>
      <h2 style="font:900 46px/1 'Archivo';text-transform:uppercase;margin:12px 0 0">Tell us what's<br>going on.</h2>
      <p class="lead">Fill this out and a real person calls you back, usually within the hour. Prefer to pick a day and time yourself? <a href="/schedule/" style="color:#fff;font-weight:800;text-decoration:underline">Book a visit online</a>.</p>
      <a class="phone" href="${TEL}">${PHONE}</a>
      <div class="cd">${HOURS_FULL}<br><b>Same-day repairs on most calls</b></div>
    </div>
    ${quoteFormCard()}
  </div>
</div></section>` });

function BLUE_L(){ return '#6FB1DE'; }

const servicesOverview = () => page({ active:'services', cta:true,
  title:"HVAC Services in Edwardsville & the Metro East | DMAK'S HVAC",
  desc:"Heating, cooling, humidifiers, system installs, and maintenance from a family-owned Metro East HVAC team. Honest pricing, same-day repairs. (314) 420-9851.",
  schema:[localBusinessSchema(), breadcrumbSchema([['Home','/'],['Services','/services/']])],
  body:`
<section class="band band-dark pos" style="padding:60px 0"><span class="blob blob-red" style="right:-80px;top:-70px;width:360px;height:360px"></span>
  <div class="wrap"><span class="eyebrow">WHAT WE DO</span>
    <h1 class="page-h1">Everything to keep<br>you comfortable</h1>
    <p class="lead" style="max-width:560px">Repairs, installs, and maintenance for heating, cooling, and air quality — one local team, honest pricing, and a real person who answers the phone.</p>
  </div>
</section>
<section class="band band-cream"><div class="wrap">
  <div class="svc-rows">${SERVICES.map(s=>`
    <a class="svc-row" href="/services/${s.id}/" style="border-left-color:${s.accent}">
      <div class="img"><img src="${img(s.card)}" alt="${amp(s.name)} — DMAK'S HVAC" loading="lazy"></div>
      <div class="body"><div class="nm">${amp(s.name)}</div><p>${amp(s.tagline)}</p><span class="vd" style="color:${s.accent}">View details →</span></div>
    </a>`).join('')}</div>
</div></section>` });

const serviceDetail = svc => page({ active:'services', cta:true,
  title:`${svc.name.replace(/&/g,'and')} in Edwardsville & Metro East | DMAK'S HVAC`,
  desc:amp(svc.tagline),
  schema:[localBusinessSchema(), serviceSchema(svc), breadcrumbSchema([['Home','/'],['Services','/services/'],[svc.name.replace(/&/g,'and'),'/services/'+svc.id+'/']])],
  body:`
<section class="band band-dark pos sd-hero" style="padding:56px 0 60px"><div class="wrap">
  <div class="grid">
    <div>
      <div class="crumb"><a href="/services/">Services</a> &nbsp;/&nbsp; ${amp(svc.name)}</div>
      <h1>${amp(svc.name)}</h1>
      <p class="tl">${amp(svc.tagline)}</p>
      <div class="actions" style="display:flex;gap:14px;margin-top:28px;flex-wrap:wrap"><a class="btn btn-red" href="${TEL}">Call ${PHONE}</a><a class="btn btn-outline" href="/schedule/">Book online</a><a class="btn btn-outline" href="/contact/">Get a free quote</a></div>
    </div>
    <div class="sd-heroimg"><img src="${img(svc.hero)}" alt="${amp(svc.name)} — DMAK'S HVAC"></div>
  </div>
</div></section>
<section class="band band-cream"><div class="wrap sd-2col">
  <div><h2>What we do</h2><p class="intro">${amp(svc.intro)}</p></div>
  <div class="incl"><div class="k" style="color:${svc.accent}">WHAT'S INCLUDED</div>
    <div class="list">${svc.includes.map(i=>`<div class="c"><b style="color:${svc.accent}">✓</b>${amp(i)}</div>`).join('')}</div>
  </div>
</div></section>
<section class="band-cream" style="padding:0 0 56px"><div class="wrap">
  <h2 class="title" style="font-size:28px;margin-bottom:20px">Signs it's time to call</h2>
  <div class="signs">${svc.signs.map(g=>`<div class="sign"><div class="bar" style="background:${svc.accent}"></div><div class="t">${amp(g.t)}</div><p>${amp(g.d)}</p></div>`).join('')}</div>
</div></section>
<section class="band-cream" style="padding:0 0 60px"><div class="wrap">
  <div class="gallery">${svc.gallery.map(g=>`<div class="g"><img src="${img(g)}" alt="${amp(svc.name)} job — DMAK'S HVAC" loading="lazy"></div>`).join('')}</div>
</div></section>
<section class="band-ink2" style="padding:40px 0"><div class="wrap">
  ${COMBOS ? `<div class="eyebrow" style="margin-bottom:14px">${amp(svc.name).toUpperCase()} BY TOWN</div>
  <div class="chips">${AREAS.map(c=>`<a class="chip" href="/services/${svc.id}/${c.slug}/">${c.name}${c.st==='MO'?', MO':''}</a>`).join('')}</div>
  <div class="eyebrow" style="margin:26px 0 14px">EXPLORE MORE SERVICES</div>` : `<div class="eyebrow" style="margin-bottom:14px">EXPLORE MORE SERVICES</div>`}
  <div class="chips">${SERVICES.filter(s=>s.id!==svc.id).map(o=>`<a class="chip" href="/services/${o.id}/">${amp(o.name)}</a>`).join('')}</div>
</div></section>` });

const about = () => page({ active:'about', cta:true,
  title:"About DMAK'S HVAC — Family-Owned HVAC in Edwardsville, IL",
  desc:"Meet Daniel Makarov (and Dorothy). DMAK'S HVAC is a family-owned, fully licensed heating & cooling company serving the Metro East. When you call, you get Dan.",
  schema:[localBusinessSchema(), breadcrumbSchema([['Home','/'],['About','/about/']])],
  body:`
<section class="about-hero">
  <div class="story">
    <span class="eyebrow">OUR STORY</span>
    <h1>A local crew<br>you can<br><span class="accent-red">actually reach</span></h1>
    <p>DMAK'S HVAC is family-owned and run by Daniel Makarov. When you call, you get Dan — not a call center. He does the estimate, the work, and the follow-up, and he treats every home like it's his own.</p>
    <p>We built this business on honest recommendations and fair pricing. We'll tell you when something can wait, and we'll never push a new system you don't need.</p>
  </div>
  <div class="photo"><img src="/images/DSC07682-scaled.jpeg" alt="Daniel Makarov greeting a customer at their door"></div>
</section>
<section class="band band-cream"><div class="wrap">
  <div class="about-2col">
    <div class="about-portrait"><img class="p" src="/images/image_50727169-scaled.jpg" alt="Daniel Makarov, owner of DMAK'S HVAC"><img class="d" src="/images/image_123650291.jpg" alt="Dorothy, the shop dog"></div>
    <div>
      <h2>Dan &amp; Dorothy</h2>
      <p>Daniel is fully licensed and certified with years in the field across the Metro East. Dorothy, the shop dog, runs quality control and morale. Together they've earned a 5.0${STAR} Google rating across ${REVIEW_COUNT} reviews.</p>
      <div class="checks">${['Licensed & certified','Family-owned & local','Honest, no-pressure quotes','Fully insured'].map(c=>`<div class="c"><b>✓</b>${amp(c)}</div>`).join('')}</div>
    </div>
  </div>
  <div class="stats">
    <div><b style="color:${RED}">${REVIEW_COUNT}</b><span>Google reviews</span></div>
    <div><b style="color:${BLUE}">${RATING}${STAR}</b><span>Google rating</span></div>
    <div><b style="color:${ORANGE}">5+</b><span>years local</span></div>
    <div><b style="color:#1b1a18">1</b><span>very good dog</span></div>
  </div>
</div></section>` });

const area = () => page({ active:'area', cta:true,
  title:"Service Area — HVAC in the Metro East & St. Louis | DMAK'S HVAC",
  desc:"Based in Edwardsville, IL, DMAK'S HVAC serves Glen Carbon, Maryville, Troy, Collinsville, Alton, Godfrey, Granite City, Highland, St. Louis MO and surrounding areas.",
  schema:[localBusinessSchema(), breadcrumbSchema([['Home','/'],['Service Area','/service-area/']])],
  body:`
<section class="band band-dark" style="padding:60px 0"><div class="wrap">
  <span class="eyebrow">WHERE WE WORK</span>
  <h1 class="page-h1">Serving the Metro<br>East &amp; St. Louis</h1>
  <p class="lead" style="max-width:520px">Based in Edwardsville, we cover the surrounding communities in Illinois and cross the river into St. Louis. Not sure if you're in range? Give us a call — we probably are.</p>
</div></section>
<section class="band band-cream"><div class="wrap">
  <div class="area-2col">
    <div>
      <h2>Towns we serve</h2>
      <div class="towns">${AREAS.map(a=>`<a class="town" href="/service-area/${a.slug}/">${a.hq?'<span class="hq"></span>':''}${a.name}${a.st==='MO'?', MO':''}</a>`).join('')}</div>
      <p class="area-note">…and surrounding communities. <span style="color:${RED};font-weight:800">●</span> Home base: Edwardsville, IL.</p>
    </div>
    <div class="map"><iframe loading="lazy" title="DMAK'S HVAC service area map" src="https://www.google.com/maps?q=Edwardsville,+IL&z=10&output=embed"></iframe></div>
  </div>
</div></section>` });

const reviews = () => page({ active:'reviews', cta:true,
  title:"Reviews — 5.0★ HVAC in Edwardsville, IL | DMAK'S HVAC",
  desc:"See why neighbors across the Metro East rate DMAK'S HVAC 5.0★ with 95+ Google reviews. Honest, on-time heating & cooling from a family-owned team.",
  schema:[localBusinessSchema(), breadcrumbSchema([['Home','/'],['Reviews','/reviews/']])],
  body:`
<section class="band band-dark" style="padding:60px 0;text-align:center"><div class="wrap">
  <span class="eyebrow">GOOGLE REVIEWS</span>
  <h1 class="page-h1">Neighbors love<br>working with us</h1>
  <div style="display:inline-flex;align-items:center;gap:12px;margin-top:20px;font:700 16px 'Mulish';color:#c9c9cd"><span style="color:${ORANGE};font:900 28px 'Archivo'">${RATING}${STAR}</span> · ${REVIEW_COUNT} reviews on Google</div>
  <div style="margin-top:22px"><a class="btn btn-red" href="${GBP}" target="_blank" rel="noopener">Read our reviews on Google →</a></div>
</div></section>
<section class="band band-cream"><div class="wrap">
  <div class="rev-grid">${REVIEWS.map(r=>reviewCard(r,true)).join('')}</div>
  <p style="text-align:center;margin-top:26px;font:600 14px 'Mulish';color:#6f6a62">These are a few of our Google reviews. <a href="${GBP}" target="_blank" rel="noopener" style="color:${RED};font-weight:800">See all ${REVIEW_COUNT} on Google →</a></p>
</div></section>` });

const contact = () => page({ active:'contact', cta:false,
  title:"Contact DMAK'S HVAC — Free Quote | (314) 420-9851",
  desc:"Call (314) 420-9851 or request a free quote from DMAK'S HVAC. A real person gets back to you — usually within the hour. Serving Edwardsville & the Metro East.",
  schema:[localBusinessSchema(), breadcrumbSchema([['Home','/'],['Contact','/contact/']])],
  body:`
<section class="band-red" style="padding:60px 0"><div class="wrap">
  <div class="contact-grid">
    <div class="contact-info">
      <span class="eyebrow">GET IN TOUCH</span>
      <h1>Let's get<br>you comfortable.</h1>
      <p class="lead">Call now or send a request and a real person will get back to you — usually within the hour.</p>
      <a class="phone" href="${TEL}">${PHONE}</a>
      <div class="cd">dan@dmakshvac.com<br>812 Sherman Ave, Edwardsville, IL 62025</div>
      <div class="hours"><div class="k">HOURS</div>${HOURS_FULL}<br><b>Same-day repairs on most calls</b></div>
    </div>
    ${quoteFormCard()}
  </div>
</div></section>` });

const cityPage = c => page({ active:'area', cta:true,
  title:`HVAC in ${c.name}, ${c.st} — Heating & Cooling | DMAK'S HVAC`,
  desc:`Fast, honest HVAC in ${c.name}, ${c.st}. Furnace & AC repair, installs, humidifiers, and tune-ups from family-owned DMAK'S HVAC. Call (314) 420-9851.`,
  schema:[localBusinessSchema(), breadcrumbSchema([['Home','/'],['Service Area','/service-area/'],[c.name+', '+c.st,'/service-area/'+c.slug+'/']])],
  body:`
<section class="band band-dark pos sd-hero" style="padding:56px 0 60px"><div class="wrap">
  <div class="grid">
    <div>
      <div class="crumb"><a href="/service-area/">Service Area</a> &nbsp;/&nbsp; ${c.name}, ${c.st}</div>
      <h1>Heating &amp; cooling in ${c.name}</h1>
      <p class="tl">${amp(c.blurb)}</p>
      <div class="actions" style="display:flex;gap:14px;margin-top:28px;flex-wrap:wrap"><a class="btn btn-red" href="${TEL}">Call ${PHONE}</a><a class="btn btn-outline" href="/contact/">Get a free quote</a></div>
    </div>
    <div class="sd-heroimg"><img src="${img('DSC07649-scaled.jpeg')}" alt="DMAK'S HVAC serving ${c.name}, ${c.st}"></div>
  </div>
</div></section>
<section class="band band-cream"><div class="wrap">
  <div class="sec-head"><h2 class="title">Services in ${c.name}</h2><a class="link-red" href="/services/">All services →</a></div>
  <div class="svc-cards">${SERVICES.map(s=>svcCard(s, COMBOS ? c.slug : null)).join('')}</div>
</div></section>
<section class="band-cream" style="padding:0 0 20px"><div class="wrap">
  <div class="sec-head"><h2 class="title" style="font-size:26px">${revHeading(c)}</h2>${revScore()}</div>
  <div class="rev-grid">${cityReviews(c, c.slug).map(r=>reviewCard(r,true)).join('')}</div>
</div></section>
<section class="band-cream" style="padding:0 0 56px"><div class="wrap"><div class="map"><iframe loading="lazy" title="${c.name} service area map" src="https://www.google.com/maps?q=${encodeURIComponent(c.name+', '+c.st)}&z=12&output=embed"></iframe></div></div></section>` });

const comboPage = (svc, c, copy) => page({ active:'services', cta:true,
  title:`${COMBO_NAME[svc.id].replace(/&/g,'and')} in ${c.name}, ${c.st} | DMAK'S HVAC`,
  desc:`${COMBO_NAME[svc.id].replace(/&/g,'and')} in ${c.name}, ${c.st} from family-owned DMAK'S HVAC. Same-day service, honest pricing, free quotes. Call (314) 420-9851.`,
  schema:[localBusinessSchema(), serviceSchema(svc, c), faqSchema(copy.faqs),
    breadcrumbSchema([['Home','/'],['Services','/services/'],[svc.name.replace(/&/g,'and'),'/services/'+svc.id+'/'],[c.name+', '+c.st,'/services/'+svc.id+'/'+c.slug+'/']])],
  body:`
<section class="band band-dark pos sd-hero" style="padding:56px 0 60px"><div class="wrap">
  <div class="grid">
    <div>
      <div class="crumb"><a href="/services/">Services</a> &nbsp;/&nbsp; <a href="/services/${svc.id}/">${amp(svc.name)}</a> &nbsp;/&nbsp; ${c.name}, ${c.st}</div>
      <h1>${amp(COMBO_NAME[svc.id])} in ${c.name}</h1>
      <p class="tl">${amp(svc.tagline)}</p>
      <div class="actions" style="display:flex;gap:14px;margin-top:28px;flex-wrap:wrap"><a class="btn btn-red" href="${TEL}">Call ${PHONE}</a><a class="btn btn-outline" href="/schedule/">Book online</a><a class="btn btn-outline" href="/contact/">Get a free quote</a></div>
    </div>
    <div class="sd-heroimg"><img src="${img(svc.hero)}" alt="${amp(svc.name)} in ${c.name}, ${c.st} — DMAK'S HVAC"></div>
  </div>
</div></section>
<section class="band band-cream"><div class="wrap sd-2col">
  <div><h2>${amp(svc.name)} help in ${c.name}</h2><p class="intro">${amp(copy.intro)}</p>
    <div class="local-note"><div class="k" style="color:${svc.accent}">WHAT WE SEE IN ${c.name.toUpperCase()}</div><p>${amp(copy.localNote)}</p></div>
  </div>
  <div class="incl"><div class="k" style="color:${svc.accent}">WHAT'S INCLUDED</div>
    <div class="list">${svc.includes.map(i=>`<div class="c"><b style="color:${svc.accent}">✓</b>${amp(i)}</div>`).join('')}</div>
  </div>
</div></section>
<section class="band-cream" style="padding:0 0 40px"><div class="wrap">
  <h2 class="title" style="font-size:28px;margin-bottom:20px">Questions from ${c.name}</h2>
  <div class="faqs">${copy.faqs.map(f=>`<div class="faq"><div class="q">${amp(f.q)}</div><p>${amp(f.a)}</p></div>`).join('')}</div>
</div></section>
<section class="band-cream" style="padding:0 0 56px"><div class="wrap">
  <div class="sec-head"><h2 class="title" style="font-size:26px">${revHeading(c)}</h2>${revScore()}</div>
  <div class="rev-grid">${cityReviews(c, svc.id + '-' + c.slug).map(r=>reviewCard(r,true)).join('')}</div>
</div></section>
<section class="band-ink2" style="padding:40px 0"><div class="wrap">
  <div class="eyebrow" style="margin-bottom:14px">${amp(svc.name).toUpperCase()} IN OTHER TOWNS</div>
  <div class="chips">${AREAS.filter(o=>o.slug!==c.slug).map(o=>`<a class="chip" href="/services/${svc.id}/${o.slug}/">${o.name}${o.st==='MO'?', MO':''}</a>`).join('')}</div>
  <div class="eyebrow" style="margin:26px 0 14px">MORE IN ${c.name.toUpperCase()}</div>
  <div class="chips">${SERVICES.filter(s=>s.id!==svc.id).map(o=>`<a class="chip" href="/services/${o.id}/${c.slug}/">${amp(o.name)}</a>`).join('')}<a class="chip" href="/service-area/${c.slug}/">${c.name} service area</a></div>
</div></section>` });

const schedulePage = () => page({ active:'schedule', cta:false,
  title:"Schedule HVAC Service Online | DMAK'S HVAC — Book a Visit",
  desc:"Book your heating or cooling visit online. Pick a day and time window that works and Dan confirms by call or text, usually within the hour. (314) 420-9851.",
  schema:[localBusinessSchema(), breadcrumbSchema([['Home','/'],['Schedule','/schedule/']])],
  body:`
<section class="band-red" style="padding:60px 0"><div class="wrap">
  <div class="contact-grid" style="align-items:start">
    <div class="contact-info">
      <span class="eyebrow">BOOK ONLINE</span>
      <h1>Pick a time.<br>We'll be there.</h1>
      <p class="lead">Choose a day and time window that works for you. A real person confirms your appointment by call or text, usually within the hour.</p>
      <a class="phone" href="${TEL}">${PHONE}</a>
      <div class="cd">${HOURS_FULL}</div>
      <div class="hours"><div class="k">CAN'T WAIT?</div>No heat, no cool, or something smells like burning? Skip the form and call, and we'll get to you as fast as we can.<br><b>Same-day service on most calls.</b></div>
    </div>
    <form class="form-card" name="schedule" method="POST" data-netlify="true" netlify-honeypot="bot-field" action="/thanks/">
      <input type="hidden" name="form-name" value="schedule">
      <p style="display:none"><label>Skip if human: <input name="bot-field"></label></p>
      <div class="k">Schedule a visit</div>
      <input name="name" placeholder="Your name" aria-label="Your name" autocomplete="name" required>
      <div class="form-row">
        <input name="phone" type="tel" placeholder="Phone number" aria-label="Phone number" autocomplete="tel" required>
        <input name="email" type="email" placeholder="Email (optional)" aria-label="Email (optional)" autocomplete="email">
      </div>
      <input name="address" placeholder="Street address" aria-label="Street address" autocomplete="street-address" required>
      <select name="town" aria-label="Your town" required>
        <option value="" disabled selected>Your town</option>${AREAS.map(a=>`<option>${a.name}, ${a.st}</option>`).join('')}<option>Other / nearby</option>
      </select>
      <select name="service" aria-label="What do you need?" required>
        <option value="" disabled selected>What do you need?</option>${SERVICES.map(s=>`<option>${amp(s.name)}</option>`).join('')}<option>Not sure, something's wrong</option>
      </select>
      <span class="field-label">How soon?</span>
      <div class="radio-row">
        <label class="radio-pill"><input type="radio" name="urgency" value="Today (urgent)" required>Today, it's urgent</label>
        <label class="radio-pill"><input type="radio" name="urgency" value="This week">This week</label>
        <label class="radio-pill"><input type="radio" name="urgency" value="Flexible">I'm flexible</label>
      </div>
      <div class="form-row">
        <div><span class="field-label">Preferred day</span><input name="date" type="date" data-min-today aria-label="Preferred day" required></div>
        <div><span class="field-label">Time window</span><select name="window" aria-label="Preferred time window" required>
          <option value="" disabled selected>Pick a window</option><option>Morning (8a – 12p)</option><option>Afternoon (12p – 4p)</option><option>Evening (4p – 8p)</option>
        </select></div>
      </div>
      <textarea name="notes" rows="3" placeholder="What's going on? Anything we should know?" aria-label="What's going on? Anything we should know?"></textarea>
      <button class="btn btn-dark btn-block" type="submit">Request this time →</button>
      <div class="form-fine">This sends a request, not a hold. Dan confirms by call or text. No obligation.</div>
    </form>
  </div>
</div></section>` });

const thanksPage = () => page({ active:'', cta:false, noindex:true,
  title:"Thanks, we got your request | DMAK'S HVAC",
  desc:"Thanks for reaching out to DMAK'S HVAC. A real person will get back to you soon, usually within the hour.",
  body:`
<section class="band band-dark" style="padding:90px 0;text-align:center"><div class="wrap">
  <span class="eyebrow">Request received</span>
  <h1 class="page-h1">Thanks, we've got it.</h1>
  <p class="lead" style="margin:16px auto 26px;max-width:480px">A real person will get back to you soon, usually within the hour. If it's urgent, call us and we'll pick up.</p>
  <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap"><a class="btn btn-red" href="${TEL}">Call ${PHONE}</a><a class="btn btn-outline" href="/">Back home</a></div>
</div></section>` });

const privacyPage = () => page({ active:'', cta:false,
  title:"Privacy Policy | DMAK'S HVAC",
  desc:"What DMAK'S HVAC collects through this website (the information you type into our quote and scheduling forms) and how we use it: to respond to your request.",
  schema:[localBusinessSchema(), breadcrumbSchema([['Home','/'],['Privacy','/privacy/']])],
  body:`
<section class="band band-dark" style="padding:52px 0"><div class="wrap">
  <span class="eyebrow">THE FINE PRINT</span>
  <h1 class="page-h1">Privacy policy</h1>
  <p class="lead" style="max-width:560px;margin-top:14px">The short version: we only use what you send us to get back to you about your heating and cooling. We don't sell it, and we don't spam you.</p>
</div></section>
<section class="band band-cream"><div class="wrap prose">
  <h2>What we collect</h2>
  <p>When you fill out our quote or scheduling forms, we receive what you type: your name, phone number, email, address, and whatever you tell us about the problem. If you call or email us directly, we have whatever you share with us then. That's it — this site has no accounts, no logins, and we don't buy data about you from anyone.</p>
  <h2>How we use it</h2>
  <p>To respond to your request, schedule and perform the work, and follow up about it. If you ask for a quote, we use your info to give you one. We don't sell or rent your information, and we don't add you to marketing lists you didn't ask for.</p>
  <h2>Who else sees it</h2>
  <p>Form submissions are processed by Netlify, the company that hosts this website. Pages also load fonts from Google Fonts and maps from Google Maps, which means Google may see standard technical data about your visit (like your IP address), the same as on most websites. We don't run advertising trackers on this site.</p>
  <h2>How long we keep it</h2>
  <p>As long as we need it to handle your request and keep our records straight (things like invoices and warranty work). If you want your contact info deleted, email <a href="mailto:dan@dmakshvac.com">dan@dmakshvac.com</a> or call <a href="${TEL}">${PHONE}</a> and we'll take care of it.</p>
  <h2>Questions</h2>
  <p>This policy covers dmakshvac.com, run by DMAK'S HVAC LLC, 812 Sherman Ave, Edwardsville, IL 62025. If anything here is unclear, ask Dan — you'll get a straight answer. Last updated July 2026.</p>
</div></section>` });

const notFoundPage = () => page({ active:'', cta:true, noindex:true,
  title:"Page not found | DMAK'S HVAC",
  desc:"That page moved or never existed. Head back home or contact DMAK'S HVAC.",
  body:`
<section class="band band-dark" style="padding:90px 0;text-align:center"><div class="wrap">
  <span class="eyebrow">404</span>
  <h1 class="page-h1">Page not found</h1>
  <p class="lead" style="margin:16px auto 26px;max-width:460px">That page moved or never existed. Let's get you back on track.</p>
  <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap"><a class="btn btn-red" href="/">Back home</a><a class="btn btn-outline" href="/contact/">Contact us</a></div>
</div></section>` });

// ---------- scheduler A/B/C test variants (standalone, noindex, driven by /scheduler.js) ----------
const SCHED_VARIANTS = [
  { id:'a', name:'Guided', page:'#f3efe9', card:"background:#fff;min-height:620px;border:1px solid #ece7df;box-shadow:0 30px 70px rgba(0,0,0,.16)", maxw:660, ph:'#b3ada3', link:'#3a352e', linkHover:'#141416' },
  { id:'b', name:'Fast Track', page:'#141416', card:"background:#141416;min-height:600px;border:1px solid #2c2c30;box-shadow:0 30px 70px rgba(0,0,0,.4);position:relative", maxw:600, ph:'#7b7b82', link:'#c9c9cd', linkHover:'#fff' },
  { id:'c', name:'Chat', page:'#f3efe9', card:"background:#F6F4F1;height:640px;border:1px solid #e6e1d8;box-shadow:0 30px 70px rgba(0,0,0,.35)", maxw:560, ph:'#a7a29a', link:'#3a352e', linkHover:'#141416' },
];
const schedulerHiddenForm = id => `<form name="schedule-${id}" method="POST" data-netlify="true" netlify-honeypot="bot-field" hidden aria-hidden="true">
    <input type="hidden" name="form-name" value="schedule-${id}"><input name="bot-field"><input name="variant"><input name="name"><input name="phone"><input name="email"><input name="zip"><input name="address"><input name="city"><input name="problem"><input name="urgency"><input name="when">
  </form>`;
const schedulerVariantPage = v => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Book a visit (${v.name}) | DMAK'S HVAC</title>
<meta name="description" content="Book your DMAK'S HVAC visit in about a minute.">
<meta name="robots" content="noindex,nofollow">
<link rel="canonical" href="__CANONICAL__">
<link rel="icon" href="/images/favicon.png"><meta name="theme-color" content="${v.id==='b'?'#141416':'#f3efe9'}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700;800;900&family=Archivo:wght@600;700;800;900&family=Spline+Sans+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box} html,body{margin:0}
  body{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 16px 40px;font-family:'Mulish',sans-serif;background:${v.page}}
  @keyframes scRise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  @keyframes scPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
  @keyframes scPulse{0%,100%{opacity:1}50%{opacity:.4}}
  @keyframes scDot{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-4px);opacity:1}}
  .sc-screen,.sc-in{animation:scRise .3s ease both}
  .sc-thread::-webkit-scrollbar{width:7px}.sc-thread::-webkit-scrollbar-thumb{background:#d8d2c8;border-radius:99px}
  input::placeholder{color:${v.ph}}
  .sc-card{width:100%;max-width:${v.maxw}px;display:flex;flex-direction:column;border-radius:20px;overflow:hidden;${v.card}}
  .sc-home{position:fixed;top:16px;left:18px;display:flex;align-items:center;gap:9px;text-decoration:none;font:800 13px 'Mulish';color:${v.link}}
  .sc-home:hover{color:${v.linkHover}} .sc-home img{width:26px;height:26px;object-fit:contain}
</style>
</head><body>
<a class="sc-home" href="/"><img src="/images/favicon.png" alt="">← DMAK'S HVAC</a>
<div class="sc-card" data-scheduler="${v.id}"></div>
${schedulerHiddenForm(v.id)}
<script src="/scheduler.js"></script>
</body></html>`;

// ---------- write ----------
const write = (rel, html) => {
  const dir = path.join(ROOT, rel);
  fs.mkdirSync(dir, { recursive: true });
  const url = rel === '.' ? SITE + '/' : SITE + '/' + rel + '/';
  fs.writeFileSync(path.join(dir, 'index.html'), html.replace(/__CANONICAL__/g, url));
  return rel + '/index.html';
};
const out = [];
out.push(write('.', home()));
out.push(write('services', servicesOverview()));
SERVICES.forEach(s => out.push(write('services/' + s.id, serviceDetail(s))));
out.push(write('about', about()));
out.push(write('service-area', area()));
AREAS.forEach(c => out.push(write('service-area/' + c.slug, cityPage(c))));
out.push(write('reviews', reviews()));
out.push(write('contact', contact()));
out.push(write('schedule', schedulePage()));
SCHED_VARIANTS.forEach(v => out.push(write('schedule/' + v.id, schedulerVariantPage(v))));
out.push(write('privacy', privacyPage()));
out.push(write('thanks', thanksPage()));
const COMBO_URLS = [];
if (COMBOS) SERVICES.forEach(s => AREAS.forEach(c => {
  const copy = comboFor(s.id, c.slug);
  if (!copy) { console.warn('missing combo copy: ' + s.id + ' × ' + c.slug); return; }
  out.push(write('services/' + s.id + '/' + c.slug, comboPage(s, c, copy)));
  COMBO_URLS.push('/services/' + s.id + '/' + c.slug + '/');
}));

const URLS = ['/', '/services/', '/about/', '/service-area/', '/reviews/', '/contact/', '/schedule/', '/privacy/']
  .concat(SERVICES.map(s => '/services/' + s.id + '/'))
  .concat(AREAS.map(c => '/service-area/' + c.slug + '/'))
  .concat(COMBO_URLS);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${URLS.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, '404.html'), notFoundPage().replace(/__CANONICAL__/g, SITE + '/404'));

// ---------- Netlify _redirects: legacy WordPress URLs -> new structure (301 permanent) ----------
// Source of truth: the old WP page-sitemap. The whole old site was home, /contact-us/, /about-us/,
// and exactly 6 town pages (no service pages, no blog). Home stays "/", so it needs no redirect.
const REDIRECTS = [
  ['/contact-us/', '/contact/'],
  ['/about-us/', '/about/'],
  ['/edwardsville-il-hvac-services/', '/service-area/edwardsville/'],
  ['/glen-carbon-il-hvac-services/', '/service-area/glen-carbon/'],
  ['/alton-il-hvac-services/', '/service-area/alton/'],
  ['/troy-il-hvac-services/', '/service-area/troy/'],
  ['/collinsville-il-hvac-services/', '/service-area/collinsville/'],
  ['/st-louis-mo-hvac-services/', '/service-area/st-louis-mo/']
];
// Emit each rule with and without a trailing slash so old links match regardless of form.
const redirectLines = REDIRECTS.flatMap(([from, to]) => {
  const bare = from.replace(/\/$/, '');
  return [`${from}  ${to}  301`, `${bare}  ${to}  301`];
});
fs.writeFileSync(path.join(ROOT, '_redirects'),
  `# Legacy WordPress URLs -> new structure (301 permanent). Generated by build.js.\n${redirectLines.join('\n')}\n`);
console.log('Generated pages:\n' + [...new Set(out)].sort().map(p => '  ' + p).join('\n') + '\n  + robots.txt, sitemap.xml, 404.html, _redirects');
