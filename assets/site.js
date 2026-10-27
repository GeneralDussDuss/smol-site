/* smol site — house interactions. Same moves as the Orpheus site: nav + progress,
   letter-by-letter title, typed tagline, rotating status, reveals, counters,
   scrambled headings, tilt, ⌘K palette, copy buttons, mobile nav. No network. */
(function () {
  'use strict';
  var h = document.documentElement, calm = h.classList.contains('is-calm'), still = /[?&]still=1/.test(location.search);
  if (still) h.classList.add('is-still');

  /* nav + progress */
  var nav = document.querySelector('.nav'), prog = document.querySelector('.prog');
  function onScroll() {
    var y = window.scrollY || 0;
    if (nav) nav.classList.toggle('scrolled', y > 24);
    if (prog) { var d = document.documentElement, m = d.scrollHeight - d.clientHeight; prog.style.width = (m > 0 ? y / m * 100 : 0) + '%'; }
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var burger = document.querySelector('.nav-burger');
  if (burger) burger.addEventListener('click', function () { var o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', String(o)); });

  /* hero title letters */
  var h1 = document.querySelector('h1[data-letters]');
  if (h1) {
    var text = h1.textContent, out = '';
    for (var i = 0; i < text.length; i++) out += '<span class="' + (text[i] === '_' ? 'u' : '') + '" style="--d:' + (i * 90 + 100) + 'ms">' + text[i] + '</span>';
    h1.innerHTML = out;
    if (!calm) setTimeout(function () { h1.classList.add('glitching'); }, 2200);
  }

  /* typed tagline */
  var typed = document.querySelector('.typed[data-type]');
  if (typed) {
    var full = typed.getAttribute('data-type');
    if (calm || still) typed.textContent = full;
    else { var n = 0; typed.innerHTML = '<span class="cur">▍</span>'; var tick = function () { n++; typed.innerHTML = full.slice(0, n) + '<span class="cur">▍</span>'; if (n < full.length) setTimeout(tick, 34 + Math.random() * 40); }; setTimeout(tick, 900); }
  }

  /* rotating status line */
  var rot = document.querySelector('.rot[data-rot]');
  if (rot) {
    var lines = JSON.parse(rot.getAttribute('data-rot')), ri = 0;
    rot.textContent = lines[0];
    if (!calm && !still) setInterval(function () { rot.style.opacity = 0; setTimeout(function () { ri = (ri + 1) % lines.length; rot.textContent = lines[ri]; rot.style.opacity = 1; }, 400); }, 3400);
  }

  /* reveal */
  var reveals = document.querySelectorAll('.reveal');
  if (calm || still || !('IntersectionObserver' in window)) { for (var r = 0; r < reveals.length; r++) reveals[r].classList.add('visible'); }
  else {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting) return; var el = e.target, st = +el.getAttribute('data-stagger') || 0;
      if (st) { var kids = el.children; for (var k = 0; k < kids.length; k++) { kids[k].style.transitionDelay = (k * st) + 'ms'; } }
      el.classList.add('visible'); io.unobserve(el); }); }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    for (var r2 = 0; r2 < reveals.length; r2++) io.observe(reveals[r2]);
  }

  /* counters */
  function countUp(el) { var to = +el.getAttribute('data-count'), suf = el.getAttribute('data-suffix') || '', t0 = null;
    if (calm || still) { el.textContent = to + suf; return; }
    function step(now) { if (!t0) t0 = now; var p = Math.min(1, (now - t0) / 1400), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(to * e) + suf; if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step); }
  var counts = document.querySelectorAll('[data-count]');
  if (counts.length) { if ('IntersectionObserver' in window && !calm && !still) { var cio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } }); }, { threshold: .4 }); for (var c = 0; c < counts.length; c++) cio.observe(counts[c]); } else for (var c2 = 0; c2 < counts.length; c2++) countUp(counts[c2]); }

  /* scramble headings once */
  var scr = document.querySelectorAll('[data-scramble]');
  if (!calm && !still && 'IntersectionObserver' in window) {
    var chars = '▚▞░▒▓#%&@$*+=-';
    var sio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting) return; var el = e.target, fin = el.textContent, f = 0; sio.unobserve(el);
      var iv = setInterval(function () { f++; var s = ''; for (var i = 0; i < fin.length; i++) s += (fin[i] === ' ' ? ' ' : (i < f * 1.4 ? fin[i] : chars[(Math.random() * chars.length) | 0])); el.textContent = s; if (f * 1.4 >= fin.length) { clearInterval(iv); el.textContent = fin; } }, 28); }); }, { threshold: .5 });
    for (var s2 = 0; s2 < scr.length; s2++) sio.observe(scr[s2]);
  }

  /* tilt + magnetic + cursor glow (pointer devices only) */
  if (!h.classList.contains('is-touch') && !calm) {
    var tilts = document.querySelectorAll('[data-tilt]');
    for (var t = 0; t < tilts.length; t++) (function (el) { var max = +el.getAttribute('data-tilt') || 8;
      el.addEventListener('mousemove', function (e) { var b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5; el.style.transform = 'perspective(800px) rotateX(' + (-y * max) + 'deg) rotateY(' + (x * max) + 'deg) translateY(-3px)'; });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; }); })(tilts[t]);
    var glowEl = document.createElement('div'); glowEl.className = 'cursor-glow'; document.body.appendChild(glowEl);
    window.addEventListener('mousemove', function (e) { glowEl.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, { passive: true });
  }

  /* command palette */
  var pal = document.querySelector('.pal');
  if (pal) {
    var input = pal.querySelector('input'), items = Array.prototype.slice.call(pal.querySelectorAll('.pal-list li')), sel = 0;
    function visible() { return items.filter(function (li) { return li.style.display !== 'none'; }); }
    function paint() { var v = visible(); items.forEach(function (li) { li.classList.remove('sel'); }); if (v[sel]) v[sel].classList.add('sel'); }
    function open() { pal.classList.add('on'); input.value = ''; items.forEach(function (li) { li.style.display = ''; }); sel = 0; paint(); setTimeout(function () { input.focus(); }, 20); }
    function close() { pal.classList.remove('on'); }
    var ks = document.querySelectorAll('.nav-k'); for (var k2 = 0; k2 < ks.length; k2++) ks[k2].addEventListener('click', open);
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.classList.contains('on') ? close() : open(); return; }
      if (!pal.classList.contains('on')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, visible().length - 1); paint(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); paint(); e.preventDefault(); }
      else if (e.key === 'Enter') { var v = visible()[sel]; if (v) v.querySelector('a').click(); }
      else if (/^[1-9]$/.test(e.key) && document.activeElement !== input) { var li = pal.querySelector('li[data-key="' + e.key + '"] a'); if (li) li.click(); }
    });
    input.addEventListener('input', function () { var q = input.value.toLowerCase(); items.forEach(function (li) { li.style.display = li.textContent.toLowerCase().indexOf(q) >= 0 ? '' : 'none'; }); sel = 0; paint(); });
    pal.addEventListener('click', function (e) { if (e.target === pal) close(); });
  }

  /* copy buttons */
  var copies = document.querySelectorAll('[data-copy]');
  for (var cp = 0; cp < copies.length; cp++) (function (b) { b.addEventListener('click', function () {
    var el = document.querySelector(b.getAttribute('data-copy')); if (!el) return; var txt = el.textContent, done = function (w) { var o = b.textContent; b.textContent = w; setTimeout(function () { b.textContent = o; }, 1300); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { done('Copied'); }, function () { select(); });
    else select();
    function select() { var rg = document.createRange(); rg.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(rg); done('Selected'); }
  }); })(copies[cp]);

  /* shared pill groups bound to SmolSouls state (any page) */
  var S = window.SmolSouls;
  if (S) {
    function pills(el, items2, key, labelOf) {
      if (!el) return;
      el.innerHTML = '';
      items2.forEach(function (it) { var b = document.createElement('button'); b.type = 'button'; b.className = 'pill-btn' + (it.mint ? ' mint' : ''); b.id = el.id + '-' + it.key; b.innerHTML = (it.sw || '') + it.label;
        b.setAttribute('aria-pressed', String(S.state[key] === it.key));
        b.addEventListener('click', function () { S.set(key, it.key); }); el.appendChild(b); });
      S.onChange(function (st) { var kids = el.children; for (var i = 0; i < kids.length; i++) kids[i].setAttribute('aria-pressed', String(kids[i].id === el.id + '-' + st[key])); });
    }
    var dot = function (c) { return '<span class="sw" style="background:' + c + '"></span>'; };
    var tri = function (a, b, c) { return '<span class="sw tri" style="--a:' + a + ';--b:' + b + ';--c:' + c + '"></span>'; };
    var T = S.THEMES, P = S.PALS;
    pills(document.getElementById('pills-themes'), Object.keys(T).filter(function (k) { return !T[k].extra; }).map(function (k) { return { key: k, label: T[k].name, sw: dot(T[k].c1) }; }), 'theme');
    pills(document.getElementById('pills-themes2'), Object.keys(T).filter(function (k) { return T[k].extra; }).map(function (k) { return { key: k, label: T[k].name, sw: dot(T[k].c1) }; }), 'theme');
    pills(document.getElementById('pills-souls'), [{ key: 'nyx', label: '✦ nyx · ethereal' }, { key: 'mochi', label: '♥ mochi · cutie' }, { key: 'bit', label: '▦ bit · voxel' }], 'soul');
    pills(document.getElementById('pills-pals'), Object.keys(P).map(function (k) { return { key: k, label: P[k].name, sw: P[k].c1 ? tri(P[k].c1, P[k].c2, P[k].c3) : '' }; }), 'pal');
    pills(document.getElementById('pills-states'), S.STATES.map(function (s) { return { key: s, label: s }; }), 'state');
    pills(document.getElementById('pills-modes'), [{ key: 'braille', label: 'braille · Nyx' }, { key: 'ramp', label: 'ramp · ASCII' }, { key: 'blocks', label: 'blocks · Bit' }, { key: 'raw', label: 'raw shader' }], 'mode');
    var toggles = document.querySelectorAll('[data-toggle]');
    for (var tg = 0; tg < toggles.length; tg++) (function (b) { var key = b.getAttribute('data-toggle'); b.setAttribute('aria-pressed', String(!!S.state[key]));
      b.addEventListener('click', function () { S.set(key, !S.state[key]); }); S.onChange(function (st) { b.setAttribute('aria-pressed', String(!!st[key])); }); })(toggles[tg]);
    var stages = document.querySelectorAll('.stage[data-cycle]');
    for (var sg = 0; sg < stages.length; sg++) stages[sg].addEventListener('click', function (e) { if (e.target.closest('button')) return; var o = S.SOUL_ORDER; S.set('soul', o[(o.indexOf(S.state.soul) + 1) % o.length]); });
    var names = document.querySelectorAll('[data-soulname]');
    var paintName = function (st) { for (var i = 0; i < names.length; i++) names[i].textContent = st.soul; };
    S.onChange(paintName); paintName(S.state);
    S.start();
  }
})();
