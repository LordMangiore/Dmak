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

  function select(id) {
    var s = SYM[id]; if (!s) return;
    document.querySelectorAll('.sym').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-sym') === id);
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
    var buttons = document.querySelectorAll('.sym');
    if (!buttons.length) return;
    buttons.forEach(function (b) {
      b.addEventListener('click', function () { select(b.getAttribute('data-sym')); });
    });
    var active = document.querySelector('.sym.active');
    select(active ? active.getAttribute('data-sym') : 'cool');
  });
})();
