/* smol site — the voices. Each row plays a real Kokoro clip; the waveform is drawn from the decoded audio
   and fills as it plays, and the soul on the stage becomes that soul and speaks for the clip's length. */
(function () {
  'use strict';
  var rows = document.querySelectorAll('.vrow[data-clip]');
  if (!rows.length) return;
  var BARS = 72, audio = null, playing = null, ac = null;

  function peaks(buf) {
    var d = buf.getChannelData(0), n = Math.floor(d.length / BARS), out = [], max = 1e-6;
    for (var i = 0; i < BARS; i++) {
      var s = 0;
      for (var k = i * n; k < (i + 1) * n; k++) s += d[k] * d[k];
      out.push(Math.sqrt(s / n)); max = Math.max(max, out[i]);
    }
    return out.map(function (v) { return v / max; });
  }

  function draw(row, done) {
    var c = row.querySelector('canvas'), p = row._peaks, dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = c.clientWidth, h = c.clientHeight; if (!w) return;
    if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr; }
    var x = c.getContext('2d'), cs = getComputedStyle(row), on = cs.getPropertyValue('--von').trim(), off = cs.getPropertyValue('--voff').trim();
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
    var bw = w / BARS;
    for (var i = 0; i < BARS; i++) {
      var v = p ? Math.max(.06, p[i]) : .06, bh = v * (h - 2);
      x.fillStyle = (i + .5) / BARS <= done ? on : off;
      x.fillRect(i * bw + bw * .2, (h - bh) / 2, Math.max(1, bw * .6), bh);
    }
  }

  function load(row) {
    if (row._loading) return; row._loading = true;
    fetch(row.getAttribute('data-clip')).then(function (r) { return r.arrayBuffer(); }).then(function (b) {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      return new Promise(function (ok, no) { ac.decodeAudioData(b, ok, no); });
    }).then(function (buf) {
      row._peaks = peaks(buf);
      row.querySelector('.vlen').textContent = buf.duration.toFixed(1) + ' s';
      draw(row, 0);
    }).catch(function () { draw(row, 0); });
  }

  function stop() {
    if (!playing) return;
    playing.classList.remove('on'); playing.querySelector('.vplay').setAttribute('aria-label', 'play');
    draw(playing, 0); playing = null;
    if (audio) { audio.pause(); audio = null; }
  }

  function play(row) {
    if (playing === row) { stop(); return; }
    stop();
    playing = row; row.classList.add('on'); row.querySelector('.vplay').setAttribute('aria-label', 'stop');
    audio = new Audio(row.getAttribute('data-clip'));
    var soul = row.getAttribute('data-soul'), a = audio;
    if (window.SmolSouls) SmolSouls.set('soul', soul);
    a.addEventListener('loadedmetadata', function () { if (window.SmolSouls) SmolSouls.drive('speaking', a.duration * 1000 + 300); });
    a.addEventListener('ended', function () { if (playing === row) stop(); });
    a.play().catch(stop);
    (function tick() {
      if (playing !== row || audio !== a) return;
      draw(row, a.duration ? a.currentTime / a.duration : 0);
      requestAnimationFrame(tick);
    })();
  }

  Array.prototype.forEach.call(rows, function (row) {
    row.querySelector('.vplay').addEventListener('click', function () { play(row); });
    draw(row, 0);
  });
  var io = 'IntersectionObserver' in window && new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '300px' });
  Array.prototype.forEach.call(rows, function (row) { io ? io.observe(row) : load(row); });
  window.addEventListener('resize', function () { Array.prototype.forEach.call(rows, function (r) { if (r !== playing) draw(r, 0); }); });
})();
