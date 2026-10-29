/* smol site — the landing page: the scroll tour, the theme grid, the soul picker. */
(function () {
  'use strict';
  var S = window.SmolSouls;
  var wide = window.matchMedia('(min-width: 980px)');

  /* tour: on a wide window one sticky phone changes screen as each step reaches the middle of the viewport;
     on a narrow one each step gets its own copy of its screen, in a phone of its own */
  var steps = document.querySelectorAll('.tour-step'), layers = document.querySelectorAll('.tour-layer'), dots = document.querySelectorAll('.tour-dots i');
  function show(n) {
    for (var i = 0; i < steps.length; i++) steps[i].classList.toggle('on', i === n);
    for (var j = 0; j < layers.length; j++) layers[j].classList.toggle('on', j === n);
    for (var k = 0; k < dots.length; k++) dots[k].classList.toggle('on', k === n);
  }
  if (steps.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) show(+e.target.getAttribute('data-step')); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    Array.prototype.forEach.call(steps, function (s) { io.observe(s); });
  }
  var cloned = false;
  function mobile() {
    if (wide.matches || cloned || !layers.length) return;
    cloned = true;
    Array.prototype.forEach.call(steps, function (s, i) {
      var slot = s.querySelector('.tour-mob'), layer = layers[i]; if (!slot || !layer) return;
      var phone = document.createElement('div'); phone.className = 'phone';
      var scr = layer.cloneNode(true); scr.classList.remove('tour-layer', 'on');
      phone.appendChild(scr); slot.appendChild(phone);
    });
    if (S) S.rescan();
  }
  mobile();
  if (wide.addEventListener) wide.addEventListener('change', mobile);

  if (!S) return;

  /* the soul stage cycles on tap; the voice rows pick a soul too */
  var rows = document.querySelectorAll('.vrow[data-soul]'), stageName = document.getElementById('stage-name');
  var stage = document.getElementById('stage');
  if (stage) stage.setAttribute('data-cycle', '');
  Array.prototype.forEach.call(rows, function (r) {
    r.addEventListener('click', function (e) { if (e.target.closest('.vplay')) return; S.set('soul', r.getAttribute('data-soul')); });
  });
  function paintSoul(st) {
    Array.prototype.forEach.call(rows, function (r) { r.classList.toggle('sel', r.getAttribute('data-soul') === st.soul); });
    if (stageName) stageName.textContent = st.soul;
  }

  /* theme grid: a small screen per theme in its own colours; a tap re-themes the phones and the page */
  var grid = document.getElementById('tgrid'), now = document.getElementById('theme-now'), T = S.THEMES;
  if (grid) {
    var keys = Object.keys(T).filter(function (k) { return k !== 'custom'; });
    keys.sort(function (a, b) { return (T[b].free ? 1 : 0) - (T[a].free ? 1 : 0); });
    keys.forEach(function (k) {
      var t = T[k], b = document.createElement('button');
      b.type = 'button'; b.className = 'tcard' + (t.free ? ' free' : ''); b.id = 'tc-' + k;
      b.setAttribute('aria-label', t.name + (t.free ? ', free' : ', Pro'));
      b.innerHTML = '<span class="tc-screen" style="background:' + t.bg + ';color:' + t.dim + '">' +
        '<span class="bar"><span style="color:' + t.c1 + '">smol</span><span>14:02</span></span>' +
        '<span class="dots"><i style="background:' + t.c1 + '"></i><i style="background:' + t.c2 + '"></i><i style="background:' + t.c3 + '"></i></span>' +
        '<span class="ln" style="color:' + t.fg + '"><span style="color:' + t.c1 + '">$</span>&nbsp;theme ' + k + '</span></span>' +
        '<span class="tc-meta"><span>' + t.name + '</span><em>' + (t.free ? 'free' : 'pro') + '</em></span>';
      b.addEventListener('click', function () { S.set('theme', k); });
      grid.appendChild(b);
    });
  }
  function paintTheme(st) {
    if (grid) Array.prototype.forEach.call(grid.children, function (b) { b.setAttribute('aria-pressed', String(b.id === 'tc-' + st.theme)); });
    if (now && T[st.theme]) now.textContent = T[st.theme].name;
  }
  S.onChange(function (st) { paintSoul(st); paintTheme(st); });
  paintSoul(S.state); paintTheme(S.state);
})();
