// Static site generator for DMAK'S HVAC — "Bold Contractor" (from Claude Design handoff)
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const PHONE = '(618) 278-8219', TEL = 'tel:+16182788219';
const RED = '#CE3F26', BLUE = '#2E76AE', ORANGE = '#E0823F';
const amp = s => String(s).replace(/&(?![a-z]+;)/gi, '&amp;');
const img = p => '/images/' + p.replace(/^uploads\//, '');

const SERVICES = [
  { id:'heating', name:'Heating', short:'Furnaces, heat pumps, repairs & tune-ups.', accent:RED,
    card:'DSC07711-scaled.jpeg', hero:'DSC07707-scaled.jpeg',
    tagline:'Furnaces, heat pumps, and fast repairs — so nobody rides out a cold night.',
    intro:"When the temperature drops and your furnace quits, you need someone who picks up and shows up. We repair, tune, and replace gas furnaces and heat pumps across the Metro East — and we stock common parts on the truck, so most heating calls get fixed the same day.",
    includes:['Furnace repair & diagnostics','Heat pump service & repair','New furnace installation','Igniter, blower & control board work','Thermostat replacement','Annual heating tune-ups'],
    signs:[{t:'No heat at all',d:"Furnace won't start or blows cold — often an igniter, flame sensor, or safety switch."},{t:'Short cycling',d:'Turns on and off constantly. Usually airflow, a sensor, or an oversized system.'},{t:'Burning or gas smell',d:"Shut it down and call us. We'll find the cause before it becomes a bigger repair."}],
    gallery:['DSC07707-scaled.jpeg','image-24.png','image-25.png'] },
  { id:'cooling', name:'Cooling', short:'AC install & fast repair for hot summers.', accent:BLUE,
    card:'DSC07667-scaled.jpeg', hero:'DSC07649-scaled.jpeg',
    tagline:'AC repair and installs that keep up with a St. Louis summer.',
    intro:"A dead AC in July is an emergency in this heat. We diagnose and repair central air fast, and when it's time to replace, we size the new system right for your home — no guesswork, no upsell.",
    includes:['Central AC repair','Refrigerant leak diagnosis','Capacitor & compressor service','New AC installation','Coil cleaning','Cooling tune-ups'],
    signs:[{t:'Warm air',d:'Running but not cooling — often low refrigerant or a failed capacitor.'},{t:"Won't turn on",d:'No response at the thermostat could be electrical, a breaker, or the contactor.'},{t:'High summer bills',d:"An aging or low-charge system runs constantly. We'll measure real efficiency."}],
    gallery:['DSC07649-scaled.jpeg','DSC07667-scaled.jpeg','image-27.png'] },
  { id:'humidifiers', name:'Humidifiers & Air Quality', short:'Whole-home humidity & cleaner air.', accent:BLUE,
    card:'Humidifier.jpg', hero:'Humidifier.jpg',
    tagline:'Whole-home humidity and cleaner air, built right into your system.',
    intro:"Dry winter air cracks woodwork, dries out skin, and makes your home feel colder than it is. We install and service whole-home humidifiers and air-quality upgrades that work quietly in the background — no countertop units to refill.",
    includes:['Whole-home humidifier install','Humidifier repair & pad replacement','Air quality assessments','Media & HEPA filtration','Humidity control setup','Seasonal maintenance'],
    signs:[{t:'Dry, staticky air',d:'Shocks, cracked wood trim, and dry skin all winter mean your air needs moisture.'},{t:'Dust everywhere',d:'Better filtration cuts the dust that settles hours after you clean.'},{t:'Indoor allergies',d:'The right filtration and humidity make a real difference for sensitive households.'}],
    gallery:['Humidifier.jpg','DSC07688-scaled.jpeg','DSC07694-scaled.jpeg'] },
  { id:'installs', name:'System Installs', short:'New systems sized & installed right.', accent:RED,
    card:'image-26.png', hero:'image-26.png',
    tagline:'New systems, sized right and installed clean.',
    intro:"Replacing a system is a big decision, so we make it a straight one. We measure your home, walk you through honest options at a few price points, and install it clean — then we're here for it after. Free in-home estimates, always.",
    includes:['Free in-home estimates','Load calculation & correct sizing','Furnace & AC replacement','Heat pump systems','High-efficiency upgrades','Financing options available'],
    signs:[{t:'Repairs adding up',d:"When repair costs start approaching a replacement, we'll tell you straight."},{t:'System over 12 years',d:'Older systems lose efficiency. A new one can pay for part of itself.'},{t:'Uneven comfort',d:'Hot and cold rooms often mean the system was never sized right.'}],
    gallery:['image-26.png','image-24.png','image-25.png'] },
  { id:'maintenance', name:'Maintenance', short:'Seasonal tune-ups, fewer breakdowns.', accent:ORANGE,
    card:'DSC07694-scaled.jpeg', hero:'DSC07693-scaled.jpeg',
    tagline:'Seasonal tune-ups that head off the breakdowns.',
    intro:"The cheapest repair is the one you never need. A seasonal tune-up keeps your system efficient, protects your manufacturer warranty, and catches small problems before they leave you without heat or cool. Best booked just before summer and winter.",
    includes:['Full system inspection','Filter replacement','Coil & burner cleaning','Refrigerant & pressure check','Electrical & safety check','Priority scheduling for members'],
    signs:[{t:"It's been a while",d:"If you can't remember the last tune-up, you're overdue."},{t:'Rising bills',d:'A dirty, unmaintained system works harder and costs more every month.'},{t:'Peak season ahead',d:'Tune up before the first heat wave or cold snap — not during.'}],
    gallery:['DSC07693-scaled.jpeg','DSC07694-scaled.jpeg','DSC07711-scaled.jpeg'] }
];

const SYMPTOMS = [
  { id:'cool',    accent:BLUE,   label:"AC isn't cooling",    sub:"Warm air or won't kick on" },
  { id:'heat',    accent:RED,    label:'No heat',             sub:"Furnace won't start" },
  { id:'noise',   accent:RED,    label:'Strange noise / smell', sub:'Banging, buzzing, burning' },
  { id:'bills',   accent:ORANGE, label:'High energy bills',   sub:'System runs constantly' },
  { id:'install', accent:ORANGE, label:'New system',          sub:'Replace or install' },
  { id:'maint',   accent:BLUE,   label:'Tune-up',             sub:'Seasonal maintenance' }
];

const REVIEWS = [
  { text:"Dan is great! Quick response, gets the job done right, and he's friendly and honest.", name:'Ryan Land', town:'Edwardsville, IL' },
  { text:'Came out the same day when our AC died in July. Fair price and no upsell — exactly what you want.', name:'Verified customer', town:'Glen Carbon, IL' },
  { text:'Told us we could get another season out of our furnace instead of replacing it. Honest people.', name:'Verified customer', town:'Troy, IL' },
  { text:'Dorothy is a bonus, but Dan is the real deal. Explained everything and cleaned up after himself.', name:'Verified customer', town:'Alton, IL' },
  { text:'Replaced our whole system. Clean install, on time, and the house has never been this comfortable.', name:'Verified customer', town:'Collinsville, IL' },
  { text:'Answered the phone at 9pm and talked me through it until he could get out first thing. Lifesaver.', name:'Verified customer', town:'St. Louis, MO' }
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

// ---------- shared chrome ----------
const header = active => {
  const a = k => active === k ? ' class="active"' : '';
  const links = `
      <a href="/services/"${a('services')}>Services</a>
      <a href="/service-area/"${a('area')}>Service Area</a>
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
    <div><h2>Ready when you are.</h2><p>Same-day repairs and free quotes across the Metro East &amp; St. Louis.</p></div>
    <div class="actions"><a class="btn btn-red" href="${TEL}">Call ${PHONE}</a><a class="btn btn-outline" href="/contact/">Get a free quote</a></div>
  </div></section>`;
const footer = () => `<footer class="footer"><div class="wrap grid">
    <div><div class="bname">DMAK'S HVAC LLC</div><div class="btag">HEATING &amp; COOLING</div><p class="blurb">Family-owned heating &amp; cooling, serving the Metro East &amp; St. Louis.</p></div>
    <div><h4>SERVICES</h4>${SERVICES.map(s=>`<a href="/services/${s.id}/">${amp(s.name)}</a>`).join('')}</div>
    <div><h4>COMPANY</h4><a href="/about/">About</a><a href="/service-area/">Service Area</a><a href="/reviews/">Reviews</a><a href="/contact/">Contact</a></div>
    <div><h4>CONTACT</h4><div class="cd">${PHONE}<br>dan@dmakshvac.com<br>812 Sherman Ave,<br>Edwardsville, IL 62025</div></div>
  </div></footer>`;
const reviewCard = (r, town) => `<div class="review"><div class="stars">★★★★★</div><p>"${amp(r.text)}"</p><div class="nm">${r.name}</div>${town?`<div class="tw">${r.town}</div>`:''}</div>`;

// ---------- schema (JSON-LD) ----------
const SITE = 'https://www.dmakshvac.com';
const localBusinessSchema = () => ({
  "@context":"https://schema.org","@type":"HVACBusiness","@id":SITE+"/#business",
  "name":"DMAK'S HVAC LLC","telephone":"+16182788219","email":"dan@dmakshvac.com",
  "url":SITE+"/","image":SITE+"/images/logo.png","priceRange":"$$",
  "address":{"@type":"PostalAddress","streetAddress":"812 Sherman Ave","addressLocality":"Edwardsville","addressRegion":"IL","postalCode":"62025","addressCountry":"US"},
  "geo":{"@type":"GeoCoordinates","latitude":38.8114,"longitude":-89.9532},
  "openingHoursSpecification":[
    {"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday"],"opens":"07:00","closes":"18:00"},
    {"@type":"OpeningHoursSpecification","dayOfWeek":"Saturday","opens":"08:00","closes":"14:00"}
  ],
  "aggregateRating":{"@type":"AggregateRating","ratingValue":"4.9","reviewCount":"200"},
  "areaServed":AREAS.map(a=>({"@type":"City","name":a.name+", "+a.st})),
  "makesOffer":SERVICES.map(s=>({"@type":"Offer","itemOffered":{"@type":"Service","name":s.name.replace(/&/g,'and')}}))
});
const serviceSchema = svc => ({
  "@context":"https://schema.org","@type":"Service","serviceType":svc.name.replace(/&/g,'and'),
  "name":svc.name.replace(/&/g,'and'),"description":svc.tagline,
  "provider":{"@type":"HVACBusiness","name":"DMAK'S HVAC LLC","telephone":"+16182788219","url":SITE+"/"},
  "areaServed":AREAS.map(a=>a.name+", "+a.st),"url":SITE+"/services/"+svc.id+"/"
});
const breadcrumbSchema = items => ({
  "@context":"https://schema.org","@type":"BreadcrumbList",
  "itemListElement":items.map((it,i)=>({"@type":"ListItem","position":i+1,"name":it[0],"item":SITE+it[1]}))
});

const svcCard = s => `<a class="svc-card" href="/services/${s.id}/" style="border-bottom-color:${s.accent}">
      <div class="img"><img src="${img(s.card)}" alt="${amp(s.name)} — DMAK'S HVAC" loading="lazy"></div>
      <div class="body"><div class="nm">${amp(s.name)}</div><div class="sh">${amp(s.short)}</div></div>
    </a>`;
const cityReviews = c => { const m = REVIEWS.filter(r=>r.town.indexOf(c.name)===0); const rest = REVIEWS.filter(r=>r.town.indexOf(c.name)!==0); return m.concat(rest).slice(0,3); };

const page = ({title, desc, active, body, cta = true, schema, noindex = false}) => {
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
<meta property="og:image" content="${SITE}/images/DSC07682-scaled.jpeg">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700;800;900&family=Archivo:wght@500;600;700;800;900&family=Spline+Sans+Mono:wght@400;500&display=swap" rel="stylesheet">
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
</body></html>`).replace(/\s*—\s*/g, ', ');
};

// ---------- page bodies ----------
const solver = () => `<div class="solver">
        <div class="sv-eye">PROBLEM SOLVER</div>
        <div class="sv-title">What's wrong? Tap it.</div>
        <div class="sv-grid">${SYMPTOMS.map(s=>`
          <button class="sym${s.id==='cool'?' active':''}" data-sym="${s.id}">
            <span class="top"><span class="dot" style="background:${s.accent}"></span><span class="lb">${amp(s.label)}</span></span>
            <span class="sub">${s.sub}</span>
          </button>`).join('')}
        </div>
        <div class="sv-result">
          <span class="sv-tag"></span>
          <p class="sv-diag"></p>
          <div class="sv-actions"><a class="btn btn-red" href="${TEL}">Call now</a><a class="btn btn-outline sv-learn" href="/services/cooling/">Learn more</a></div>
          <a class="sv-quote" href="/contact/">or get a free quote →</a>
        </div>
      </div>`;

const home = () => page({ active:'', cta:true,
  title:"DMAK'S HVAC — Heating & Cooling in Edwardsville, IL | Same-Day Repairs",
  desc:"Family-owned, fully licensed HVAC in Edwardsville IL & the Metro East. Same-day heating & cooling repairs, honest pricing, 4.9★ on Google. Call (618) 278-8219.",
  body:`
<section class="band band-dark pos hero" style="padding:60px 0 64px">
  <span class="blob blob-red"></span><span class="blob blob-blue"></span>
  <div class="wrap">
    <div class="grid">
      <div>
        <span class="pill">24/7 EMERGENCY · METRO EAST + ST. LOUIS</span>
        <h1>No heat?<br>No cool?<br><span class="accent-red">No problem.</span></h1>
        <p class="lead">Family-owned, fully licensed, and on the way. Same-day repairs and honest pricing across Edwardsville and beyond.</p>
        <div class="actions"><a class="btn btn-red" href="${TEL}">Call ${PHONE}</a><a class="btn btn-outline" href="/contact/">Get a free quote</a></div>
      </div>
      ${solver()}
    </div>
    <div class="trust">
      <span><b style="color:${RED}">200+</b> happy customers</span>
      <span><b style="color:${BLUE_L()}">4.9★</b> on Google</span>
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
  <div class="sec-head"><h2 class="title">Real reviews</h2><span class="rev-score"><b>4.9★</b> Google · 200+ reviews</span></div>
  <div class="rev-grid">${REVIEWS.slice(0,3).map(r=>reviewCard(r,false)).join('')}</div>
  <a class="link-red" href="/reviews/" style="display:inline-block;margin-top:22px">Read more reviews →</a>
</div></section>` });

function BLUE_L(){ return '#6FB1DE'; }

const servicesOverview = () => page({ active:'services', cta:true,
  title:"HVAC Services in Edwardsville & the Metro East | DMAK'S HVAC",
  desc:"Heating, cooling, humidifiers, system installs, and maintenance from a family-owned Metro East HVAC team. Honest pricing, same-day repairs. (618) 278-8219.",
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
      <div class="actions" style="display:flex;gap:14px;margin-top:28px;flex-wrap:wrap"><a class="btn btn-red" href="${TEL}">Call ${PHONE}</a><a class="btn btn-outline" href="/contact/">Get a free quote</a></div>
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
  <div class="eyebrow" style="margin-bottom:14px">EXPLORE MORE SERVICES</div>
  <div class="chips">${SERVICES.filter(s=>s.id!==svc.id).map(o=>`<a class="chip" href="/services/${o.id}/">${amp(o.name)}</a>`).join('')}</div>
</div></section>` });

const about = () => page({ active:'about', cta:true,
  title:"About DMAK'S HVAC — Family-Owned HVAC in Edwardsville, IL",
  desc:"Meet Daniel Makarov (and Dorothy). DMAK'S HVAC is a family-owned, fully licensed heating & cooling company serving the Metro East. When you call, you get Dan.",
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
      <p>Daniel is fully licensed and certified with years in the field across the Metro East. Dorothy, the shop dog, runs quality control and morale. Together they've earned 200+ happy customers and a 4.9★ rating.</p>
      <div class="checks">${['Licensed & certified','Family-owned & local','Honest, no-pressure quotes','Fully insured'].map(c=>`<div class="c"><b>✓</b>${amp(c)}</div>`).join('')}</div>
    </div>
  </div>
  <div class="stats">
    <div><b style="color:${RED}">200+</b><span>happy customers</span></div>
    <div><b style="color:${BLUE}">4.9★</b><span>Google rating</span></div>
    <div><b style="color:${ORANGE}">5+</b><span>years local</span></div>
    <div><b style="color:#1b1a18">1</b><span>very good dog</span></div>
  </div>
</div></section>` });

const area = () => page({ active:'area', cta:true,
  title:"Service Area — HVAC in the Metro East & St. Louis | DMAK'S HVAC",
  desc:"Based in Edwardsville, IL, DMAK'S HVAC serves Glen Carbon, Maryville, Troy, Collinsville, Alton, Godfrey, Granite City, Highland, St. Louis MO and surrounding areas.",
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
  title:"Reviews — 4.9★ HVAC in Edwardsville, IL | DMAK'S HVAC",
  desc:"See why neighbors across the Metro East rate DMAK'S HVAC 4.9★ with 200+ Google reviews. Honest, on-time heating & cooling from a family-owned team.",
  body:`
<section class="band band-dark" style="padding:60px 0;text-align:center"><div class="wrap">
  <span class="eyebrow">GOOGLE REVIEWS</span>
  <h1 class="page-h1">Neighbors love<br>working with us</h1>
  <div style="display:inline-flex;align-items:center;gap:12px;margin-top:20px;font:700 16px 'Mulish';color:#c9c9cd"><span style="color:${ORANGE};font:900 28px 'Archivo'">4.9★</span> · 200+ reviews on Google</div>
</div></section>
<section class="band band-cream"><div class="wrap">
  <div class="rev-grid">${REVIEWS.map(r=>reviewCard(r,true)).join('')}</div>
</div></section>` });

const contact = () => page({ active:'contact', cta:false,
  title:"Contact DMAK'S HVAC — Free Quote | (618) 278-8219",
  desc:"Call (618) 278-8219 or request a free quote from DMAK'S HVAC. A real person gets back to you — usually within the hour. Serving Edwardsville & the Metro East.",
  body:`
<section class="band-red" style="padding:60px 0"><div class="wrap">
  <div class="contact-grid">
    <div class="contact-info">
      <span class="eyebrow">GET IN TOUCH</span>
      <h1>Let's get<br>you comfortable.</h1>
      <p class="lead">Call now or send a request and a real person will get back to you — usually within the hour.</p>
      <a class="phone" href="${TEL}">${PHONE}</a>
      <div class="cd">dan@dmakshvac.com<br>812 Sherman Ave, Edwardsville, IL 62025</div>
      <div class="hours"><div class="k">HOURS</div>Mon–Fri 7:00a – 6:00p · Sat 8:00a – 2:00p<br><b>24/7 emergency service available</b></div>
    </div>
    <form class="form-card" name="quote" method="POST" data-netlify="true" netlify-honeypot="bot-field" action="/thanks/">
      <input type="hidden" name="form-name" value="quote">
      <p style="display:none"><label>Skip if human: <input name="bot-field"></label></p>
      <div class="k">Free quote in 60 seconds</div>
      <input name="name" placeholder="Your name" required>
      <input name="phone" type="tel" placeholder="Phone number" required>
      <input name="email" type="email" placeholder="Email (optional)">
      <select name="problem">
        <option>What's the problem?</option><option>AC isn't cooling</option><option>No heat</option><option>Strange noise or smell</option><option>High energy bills</option><option>New system / replacement</option><option>Tune-up &amp; maintenance</option>
      </select>
      <textarea name="message" rows="3" placeholder="Anything else we should know?"></textarea>
      <button class="btn btn-dark btn-block" type="submit">Send my request →</button>
      <div class="form-fine">No obligation · usually answered within the hour</div>
    </form>
  </div>
</div></section>` });

const cityPage = c => page({ active:'area', cta:true,
  title:`HVAC in ${c.name}, ${c.st} — Heating & Cooling | DMAK'S HVAC`,
  desc:`Fast, honest HVAC in ${c.name}, ${c.st}. Furnace & AC repair, installs, humidifiers, and tune-ups from family-owned DMAK'S HVAC. Call (618) 278-8219.`,
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
  <div class="svc-cards">${SERVICES.map(svcCard).join('')}</div>
</div></section>
<section class="band-cream" style="padding:0 0 20px"><div class="wrap">
  <div class="sec-head"><h2 class="title" style="font-size:26px">What ${c.name} neighbors say</h2><span class="rev-score"><b>4.9★</b> Google · 200+ reviews</span></div>
  <div class="rev-grid">${cityReviews(c).map(r=>reviewCard(r,true)).join('')}</div>
</div></section>
<section class="band-cream" style="padding:0 0 56px"><div class="wrap"><div class="map"><iframe loading="lazy" title="${c.name} service area map" src="https://www.google.com/maps?q=${encodeURIComponent(c.name+', '+c.st)}&z=12&output=embed"></iframe></div></div></section>` });

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
out.push(write('thanks', thanksPage()));

const URLS = ['/', '/services/', '/about/', '/service-area/', '/reviews/', '/contact/']
  .concat(SERVICES.map(s => '/services/' + s.id + '/'))
  .concat(AREAS.map(c => '/service-area/' + c.slug + '/'));
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${URLS.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, '404.html'), notFoundPage().replace(/__CANONICAL__/g, SITE + '/404'));
console.log('Generated pages:\n' + [...new Set(out)].sort().map(p => '  ' + p).join('\n') + '\n  + robots.txt, sitemap.xml, 404.html');
