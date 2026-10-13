// DMAK'S HVAC — interactive "Problem Solver" triage widget
(function () {
  var SYM = {
    cool:    { accent:'#2E76AE', tag:'Same-day priority',   go:'cooling',     goName:'AC repair',
      diag:'Most likely low refrigerant, a worn capacitor, or blocked airflow. We stock common parts on the truck and fix the majority of cooling calls the same day.' },
    heat:    { accent:'#CE3F26', tag:'Emergency service',   go:'heating',     goName:'heating repair',
      diag:"Could be the igniter, a tripped safety switch, or the thermostat. We'll get heat back fast — nobody should wait out a cold night." },
    noise:   { accent:'#CE3F26', tag:"Don't wait on this",  go:'heating',     goName:'heating repair',
      diag:"A bang, buzz, or burning smell means shut it down and call. We'll find the cause before it turns into a much bigger repair." },
    bills:   { accent:'#E0823F', tag:'Free efficiency check',go:'maintenance', goName:'tune-ups',
      diag:"An aging or wrong-sized system quietly burns money every month. We'll measure real efficiency and tell you straight — repair or replace." },
    install: { accent:'#E0823F', tag:'Free in-home estimate',go:'installs',    goName:'system installs',
      diag:'A new system, sized right for your home and installed clean. Free in-home estimate with an honest recommendation and zero pressure.' },
    maint:   { accent:'#2E76AE', tag:'Book anytime',        go:'maintenance', goName:'maintenance',
      diag:'A seasonal tune-up keeps things running, protects your warranty, and catches small issues early. Best booked just before peak season.' }
  };

  // Maps a solver symptom to the matching option in the quote form's "problem" select
  var PROBLEM = { cool:"AC isn't cooling", heat:'No heat', noise:'Strange noise or smell',
    bills:'High energy bills', install:'New system / replacement', maint:'Tune-up & maintenance' };
  var currentSym = 'cool';

  function select(id) {
    var s = SYM[id]; if (!s) return;
    currentSym = id;
    document.querySelectorAll('.sym').forEach(function (b) {
      var on = b.getAttribute('data-sym') === id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    var tag = document.querySelector('.sv-tag');
    var diag = document.querySelector('.sv-diag');
    var learn = document.querySelector('.sv-learn');
    var result = document.querySelector('.sv-result');
    if (tag) { tag.textContent = s.tag; tag.style.background = s.accent; }
    if (diag) diag.textContent = s.diag;
    if (learn) { learn.setAttribute('href', '/services/' + s.go + '/'); learn.textContent = 'See ' + s.goName + ' →'; }
    if (result) { result.style.animation = 'none'; result.offsetHeight; result.style.animation = ''; }
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Mobile menu: hamburger opens the full nav; Escape or a wider screen closes it
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.getElementById('mobile-menu');
    if (toggle && menu) {
      var setOpen = function (open) {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menu.hidden = !open;
        document.body.classList.toggle('menu-open', open);
      };
      toggle.addEventListener('click', function () { setOpen(menu.hidden); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !menu.hidden) { setOpen(false); toggle.focus(); }
      });
      window.matchMedia('(min-width:861px)').addEventListener('change', function (m) { if (m.matches) setOpen(false); });
    }

    // GA4: a quote/booking form that passed validation counts as a lead (gtag is set up in <head>)
    document.querySelectorAll('form[name="quote"], form[name="schedule"]').forEach(function (f) {
      f.addEventListener('submit', function () {
        if (window.gtag) gtag('event', 'generate_lead', { form_name: f.getAttribute('name'), page_location: location.href });
      });
    });

    // Schedule page: preferred-day picker can't be in the past
    document.querySelectorAll('input[type=date][data-min-today]').forEach(function (i) {
      var d = new Date();
      i.min = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    });

    // The solver's "Get a free quote" link carries the tapped symptom into the home form
    document.querySelectorAll('.solver a[href="#quote"]').forEach(function (a) {
      a.addEventListener('click', function () {
        var sel = document.querySelector('#quote select[name=problem]');
        if (sel && PROBLEM[currentSym]) sel.value = PROBLEM[currentSym];
      });
    });

    var buttons = document.querySelectorAll('.sym');
    if (!buttons.length) return;
    var result = document.querySelector('.sv-result');
    var grid = document.querySelector('.sv-grid');
    var phone = window.matchMedia('(max-width:860px)');
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (result && !result.id) result.id = 'sv-result';

    // Phones: accordion. Nothing preselected; the answer opens right under the row
    // that was tapped, and the page nudges down if the answer would land off-screen.
    // Desktop: original layout, answer panel under the grid with "AC" preselected.
    function setAria() {
      buttons.forEach(function (b) {
        var on = b.classList.contains('active') && result && !result.hidden;
        if (phone.matches) {
          b.removeAttribute('aria-pressed');
          b.setAttribute('aria-expanded', String(on));
          b.setAttribute('aria-controls', result ? result.id : '');
        } else {
          b.removeAttribute('aria-expanded');
          b.removeAttribute('aria-controls');
          b.setAttribute('aria-pressed', String(b.classList.contains('active')));
        }
      });
    }
    function collapse() {
      buttons.forEach(function (b) { b.classList.remove('active'); });
      if (result) result.hidden = true;
      setAria();
    }
    function layout() {
      if (!result || !grid) return;
      if (phone.matches) {
        collapse();
      } else {
        grid.insertAdjacentElement('afterend', result);
        result.hidden = false;
        var a = document.querySelector('.sym.active');
        select(a ? a.getAttribute('data-sym') : 'cool');
        setAria();
      }
    }
    // Opening/closing the answer changes the height of the list. Browser scroll anchoring
    // would "fix" that by jumping the page, so turn it off for the change and instead keep
    // the tapped row exactly where the finger was.
    function keepPlace(b, change) {
      var root = document.documentElement;
      var before = b.getBoundingClientRect().top;
      root.style.overflowAnchor = 'none';
      change();
      var shift = b.getBoundingClientRect().top - before;
      if (shift) window.scrollBy({ top: shift, behavior: 'instant' });
      requestAnimationFrame(function () { requestAnimationFrame(function () { root.style.overflowAnchor = ''; }); });
    }
    function reveal(b) {
      requestAnimationFrame(function () {
        var r = result.getBoundingClientRect();
        var need = r.bottom - window.innerHeight + 16;
        var room = b.getBoundingClientRect().top - 90; // keep the tapped row below the sticky header
        var by = Math.min(need, room);
        if (by > 0) window.scrollBy({ top: by, behavior: calm.matches ? 'auto' : 'smooth' });
      });
    }
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-sym');
        if (phone.matches && result) {
          if (b.classList.contains('active') && !result.hidden) { keepPlace(b, collapse); return; }
          keepPlace(b, function () {
            select(id);
            b.insertAdjacentElement('afterend', result);
            result.hidden = false;
            setAria();
          });
          reveal(b);
        } else {
          select(id);
          setAria();
        }
      });
    });
    layout();
    phone.addEventListener('change', layout);
  });
})();
