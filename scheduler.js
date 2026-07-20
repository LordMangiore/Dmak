// DMAK'S HVAC — booking scheduler variants (production reimplementation of the
// Claude Design prototypes A/B/C). One file drives all three via [data-scheduler].
// Entrance animation only plays on step transitions; typing updates the CTA in
// place (no DOM rebuild) so there's no flicker and no dropped keystrokes.
(function () {
  'use strict';
  var PHONE = '(314) 420-9851', TEL = 'tel:+13144209851';
  var RED = '#CE3F26', BLUE = '#2E76AE', ORANGE = '#E0823F';

  // ---- shared data ----
  var PROBLEMS = [
    { id: 'ac',     accent: BLUE,   label: "AC isn't cooling",      sub: "Warm air or won't kick on", bLabel: 'AC out',        bSub: "Warm air, won't cool",   reply: "Ugh, in this heat? I'll get you on the schedule fast." },
    { id: 'heat',   accent: RED,    label: 'No heat',               sub: "Furnace won't fire up",     bLabel: 'No heat',       bSub: "Furnace won't fire",     reply: "Nobody should ride out a cold night. Let's move." },
    { id: 'noise',  accent: RED,    label: 'Strange noise or smell',sub: 'Banging, buzzing, burning', bLabel: 'Noise / smell', bSub: 'Banging or burning',     reply: "Good call flagging that, let's look before it grows." },
    { id: 'bills',  accent: ORANGE, label: 'High energy bills',     sub: 'It runs constantly',        bLabel: 'High bills',    bSub: 'Runs constantly',        reply: "Let's find where the money's going. Usually an easy fix." },
    { id: 'install',accent: ORANGE, label: 'New system',            sub: 'Replace or install',        bLabel: 'New system',    bSub: 'Replace or install',     reply: "Happy to size one right for your place, no upsell, promise." },
    { id: 'tuneup', accent: BLUE,   label: 'Tune-up',               sub: 'Seasonal maintenance',      bLabel: 'Tune-up',       bSub: 'Seasonal service',       reply: "Smart. A tune-up now saves the breakdown later." }
  ];
  var URGENCIES = [
    { id: 'now',   label: 'Emergency, right now', sub: 'No heat/AC, or something unsafe', tag: 'Priority', accent: RED,    tagBg: 'rgba(206,63,38,.1)',  reply: "On it. I'll call you within minutes." },
    { id: 'today', label: 'Today if possible',    sub: 'As soon as you can get here',     tag: 'Same-day', accent: ORANGE, tagBg: 'rgba(224,130,63,.14)', reply: "Let me check what's open today." },
    { id: 'week',  label: 'This week',            sub: 'Soon, but not an emergency',      tag: 'Flexible', accent: BLUE,   tagBg: 'rgba(46,118,174,.12)', reply: "Easy, plenty of room this week." },
    { id: 'flex',  label: "I'm flexible",         sub: 'Whenever works best for you',     tag: 'Anytime',  accent: BLUE,   tagBg: 'rgba(46,118,174,.12)', reply: "Great. I'll show the first opening and a few options." }
  ];
  // Service-area towns — powers the keyless city autocomplete (datalist).
  var TOWNS = ['Edwardsville, IL','Glen Carbon, IL','Maryville, IL','Troy, IL','Collinsville, IL','Alton, IL','Godfrey, IL','Bethalto, IL','Wood River, IL','Granite City, IL','Highland, IL','St. Louis, MO'];
  function slots() {
    var dow = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var d2 = new Date(); d2.setDate(d2.getDate() + 2);
    var third = dow[d2.getDay()];
    return [
      { id: 's1', day: 'Today',    window: '4:00 – 6:00 PM',  wShort: '4 – 6 PM',   short: 'Today, 4–6 PM',     fastest: true },
      { id: 's2', day: 'Tomorrow', window: '8:00 – 10:00 AM', wShort: '8 – 10 AM',  short: 'Tomorrow, 8–10 AM' },
      { id: 's3', day: 'Tomorrow', window: '12:00 – 2:00 PM', wShort: '12 – 2 PM',  short: 'Tomorrow, 12–2 PM' },
      { id: 's4', day: third,      window: '8:00 – 10:00 AM', wShort: '8 – 10 AM',  short: third + ', 8–10 AM' }
    ];
  }
  function nowTime() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    var ap = h >= 12 ? 'PM' : 'AM'; h = h % 12; if (h === 0) h = 12;
    return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ap;
  }
  function refNum() { return 'DMAK-' + (1000 + Math.floor(Math.random() * 9000)); }
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var zip5 = function (v) { return /^\d{5}$/.test(v); };
  var phoneOk = function (v) { return v.replace(/\D/g, '').length >= 10; }; // needs a real 10-digit number
  var digitsOnly = function (v) { return v.replace(/[^0-9]/g, '').slice(0, 5); };

  function submitNetlify(formName, data) {
    var params = new URLSearchParams();
    params.append('form-name', formName);
    Object.keys(data).forEach(function (k) { params.append(k, data[k] == null ? '' : data[k]); });
    try {
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() })
        .catch(function () {});
    } catch (e) {}
  }
  function summaryData(st) {
    var prob = PROBLEMS.find(function (p) { return p.id === st.problem; });
    var urg = URGENCIES.find(function (u) { return u.id === st.urgency; });
    var s = slots().find(function (x) { return x.id === st.slot; });
    var loc = (st.address ? st.address + ', ' : '') + (st.city || 'Your area') + (st.zip ? ' · ' + st.zip : '');
    return { prob: prob, urg: urg, slot: s, rows: [
      { k: 'Service', v: prob ? prob.label : '—' },
      { k: 'When', v: s ? (s.day + ' · ' + s.window) : '—' },
      { k: 'Where', v: loc },
      { k: 'Priority', v: urg ? urg.label : '—' }
    ] };
  }
  function payload(variant, st) {
    var prob = PROBLEMS.find(function (p) { return p.id === st.problem; });
    var urg = URGENCIES.find(function (u) { return u.id === st.urgency; });
    var s = slots().find(function (x) { return x.id === st.slot; });
    return {
      variant: variant,
      name: st.name || ((st.first || '') + ' ' + (st.last || '')).trim(),
      phone: st.phone || '', email: st.email || '', zip: st.zip || '',
      address: st.address || '', city: st.city || '',
      problem: prob ? prob.label : '', urgency: urg ? urg.label : '',
      when: s ? (s.day + ' ' + s.window) : ''
    };
  }
  // restore focus + caret after a full re-render (used only when structure changes)
  function keepFocus(root, fn) {
    var a = document.activeElement, name = a && a.getAttribute && a.getAttribute('data-in');
    var pos = a && a.selectionStart;
    fn();
    if (name) { var ni = root.querySelector('[data-in="' + name + '"]'); if (ni) { ni.focus(); try { ni.setSelectionRange(pos, pos); } catch (x) {} } }
  }

  /* =======================================================================
     VARIANT A — "Guided" (light, phase tabs, 5 steps)
     ======================================================================= */
  var A_ON = 'cursor:pointer;border:none;background:' + RED + ';color:#fff;font:800 15px Mulish;letter-spacing:.04em;padding:17px 64px;border-radius:11px;box-shadow:0 12px 28px rgba(206,63,38,.32)';
  var A_OFF = 'border:none;background:#ece7df;color:#b8b2a8;font:800 15px Mulish;letter-spacing:.04em;padding:17px 64px;border-radius:11px;cursor:not-allowed';
  function initA(root) {
    var st = { step: 0, first: '', last: '', problem: null, urgency: null, slot: null, address: '', zip: '', phone: '', email: '' };
    var autoT;
    function canNext() { if (st.step === 0) return !!st.first.trim(); if (st.step === 4) return zip5(st.zip) && phoneOk(st.phone); return false; }
    function go(n) { st.step = Math.max(0, Math.min(n, 5)); render(true); }
    function auto() { clearTimeout(autoT); autoT = setTimeout(function () { go(st.step + 1); }, 340); }
    function syncCta() { var b = root.querySelector('.sc-cta'); if (!b) return; var can = canNext(); b.disabled = !can; b.style.cssText = can ? A_ON : A_OFF; }

    function optProblem(p) {
      var active = st.problem === p.id;
      return '<button type="button" data-pick="problem" data-id="' + p.id + '" style="position:relative;text-align:left;cursor:pointer;background:#fff;border:1.5px solid ' + (active ? RED : '#e6e1d8') + ';border-radius:14px;padding:16px;font-family:Mulish,sans-serif;display:flex;flex-direction:column;gap:3px;">'
        + (active ? '<span style="position:absolute;inset:0;border:2px solid ' + RED + ';border-radius:14px;background:rgba(206,63,38,.05);pointer-events:none;"></span>' : '')
        + '<span style="display:flex;align-items:center;gap:9px;"><span style="width:11px;height:11px;border-radius:50%;background:' + p.accent + ';flex:none;"></span><span style="font:800 15px Mulish;color:#1b1a18;">' + esc(p.label) + '</span></span>'
        + '<span style="font:500 12.5px Mulish;color:#8a857c;padding-left:20px;">' + esc(p.sub) + '</span></button>';
    }
    function optUrg(u) {
      var active = st.urgency === u.id;
      return '<button type="button" data-pick="urgency" data-id="' + u.id + '" style="position:relative;text-align:left;cursor:pointer;background:#fff;border:1.5px solid ' + (active ? RED : '#e6e1d8') + ';border-radius:13px;padding:15px 18px;font-family:Mulish,sans-serif;display:flex;align-items:center;justify-content:space-between;gap:12px;">'
        + (active ? '<span style="position:absolute;inset:0;border:2px solid ' + RED + ';border-radius:13px;background:rgba(206,63,38,.05);pointer-events:none;"></span>' : '')
        + '<span style="display:flex;flex-direction:column;gap:2px;"><span style="font:800 15.5px Mulish;color:#1b1a18;">' + esc(u.label) + '</span><span style="font:500 12.5px Mulish;color:#8a857c;">' + esc(u.sub) + '</span></span>'
        + '<span style="font:800 11px Mulish;color:' + u.accent + ';background:' + u.tagBg + ';padding:5px 11px;border-radius:99px;white-space:nowrap;">' + esc(u.tag) + '</span></button>';
    }
    function optSlot(s) {
      var active = st.slot === s.id;
      return '<button type="button" data-pick="slot" data-id="' + s.id + '" style="position:relative;text-align:left;cursor:pointer;background:#fff;border:1.5px solid ' + (active ? RED : '#e6e1d8') + ';border-radius:13px;padding:15px 18px;font-family:Mulish,sans-serif;display:flex;align-items:center;justify-content:space-between;gap:12px;">'
        + (active ? '<span style="position:absolute;inset:0;border:2px solid ' + RED + ';border-radius:13px;background:rgba(206,63,38,.05);pointer-events:none;"></span>' : '')
        + '<span style="display:flex;align-items:center;gap:13px;"><span style="width:22px;height:22px;border-radius:50%;border:2px solid ' + (active ? RED : '#c9c3b8') + ';display:flex;align-items:center;justify-content:center;flex:none;"><span style="width:11px;height:11px;border-radius:50%;background:' + (active ? RED : 'transparent') + ';"></span></span><span style="display:flex;flex-direction:column;gap:1px;"><span style="font:800 15.5px Mulish;color:#1b1a18;">' + esc(s.day) + '</span><span style="font:600 13px Mulish;color:#6a655d;">' + esc(s.window) + '</span></span></span>'
        + (s.fastest ? '<span style="font:800 11px Mulish;color:' + RED + ';background:rgba(206,63,38,.1);padding:5px 11px;border-radius:99px;white-space:nowrap;">⚡ Fastest</span>' : '') + '</button>';
    }

    function render(animate) {
      var scr = animate ? ' class="sc-screen"' : '';
      var first = st.first.trim();
      var zipOk = zip5(st.zip);
      var done = st.step === 5;
      var phaseOf = [0, 1, 1, 2, 3], cur = done ? 3 : phaseOf[st.step];
      var tabLabels = ['You', 'Service', 'Schedule', 'Location'];
      var headlines = [
        "I'll book your visit in minutes. Ready to go?",
        'Great to meet you' + (first ? ', ' + first : '') + "! What's going on?",
        'Got it. How soon do you need us?',
        "Here's the soonest I can swing by.",
        'Where are we headed' + (first ? ', ' + first : '') + '?'
      ];
      var isCta = st.step === 0 || st.step === 4, can = canNext();
      var ctaLabel = st.step === 0 ? "LET'S GO" : 'BOOK IT →';

      var html = '';
      if (!done) {
        html += '<div style="flex:none;padding:26px 24px 0;"><div style="display:flex;flex-direction:column;align-items:center;gap:5px;margin-bottom:20px;">'
          + '<div style="width:66px;height:66px;border-radius:50%;background:' + RED + ';display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 8px 22px rgba(206,63,38,.3);"><img src="/images/favicon.png" alt="Dan" style="width:48px;height:48px;object-fit:contain;"></div>'
          + '<div style="font:800 10px Mulish;letter-spacing:.18em;color:#9b968c;">DAN · DMAK\'S HVAC</div></div>'
          + '<div style="display:flex;border-bottom:1px solid #ece7df;">';
        tabLabels.forEach(function (l, i) {
          var active = i === cur, passed = i < cur;
          var color = (active || passed) ? '#1b1a18' : '#c2bcb2';
          var under = active ? RED : (passed ? '#f0c9c0' : 'transparent');
          html += '<div style="flex:1;text-align:center;padding-bottom:11px;font:800 12px Mulish;letter-spacing:.1em;color:' + color + ';border-bottom:3px solid ' + under + ';margin-bottom:-1px;transition:all .3s;">' + l + '</div>';
        });
        html += '</div></div>';
      }

      html += '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:30px 28px 24px;text-align:center;position:relative;">';
      if (st.step > 0 && !done)
        html += '<button type="button" data-act="back" style="position:absolute;left:28px;top:14px;cursor:pointer;border:none;background:none;color:#a7a29a;font:800 13px Mulish;padding:0;display:inline-flex;align-items:center;gap:5px;">← Back</button>';
      if (!done)
        html += '<h1' + scr + ' style="font:700 34px/1.18 Archivo,sans-serif;color:#2a2620;letter-spacing:-.01em;max-width:640px;margin:0 0 34px;">' + esc(headlines[Math.min(st.step, 4)]) + '</h1>';

      if (st.step === 0)
        html += '<div' + scr + ' style="width:100%;max-width:560px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">'
          + '<input data-in="first" aria-label="First name" autocomplete="given-name" value="' + esc(st.first) + '" placeholder="FIRST NAME" style="width:100%;border:1.5px solid #e2ddd5;border-radius:11px;padding:17px 16px;font:600 16px Mulish;background:#fff;outline:none;text-align:center;">'
          + '<input data-in="last" aria-label="Last name" autocomplete="family-name" value="' + esc(st.last) + '" placeholder="LAST NAME" style="width:100%;border:1.5px solid #e2ddd5;border-radius:11px;padding:17px 16px;font:600 16px Mulish;background:#fff;outline:none;text-align:center;"></div>';
      if (st.step === 1)
        html += '<div' + scr + ' style="width:100%;max-width:620px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">' + PROBLEMS.map(optProblem).join('') + '</div>';
      if (st.step === 2)
        html += '<div' + scr + ' style="width:100%;max-width:520px;display:flex;flex-direction:column;gap:11px;">' + URGENCIES.map(optUrg).join('') + '</div>';
      if (st.step === 3)
        html += '<div' + scr + ' style="width:100%;max-width:520px;"><div style="display:flex;align-items:center;justify-content:center;gap:7px;font:700 12px Mulish;color:#8a857c;margin-bottom:14px;"><span style="width:14px;height:14px;border-radius:50%;background:#6FB1DE;display:inline-block;"></span>Central time (' + nowTime() + ')</div><div style="display:flex;flex-direction:column;gap:11px;">' + slots().map(optSlot).join('') + '</div></div>';
      if (st.step === 4)
        html += '<div' + scr + ' style="width:100%;max-width:560px;display:flex;flex-direction:column;gap:12px;">'
          + '<div style="position:relative;"><span style="position:absolute;left:15px;top:50%;transform:translateY(-50%);color:' + RED + ';font-size:18px;">📍</span><input data-in="address" data-address aria-label="Street address and city" autocomplete="street-address" value="' + esc(st.address) + '" placeholder="STREET ADDRESS, CITY" style="width:100%;border:1.5px solid #e2ddd5;border-radius:11px;padding:16px 16px 16px 44px;font:600 16px Mulish;background:#fff;outline:none;"></div>'
          + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div style="position:relative;"><input data-in="zip" inputmode="numeric" maxlength="5" aria-label="ZIP code" value="' + esc(st.zip) + '" placeholder="ZIP CODE" style="width:100%;border:1.5px solid #e2ddd5;border-radius:11px;padding:16px 40px 16px 16px;font:600 16px Mulish;background:#fff;outline:none;">'
          + (zipOk ? '<span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:22px;height:22px;border-radius:50%;background:#4ec97a;color:#fff;display:flex;align-items:center;justify-content:center;font:900 12px Mulish;animation:scPop .3s ease;">✓</span>' : '') + '</div>'
          + '<input data-in="phone" type="tel" inputmode="tel" aria-label="Phone number" autocomplete="tel" value="' + esc(st.phone) + '" placeholder="PHONE" style="width:100%;border:1.5px solid #e2ddd5;border-radius:11px;padding:16px;font:600 16px Mulish;background:#fff;outline:none;"></div>'
          + '<input data-in="email" type="email" aria-label="Email (optional)" autocomplete="email" value="' + esc(st.email) + '" placeholder="EMAIL (OPTIONAL)" style="width:100%;border:1.5px solid #e2ddd5;border-radius:11px;padding:16px;font:600 16px Mulish;background:#fff;outline:none;">'
          + (zipOk ? '<div style="display:flex;align-items:center;justify-content:center;gap:8px;font:700 13px Mulish;color:#2f8a52;"><span style="width:8px;height:8px;border-radius:50%;background:#4ec97a;"></span>You\'re in our service area.</div>' : '')
          + '</div>';

      if (isCta && !done)
        html += '<div style="margin-top:34px;"><button type="button" data-act="next" class="sc-cta"' + (can ? '' : ' disabled') + ' style="' + (can ? A_ON : A_OFF) + '">' + ctaLabel + '</button></div>';

      if (done) {
        var sd = summaryData(st);
        html += '<div' + scr + ' style="width:100%;max-width:440px;"><div style="width:72px;height:72px;border-radius:50%;background:#4ec97a;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;animation:scPop .45s ease;box-shadow:0 12px 30px rgba(78,201,122,.4);"><span style="color:#fff;font:900 36px Mulish;">✓</span></div>'
          + '<h1 style="font:700 32px/1.1 Archivo,sans-serif;color:#2a2620;margin:0 0 8px;letter-spacing:-.01em;">You\'re booked, ' + esc(first || 'friend') + '!</h1>'
          + '<p style="font:400 15px/1.55 Mulish;color:#6a655d;margin:0 0 22px;">I\'ll text a confirmation to <b style="color:#1b1a18;">' + esc(st.phone) + '</b> and call before I head over.</p>'
          + '<div style="background:#F6F4F1;border-radius:16px;padding:18px 22px;text-align:left;"><div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid #e6e1d8;margin-bottom:11px;"><span style="font:900 14px Archivo;color:#1b1a18;">Appointment</span><span style="font:800 11px Mulish;color:#8a857c;background:#fff;padding:5px 10px;border-radius:7px;">' + st._ref + '</span></div>'
          + sd.rows.map(function (r) { return '<div style="display:flex;justify-content:space-between;gap:14px;padding:6px 0;font:600 13.5px Mulish;"><span style="color:#8a857c;">' + r.k + '</span><span style="color:#1b1a18;font-weight:800;text-align:right;">' + esc(r.v) + '</span></div>'; }).join('')
          + '</div><div style="display:flex;gap:11px;margin-top:16px;"><a href="' + TEL + '" style="flex:1;text-align:center;text-decoration:none;border:1.5px solid #d8d2c8;color:#1b1a18;font:800 14px Mulish;padding:14px;border-radius:11px;">Call Dan</a><button type="button" data-act="restart" style="flex:1;cursor:pointer;border:none;background:#141416;color:#fff;font:800 14px Mulish;padding:14px;border-radius:11px;">Book another</button></div></div>';
      }
      html += '</div>';
      if (!done)
        html += '<a href="' + TEL + '" style="flex:none;text-decoration:none;border-top:1px solid #ece7df;padding:13px;display:flex;align-items:center;justify-content:center;gap:8px;font:800 13px Mulish;color:' + RED + ';">📞 Emergency? Call ' + PHONE + '</a>';

      root.innerHTML = html;
    }

    root.addEventListener('click', function (e) {
      var pick = e.target.closest('[data-pick]'); if (pick) { st[pick.getAttribute('data-pick')] = pick.getAttribute('data-id'); render(false); auto(); return; }
      var act = e.target.closest('[data-act]'); if (!act) return;
      var a = act.getAttribute('data-act');
      if (a === 'back') { clearTimeout(autoT); go(st.step - 1); }
      else if (a === 'next') {
        if (!canNext()) return;
        if (st.step === 4) { st._ref = refNum(); submitNetlify('schedule-a', payload('A (Guided)', st)); go(5); }
        else go(st.step + 1);
      } else if (a === 'restart') { clearTimeout(autoT); st = { step: 0, first: '', last: '', problem: null, urgency: null, slot: null, address: '', zip: '', phone: '', email: '' }; render(true); }
    });
    root.addEventListener('input', function (e) {
      var inp = e.target.closest('[data-in]'); if (!inp) return;
      var k = inp.getAttribute('data-in'), was = zip5(st.zip);
      st[k] = k === 'zip' ? digitsOnly(inp.value) : inp.value;
      if (k === 'zip' && zip5(st.zip) !== was) keepFocus(root, function () { render(false); }); // checkmark / service-area line toggles
      else syncCta();
    });
    render(true);
  }

  /* =======================================================================
     VARIANT B — "Fast Track" (dark, 2 steps)
     ======================================================================= */
  var B_ON = 'width:100%;cursor:pointer;border:none;background:' + RED + ';color:#fff;font:800 16px Mulish;padding:17px;border-radius:12px;box-shadow:0 12px 30px rgba(206,63,38,.4)';
  var B_OFF = 'width:100%;border:none;background:#3a2a28;color:#8a6a64;font:800 16px Mulish;padding:17px;border-radius:12px;cursor:not-allowed';
  var BD = 'width:100%;border:1px solid #34343a;border-radius:11px;padding:14px;font:600 15px Mulish;background:#1f1f23;color:#fff;outline:none;'; // dark input
  function initB(root) {
    var st = { step: 'pick', problem: null, slot: null, name: '', phone: '', email: '', address: '', city: '', zip: '' };
    function canBook() { return !!(st.slot && st.name.trim() && phoneOk(st.phone) && st.address.trim() && st.city.trim() && zip5(st.zip)); }
    function syncCta() { var b = root.querySelector('.sc-cta'); if (!b) return; var can = canBook(); b.disabled = !can; b.style.cssText = can ? B_ON : B_OFF; }
    function render(animate) {
      var scr = animate ? ' class="sc-screen"' : '';
      var prob = PROBLEMS.find(function (p) { return p.id === st.problem; });
      var zipOk = zip5(st.zip), can = canBook();
      var html = '<div style="position:absolute;right:-90px;top:-70px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(206,63,38,.22),transparent 70%);pointer-events:none;"></div>';
      html += '<div style="position:relative;flex:none;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:22px 26px;border-bottom:1px solid #26262b;">'
        + '<div style="display:flex;align-items:center;gap:11px;"><img src="/images/favicon.png" alt="" style="width:38px;height:38px;object-fit:contain;"><div style="line-height:1;"><div style="font:900 15px Archivo;color:#fff;letter-spacing:.02em;">FAST TRACK BOOKING</div><div style="font:700 9px Mulish;letter-spacing:.2em;color:#6FB1DE;margin-top:3px;">DMAK\'S HVAC</div></div></div>'
        + '<div style="display:flex;align-items:center;gap:8px;background:#1f1f23;border:1px solid #2e2e34;border-radius:99px;padding:7px 14px;"><span style="width:9px;height:9px;border-radius:50%;background:#4ec97a;animation:scPulse 1.6s infinite;"></span><span style="font:800 11px Mulish;color:#c9c9cd;">NEXT AVAILABLE · <span style="color:#fff;">TODAY 4–6 PM</span></span></div></div>';
      html += '<div style="position:relative;flex:1;padding:28px 26px 22px;">';
      if (st.step === 'pick') {
        html += '<div' + scr + '><h1 style="font:900 40px/.98 Archivo;color:#fff;text-transform:uppercase;letter-spacing:-.01em;margin:0;">What\'s<br><span style="color:' + RED + ';">wrong?</span></h1>'
          + '<p style="font:400 15px Mulish;color:#9b9ba1;margin:12px 0 22px;">Tap it. I\'ll show you the soonest I can be there.</p>'
          + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:11px;">'
          + PROBLEMS.map(function (p) {
            return '<button type="button" data-pickb="' + p.id + '" style="text-align:left;cursor:pointer;background:#1f1f23;border:1px solid #2e2e34;border-radius:14px;padding:17px 16px;font-family:Mulish,sans-serif;display:flex;flex-direction:column;gap:5px;transition:all .15s;"><span style="width:13px;height:13px;border-radius:50%;background:' + p.accent + ';"></span><span style="font:800 16px Mulish;color:#fff;margin-top:4px;">' + esc(p.bLabel) + '</span><span style="font:500 12.5px Mulish;color:#8a8a90;">' + esc(p.bSub) + '</span></button>';
          }).join('') + '</div></div>';
      } else if (st.step === 'book') {
        html += '<div' + scr + '><button type="button" data-act="back" style="cursor:pointer;border:none;background:none;color:#8a8a90;font:800 13px Mulish;padding:0 0 12px;display:inline-flex;align-items:center;gap:5px;">← Change</button>'
          + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;"><span style="width:12px;height:12px;border-radius:50%;background:' + (prob ? prob.accent : RED) + ';flex:none;"></span><span style="font:900 24px Archivo;color:#fff;">' + esc(prob ? prob.bLabel : '') + '</span></div>'
          + '<div style="font:800 11px Mulish;letter-spacing:.14em;color:#6FB1DE;margin-bottom:10px;">PICK A TIME</div>'
          + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px;margin-bottom:22px;">'
          + slots().map(function (s) {
            var active = st.slot === s.id;
            return '<button type="button" data-pickslot="' + s.id + '" style="position:relative;text-align:left;cursor:pointer;background:' + (active ? 'rgba(206,63,38,.14)' : '#1f1f23') + ';border:1.5px solid ' + (active ? RED : '#2e2e34') + ';border-radius:12px;padding:12px 14px;font-family:Mulish,sans-serif;"><div style="font:800 14px Mulish;color:#fff;">' + esc(s.day) + '</div><div style="font:600 12px Mulish;color:#9b9ba1;">' + esc(s.wShort) + '</div>' + (s.fastest ? '<div style="font:800 10px Mulish;color:' + RED + ';margin-top:4px;">⚡ FASTEST</div>' : '') + '</button>';
          }).join('') + '</div>'
          + '<div style="font:800 11px Mulish;letter-spacing:.14em;color:#6FB1DE;margin-bottom:10px;">YOUR DETAILS</div>'
          + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;"><input data-in="name" aria-label="Full name" value="' + esc(st.name) + '" placeholder="Full name" autocomplete="name" style="' + BD + '"><input data-in="phone" type="tel" inputmode="tel" aria-label="Phone number" value="' + esc(st.phone) + '" placeholder="Phone" autocomplete="tel" style="' + BD + '"></div>'
          + '<input data-in="email" type="email" aria-label="Email (optional)" value="' + esc(st.email) + '" placeholder="Email (optional)" autocomplete="email" style="' + BD + 'margin-top:9px;">'
          + '<input data-in="address" data-address aria-label="Street address" value="' + esc(st.address) + '" placeholder="Street address" autocomplete="street-address" style="' + BD + 'margin-top:9px;">'
          + '<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:9px;margin-top:9px;"><input data-in="city" list="sc-towns" aria-label="City" value="' + esc(st.city) + '" placeholder="City" autocomplete="address-level2" style="' + BD + '"><div style="position:relative;"><input data-in="zip" inputmode="numeric" maxlength="5" aria-label="ZIP code" value="' + esc(st.zip) + '" placeholder="ZIP" style="' + BD + 'padding-right:42px;">' + (zipOk ? '<span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:22px;height:22px;border-radius:50%;background:#4ec97a;color:#fff;display:flex;align-items:center;justify-content:center;font:900 12px Mulish;animation:scPop .3s ease;">✓</span>' : '') + '</div></div>'
          + '<datalist id="sc-towns">' + TOWNS.map(function (t) { return '<option value="' + t + '"></option>'; }).join('') + '</datalist>'
          + '<div style="margin-top:22px;"><button type="button" data-act="book" class="sc-cta"' + (can ? '' : ' disabled') + ' style="' + (can ? B_ON : B_OFF) + '">Book my visit →</button></div></div>';
      } else {
        var sd = summaryData(st);
        var firstName = (st.name.trim().split(' ')[0]) || 'friend';
        html += '<div' + scr + ' style="text-align:center;max-width:420px;margin:0 auto;padding-top:6px;"><div style="width:70px;height:70px;border-radius:50%;background:#4ec97a;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;animation:scPop .45s ease;box-shadow:0 12px 30px rgba(78,201,122,.4);"><span style="color:#fff;font:900 35px Mulish;">✓</span></div>'
          + '<h1 style="font:900 30px/1.02 Archivo;color:#fff;text-transform:uppercase;margin:0 0 8px;">You\'re booked, ' + esc(firstName) + '!</h1>'
          + '<p style="font:400 14.5px/1.55 Mulish;color:#9b9ba1;margin:0 0 20px;">I\'ll text <b style="color:#fff;">' + esc(st.phone) + '</b> to confirm and call before I head over.</p>'
          + '<div style="background:#1f1f23;border:1px solid #2e2e34;border-radius:16px;padding:18px 20px;text-align:left;">'
          + [{ k: 'Service', v: sd.prob ? sd.prob.bLabel : '—' }, { k: 'When', v: sd.slot ? (sd.slot.day + ' · ' + sd.slot.wShort) : '—' }, { k: 'Where', v: (st.address ? st.address + ', ' : '') + (st.city || '') + (st.zip ? ' ' + st.zip : '') }].map(function (r) { return '<div style="display:flex;justify-content:space-between;gap:14px;padding:6px 0;font:600 13.5px Mulish;"><span style="color:#8a8a90;">' + r.k + '</span><span style="color:#fff;font-weight:800;text-align:right;">' + esc(r.v) + '</span></div>'; }).join('')
          + '</div><div style="display:flex;gap:10px;margin-top:16px;"><a href="' + TEL + '" style="flex:1;text-align:center;text-decoration:none;border:1.5px solid #34343a;color:#fff;font:800 14px Mulish;padding:14px;border-radius:11px;">Call Dan</a><button type="button" data-act="restart" style="flex:1;cursor:pointer;border:none;background:#fff;color:#141416;font:800 14px Mulish;padding:14px;border-radius:11px;">Book another</button></div></div>';
      }
      html += '</div>';
      if (st.step !== 'done')
        html += '<a href="' + TEL + '" style="position:relative;flex:none;text-decoration:none;border-top:1px solid #26262b;padding:13px;display:flex;align-items:center;justify-content:center;gap:8px;font:800 13px Mulish;color:' + RED + ';">📞 Emergency? Call ' + PHONE + '</a>';
      root.innerHTML = html;
    }
    root.addEventListener('click', function (e) {
      var p = e.target.closest('[data-pickb]'); if (p) { st.problem = p.getAttribute('data-pickb'); st.step = 'book'; render(true); return; }
      var s = e.target.closest('[data-pickslot]'); if (s) { st.slot = s.getAttribute('data-pickslot'); render(false); return; }
      var act = e.target.closest('[data-act]'); if (!act) return;
      var a = act.getAttribute('data-act');
      if (a === 'back') { st.step = 'pick'; render(true); }
      else if (a === 'book') { if (!canBook()) return; st._ref = refNum(); submitNetlify('schedule-b', payload('B (Fast Track)', st)); st.step = 'done'; render(true); }
      else if (a === 'restart') { st = { step: 'pick', problem: null, slot: null, name: '', phone: '', email: '', address: '', city: '', zip: '' }; render(true); }
    });
    root.addEventListener('input', function (e) {
      var inp = e.target.closest('[data-in]'); if (!inp) return;
      var k = inp.getAttribute('data-in'), was = zip5(st.zip);
      st[k] = k === 'zip' ? digitsOnly(inp.value) : inp.value;
      if (k === 'zip' && zip5(st.zip) !== was) keepFocus(root, function () { render(false); });
      else syncCta();
    });
    render(true);
  }

  /* =======================================================================
     VARIANT C — "Chat" (light, chat thread, 5 steps)
     ======================================================================= */
  var C_ON = 'width:100%;cursor:pointer;border:none;background:' + RED + ';color:#fff;font:800 15px Mulish;padding:14px;border-radius:12px;margin-top:13px;box-shadow:0 10px 24px rgba(206,63,38,.3)';
  var C_OFF = 'width:100%;border:none;background:#f0b7ac;color:#fff;font:800 15px Mulish;padding:14px;border-radius:12px;margin-top:13px;cursor:not-allowed';
  function initC(root) {
    var st = { step: 0, typing: true, problem: null, urgency: null, zip: '', address: '', city: '', slot: null, name: '', phone: '', email: '', textOk: false };
    var typeT, autoT, thread;
    function canNext() { if (st.step === 2) return zip5(st.zip); if (st.step === 4) return !!(st.name.trim() && phoneOk(st.phone)); return false; }
    function syncCta() { var b = root.querySelector('.sc-cta'); if (!b) return; var can = canNext(); b.disabled = !can; b.style.cssText = can ? C_ON : C_OFF; }
    function startTyping() { clearTimeout(typeT); st.typing = true; render(true); typeT = setTimeout(function () { st.typing = false; render(true); }, 650); }
    function go(n) { st.step = Math.max(0, Math.min(n, 5)); startTyping(); }
    function auto() { clearTimeout(autoT); autoT = setTimeout(function () { go(st.step + 1); }, 430); }

    function chatMsgs() {
      var prob = PROBLEMS.find(function (p) { return p.id === st.problem; });
      var urg = URGENCIES.find(function (u) { return u.id === st.urgency; });
      var s = slots().find(function (x) { return x.id === st.slot; });
      var zipOk = zip5(st.zip);
      var first = (st.name.trim().split(' ')[0]) || '';
      var m = [];
      m.push({ t: 'bot', text: "Hey, I'm Dan. Real person, not a call center. Let's get you booked in about a minute." });
      m.push({ t: 'bot', text: "First up, what's going on?" });
      if (prob) { m.push({ t: 'user', text: prob.label }); m.push({ t: 'bot', text: prob.reply }); }
      if (st.step >= 1) { m.push({ t: 'bot', text: 'How soon do you need us?' }); if (urg) { m.push({ t: 'user', text: urg.label }); m.push({ t: 'bot', text: urg.reply }); } }
      if (st.step >= 2) { m.push({ t: 'bot', text: 'Where are you? A zip gets us started.' }); if (zipOk) { m.push({ t: 'user', text: st.zip }); m.push({ t: 'bot', text: "Perfect, that's right in our area." }); } }
      if (st.step >= 3) { m.push({ t: 'bot', text: "Here's the soonest I can swing by." }); if (s) { m.push({ t: 'user', text: s.short }); m.push({ t: 'bot', text: 'Locked in.' }); } }
      if (st.step >= 4) { m.push({ t: 'bot', text: 'Last thing, how do I reach you?' }); if (st.name.trim() && st.phone.trim()) { m.push({ t: 'user', text: st.name }); m.push({ t: 'bot', text: 'Thanks, ' + first + '. Almost done.' }); } }
      if (st.step >= 5) { m.push({ t: 'bot', text: "You're all set. See you soon!" }); }
      if (st.typing && st.step < 5) m.push({ t: 'typing' });
      return m;
    }
    function bubble(m, animate) {
      var c = animate ? ' class="sc-in"' : '';
      if (m.t === 'typing') return '<div class="sc-in" style="align-self:flex-start;background:#eae4da;border-radius:15px 15px 15px 5px;padding:14px 16px;display:flex;gap:5px;"><span style="width:7px;height:7px;border-radius:50%;background:#a7a29a;animation:scDot 1s infinite;"></span><span style="width:7px;height:7px;border-radius:50%;background:#a7a29a;animation:scDot 1s infinite .15s;"></span><span style="width:7px;height:7px;border-radius:50%;background:#a7a29a;animation:scDot 1s infinite .3s;"></span></div>';
      if (m.t === 'bot') return '<div' + c + ' style="align-self:flex-start;max-width:82%;background:#eae4da;color:#2a2620;border-radius:15px 15px 15px 5px;padding:12px 15px;font:500 15px/1.5 Mulish;">' + esc(m.text) + '</div>';
      return '<div' + c + ' style="align-self:flex-end;max-width:82%;background:' + RED + ';color:#fff;border-radius:15px 15px 5px 15px;padding:12px 15px;font:700 15px/1.45 Mulish;">' + esc(m.text) + '</div>';
    }
    function controls(animate) {
      if (st.step >= 5 || st.typing) return '';
      var c = animate ? ' class="sc-in"' : '';
      var zipOk = zip5(st.zip);
      var h = '<div' + c + ' style="align-self:stretch;margin-top:3px;">';
      if (st.step > 0) h += '<button type="button" data-act="back" style="cursor:pointer;border:none;background:none;color:#8a857c;font:800 13px Mulish;padding:0 0 9px;display:inline-flex;align-items:center;gap:5px;">← Back</button>';
      if (st.step === 0)
        h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:9px;">' + PROBLEMS.map(function (p) {
          var active = st.problem === p.id;
          return '<button type="button" data-pick="problem" data-id="' + p.id + '" style="position:relative;text-align:left;cursor:pointer;background:#fff;border:1.5px solid ' + (active ? RED : '#e6e1d8') + ';border-radius:13px;padding:13px 14px;font-family:Mulish,sans-serif;display:flex;flex-direction:column;gap:3px;">' + (active ? '<span style="position:absolute;inset:0;border:2px solid ' + RED + ';border-radius:13px;background:rgba(206,63,38,.05);pointer-events:none;"></span>' : '') + '<span style="display:flex;align-items:center;gap:8px;"><span style="width:10px;height:10px;border-radius:50%;background:' + p.accent + ';flex:none;"></span><span style="font:800 14.5px Mulish;color:#1b1a18;">' + esc(p.label) + '</span></span><span style="font:500 12px Mulish;color:#8a857c;padding-left:18px;">' + esc(p.sub) + '</span></button>';
        }).join('') + '</div>';
      if (st.step === 1)
        h += '<div style="display:flex;flex-direction:column;gap:9px;">' + URGENCIES.map(function (u) {
          var active = st.urgency === u.id;
          return '<button type="button" data-pick="urgency" data-id="' + u.id + '" style="position:relative;text-align:left;cursor:pointer;background:#fff;border:1.5px solid ' + (active ? RED : '#e6e1d8') + ';border-radius:12px;padding:13px 15px;font-family:Mulish,sans-serif;display:flex;align-items:center;justify-content:space-between;gap:10px;">' + (active ? '<span style="position:absolute;inset:0;border:2px solid ' + RED + ';border-radius:12px;background:rgba(206,63,38,.05);pointer-events:none;"></span>' : '') + '<span style="display:flex;flex-direction:column;gap:1px;"><span style="font:800 15px Mulish;color:#1b1a18;">' + esc(u.label) + '</span><span style="font:500 12px Mulish;color:#8a857c;">' + esc(u.sub) + '</span></span><span style="font:800 11px Mulish;color:' + u.accent + ';background:' + u.tagBg + ';padding:5px 10px;border-radius:99px;white-space:nowrap;">' + esc(u.tag) + '</span></button>';
        }).join('') + '</div>';
      if (st.step === 2) {
        h += '<div style="position:relative;margin-bottom:9px;"><input data-in="zip" inputmode="numeric" maxlength="5" aria-label="ZIP code" value="' + esc(st.zip) + '" placeholder="ZIP code" style="width:100%;border:1.5px solid #e2ddd5;border-radius:11px;padding:14px 44px 14px 15px;font:600 16px Mulish;background:#fff;outline:none;">' + (zipOk ? '<span style="position:absolute;right:13px;top:50%;transform:translateY(-50%);width:24px;height:24px;border-radius:50%;background:#4ec97a;color:#fff;display:flex;align-items:center;justify-content:center;font:900 13px Mulish;animation:scPop .3s ease;">✓</span>' : '') + '</div>';
        if (zipOk) h += '<div style="display:flex;align-items:center;gap:8px;font:700 13px Mulish;color:#2f8a52;margin-bottom:11px;"><span style="width:8px;height:8px;border-radius:50%;background:#4ec97a;"></span>You\'re in our service area.</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;"><input data-in="address" data-address aria-label="Street address" autocomplete="street-address" value="' + esc(st.address) + '" placeholder="Street address" style="width:100%;border:1.5px solid #e2ddd5;border-radius:11px;padding:12px 14px;font:500 16px Mulish;background:#fff;outline:none;"><input data-in="city" list="sc-towns" aria-label="City" autocomplete="address-level2" value="' + esc(st.city) + '" placeholder="City" style="width:100%;border:1.5px solid #e2ddd5;border-radius:11px;padding:12px 14px;font:500 16px Mulish;background:#fff;outline:none;"></div><datalist id="sc-towns">' + TOWNS.map(function (t) { return '<option value="' + t + '"></option>'; }).join('') + '</datalist>';
      }
      if (st.step === 3)
        h += '<div style="display:flex;align-items:center;gap:7px;font:700 11.5px Mulish;color:#8a857c;margin-bottom:9px;"><span style="width:14px;height:14px;border-radius:50%;background:#6FB1DE;display:inline-block;"></span>Central time (' + nowTime() + ')</div><div style="display:flex;flex-direction:column;gap:9px;">' + slots().map(function (s) {
          var active = st.slot === s.id;
          return '<button type="button" data-pick="slot" data-id="' + s.id + '" style="position:relative;text-align:left;cursor:pointer;background:#fff;border:1.5px solid ' + (active ? RED : '#e6e1d8') + ';border-radius:12px;padding:13px 15px;font-family:Mulish,sans-serif;display:flex;align-items:center;justify-content:space-between;gap:10px;">' + (active ? '<span style="position:absolute;inset:0;border:2px solid ' + RED + ';border-radius:12px;background:rgba(206,63,38,.05);pointer-events:none;"></span>' : '') + '<span style="display:flex;align-items:center;gap:12px;"><span style="width:20px;height:20px;border-radius:50%;border:2px solid ' + (active ? RED : '#c9c3b8') + ';display:flex;align-items:center;justify-content:center;flex:none;"><span style="width:10px;height:10px;border-radius:50%;background:' + (active ? RED : 'transparent') + ';"></span></span><span style="display:flex;flex-direction:column;gap:1px;"><span style="font:800 15px Mulish;color:#1b1a18;">' + esc(s.day) + '</span><span style="font:600 12.5px Mulish;color:#6a655d;">' + esc(s.window) + '</span></span></span>' + (s.fastest ? '<span style="font:800 11px Mulish;color:' + RED + ';background:rgba(206,63,38,.1);padding:5px 10px;border-radius:99px;white-space:nowrap;">⚡ Fastest</span>' : '') + '</button>';
        }).join('') + '</div>';
      if (st.step === 4) {
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;"><input data-in="name" aria-label="Your name" autocomplete="name" value="' + esc(st.name) + '" placeholder="Your name" style="width:100%;border:1.5px solid #e2ddd5;border-radius:11px;padding:13px 14px;font:500 16px Mulish;background:#fff;outline:none;"><input data-in="phone" type="tel" inputmode="tel" aria-label="Phone number" autocomplete="tel" value="' + esc(st.phone) + '" placeholder="Phone" style="width:100%;border:1.5px solid #e2ddd5;border-radius:11px;padding:13px 14px;font:500 16px Mulish;background:#fff;outline:none;"></div>'
          + '<input data-in="email" type="email" aria-label="Email (optional)" autocomplete="email" value="' + esc(st.email) + '" placeholder="Email (optional)" style="width:100%;border:1.5px solid #e2ddd5;border-radius:11px;padding:13px 14px;font:500 16px Mulish;background:#fff;outline:none;margin-top:9px;">'
          + '<label data-act="toggleText" style="display:flex;align-items:center;gap:10px;cursor:pointer;font:600 13.5px Mulish;color:#3a352e;margin-top:13px;"><span style="width:21px;height:21px;border-radius:6px;border:2px solid ' + (st.textOk ? RED : '#c9c3b8') + ';background:' + (st.textOk ? RED : '#fff') + ';display:flex;align-items:center;justify-content:center;color:#fff;font:900 11px Mulish;flex:none;">' + (st.textOk ? '✓' : '') + '</span>Text me appointment updates</label>';
      }
      if (st.step === 2 || st.step === 4) {
        var can = canNext(), label = st.step === 4 ? 'Book it →' : 'Continue';
        h += '<button type="button" data-act="next" class="sc-cta"' + (can ? '' : ' disabled') + ' style="' + (can ? C_ON : C_OFF) + '">' + label + '</button>';
      }
      return h + '</div>';
    }
    function doneBlock() {
      var sd = summaryData(st);
      var first = (st.name.trim().split(' ')[0]) || 'friend';
      return '<div class="sc-in" style="align-self:stretch;text-align:center;padding:8px 0 4px;"><div style="width:66px;height:66px;border-radius:50%;background:#4ec97a;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;animation:scPop .45s ease;box-shadow:0 12px 30px rgba(78,201,122,.4);"><span style="color:#fff;font:900 34px Mulish;">✓</span></div><h2 style="font:900 28px/1.05 Archivo,sans-serif;margin:0 0 7px;letter-spacing:-.01em;">You\'re booked, ' + esc(first) + '!</h2><p style="font:400 14.5px/1.55 Mulish;color:#6a655d;margin:0 auto 18px;max-width:380px;">I\'ll text a confirmation to <b style="color:#1b1a18;">' + esc(st.phone) + '</b> and call before I head over.</p></div>'
        + '<div class="sc-in" style="align-self:stretch;background:#fff;border:1.5px solid #e6e1d8;border-radius:15px;padding:18px 20px;"><div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid #efe9df;margin-bottom:11px;"><span style="font:900 14px Archivo;">Appointment</span><span style="font:700 11px \'Spline Sans Mono\',monospace;color:#8a857c;background:#F6F4F1;padding:5px 10px;border-radius:7px;">' + st._ref + '</span></div>'
        + sd.rows.map(function (r) { return '<div style="display:flex;justify-content:space-between;gap:14px;padding:6px 0;font:600 13.5px Mulish;"><span style="color:#8a857c;">' + r.k + '</span><span style="color:#1b1a18;font-weight:800;text-align:right;">' + esc(r.v) + '</span></div>'; }).join('')
        + '</div><div style="display:flex;gap:10px;margin-top:14px;"><a href="' + TEL + '" style="flex:1;text-align:center;text-decoration:none;border:1.5px solid #d8d2c8;color:#1b1a18;font:800 14px Mulish;padding:13px;border-radius:11px;">Call Dan</a><button type="button" data-act="restart" style="flex:1;cursor:pointer;border:none;background:#141416;color:#fff;font:800 14px Mulish;padding:13px;border-radius:11px;">Book another</button></div>';
    }
    function render(animate) {
      var bars = [0, 1, 2, 3, 4].map(function (i) { return '<span style="flex:1;height:4px;border-radius:99px;background:' + (i <= st.step ? RED : '#3a3a40') + ';transition:background .3s;"></span>'; }).join('');
      var html = '<div style="background:#141416;padding:16px 18px 0;flex:none;"><div style="display:flex;align-items:center;gap:12px;padding-bottom:14px;">'
        + '<div style="position:relative;flex:none;"><div style="width:44px;height:44px;border-radius:50%;background:' + RED + ';display:flex;align-items:center;justify-content:center;overflow:hidden;"><img src="/images/favicon.png" alt="Dan" style="width:32px;height:32px;object-fit:contain;"></div><span style="position:absolute;right:-1px;bottom:-1px;width:12px;height:12px;border-radius:50%;background:#4ec97a;border:2.5px solid #141416;"></span></div>'
        + '<div style="line-height:1.15;flex:1;min-width:0;"><div style="font:800 16px Archivo,sans-serif;color:#fff;">Dan · DMAK\'S HVAC</div><div style="font:700 11px Mulish;color:#4ec97a;margin-top:3px;">Online now · replies in seconds</div></div>'
        + '<div style="text-align:right;flex:none;"><div style="font:900 15px Archivo;color:' + ORANGE + ';">5.0★</div><div style="font:700 9px Mulish;letter-spacing:.08em;color:#8a8a90;">95+ REVIEWS</div></div></div>'
        + (st.step < 5 ? '<div style="display:flex;gap:5px;padding-bottom:14px;">' + bars + '</div>' : '') + '</div>';

      html += '<div class="sc-thread" data-thread style="flex:1;overflow-y:auto;padding:20px 18px 8px;display:flex;flex-direction:column;gap:11px;">';
      html += chatMsgs().map(function (m) { return bubble(m, animate); }).join('');
      html += controls(animate);
      if (st.step >= 5) html += doneBlock();
      html += '</div>';
      if (st.step < 5) html += '<a href="' + TEL + '" style="flex:none;text-decoration:none;background:#fff;border-top:1px solid #e6e1d8;padding:13px 18px;display:flex;align-items:center;justify-content:center;gap:8px;font:800 13.5px Mulish;color:' + RED + ';">📞 Emergency? Call ' + PHONE + '</a>';

      root.innerHTML = html;
      thread = root.querySelector('[data-thread]'); if (thread) thread.scrollTop = thread.scrollHeight;
    }
    root.addEventListener('click', function (e) {
      var pick = e.target.closest('[data-pick]'); if (pick) { st[pick.getAttribute('data-pick')] = pick.getAttribute('data-id'); render(false); auto(); return; }
      var act = e.target.closest('[data-act]'); if (!act) return;
      var a = act.getAttribute('data-act');
      if (a === 'back') { clearTimeout(autoT); go(st.step - 1); }
      else if (a === 'toggleText') { st.textOk = !st.textOk; keepFocus(root, function () { render(false); }); }
      else if (a === 'next') {
        if (!canNext()) return;
        if (st.step === 4) { st._ref = refNum(); submitNetlify('schedule-c', payload('C (Chat)', st)); go(5); }
        else go(st.step + 1);
      } else if (a === 'restart') { clearTimeout(autoT); clearTimeout(typeT); st = { step: 0, typing: true, problem: null, urgency: null, zip: '', address: '', city: '', slot: null, name: '', phone: '', email: '', textOk: false }; startTyping(); }
    });
    root.addEventListener('input', function (e) {
      var inp = e.target.closest('[data-in]'); if (!inp) return;
      var k = inp.getAttribute('data-in'), was = zip5(st.zip);
      st[k] = k === 'zip' ? digitsOnly(inp.value) : inp.value;
      if (k === 'zip' && zip5(st.zip) !== was) keepFocus(root, function () { render(false); }); // reveals address/city + service-area line
      else syncCta();
    });
    startTyping();
  }

  // ---- dispatch ----
  function boot() {
    document.querySelectorAll('[data-scheduler]').forEach(function (root) {
      var v = root.getAttribute('data-scheduler');
      if (v === 'a') initA(root); else if (v === 'b') initB(root); else if (v === 'c') initC(root);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
