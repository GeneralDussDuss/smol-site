/* smol — the launcher prototype: the loop (listen → think → confirm → act → speak),
   the / app launcher, built-ins, the posture chip, and the widget stack editor.
   The brain's part is a toy intent parser standing in for Gemma 4 via Knotwork. */
(function () {
  'use strict';
  var S = window.SmolSouls; if (!S) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* ---------- the home phone ---------- */
  var scrollEl = $('scroll'), promptEl = $('prompt'), launchEl = $('launch'), symEl = $('promptsym'), postureEl = $('posture');
  if (scrollEl && promptEl) {
    var PLACEHOLDER = 'try: set a 10 minute timer · /sp · theme nord';
    function say(html, cls) { var d = document.createElement('div'); d.className = 'line' + (cls ? ' ' + cls : ''); d.innerHTML = html; scrollEl.appendChild(d); while (scrollEl.children.length > 14) scrollEl.firstChild.remove(); return d; }
    function echo(t, sym) { return say('<span class="pr">' + (sym || '$') + '</span> ' + esc(t)); }
    var posture = 'LOCKED'; if (postureEl) postureEl.textContent = 'ASKS FIRST';
    if (postureEl) postureEl.addEventListener('click', function () { posture = posture === 'LOCKED' ? 'BALANCED' : 'LOCKED'; postureEl.textContent = posture === 'LOCKED' ? 'ASKS FIRST' : 'LOW-RISK AUTO'; postureEl.classList.toggle('bal', posture === 'BALANCED');
      say('<span class="c2">◆</span> posture <b>' + posture.toLowerCase() + '</b> <span class="dim">· ' + (posture === 'LOCKED' ? 'asks before every action' : 'low-risk actions skip the ask') + ' · logged</span>'); });

    var TOOLS = {
      set_timer:    { risk: 'low', run: function (a) { return 'timer set · ' + a.len; }, voice: function (a) { return a.len + ". I'll ping you."; } },
      set_reminder: { risk: 'mid', run: function (a) { return 'reminder set · ' + a.when + ' · "' + a.what + '"'; }, voice: function (a) { return a.when + ', ' + a.what + '. Got it.'; } },
      open_app:     { risk: 'low', run: function (a) { return '↗ ' + a.app[0].toUpperCase() + a.app.slice(1); }, voice: function (a) { return 'Opening ' + a.app + '.'; } },
      dnd:          { risk: 'mid', run: function (a) { return 'do not disturb ' + (a.on ? 'on' : 'off'); }, voice: function (a) { return a.on ? "Quiet mode. I'll hold the noise." : 'Back to normal.'; } },
      flashlight:   { risk: 'low', run: function (a) { return 'flashlight ' + (a.on ? 'on' : 'off'); }, voice: function (a) { return a.on ? 'Lights on.' : 'Lights off.'; } },
      note:         { risk: 'low', run: function (a) { return 'note saved · "' + a.text + '"'; }, voice: function () { return 'Noted.'; } },
      set_alarm:    { risk: 'mid', run: function (a) { return 'alarm set · ' + a.when; }, voice: function (a) { return 'Alarm for ' + a.when + '. Sleep well.'; } }
    };
    function parseTime(s) { var m = s.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/i); if (!m) return null; var hh = +m[1], mm = m[2] || '00', ap = (m[3] || '').toLowerCase();
      if (ap.indexOf('p') === 0 && hh < 12) hh += 12; if (ap.indexOf('a') === 0 && hh === 12) hh = 0; if (!ap && hh >= 1 && hh <= 7) hh += 12; return (hh < 10 ? '0' : '') + hh + ':' + mm; }
    function intent(text) {
      var t = text.toLowerCase().trim(), m;
      if ((m = t.match(/(\d+)\s*(sec|second|min|minute|hour|hr|h|m|s)\w*\s*timer|timer\s*(?:for\s*)?(\d+)\s*(sec|second|min|minute|hour|hr|h|m|s)/))) { var n = m[1] || m[3], u = m[2] || m[4]; var unit = u[0] === 's' ? 'second' : u[0] === 'h' ? 'hour' : 'minute'; return { tool: 'set_timer', args: { len: n + ' ' + unit + (n === '1' ? '' : 's') } }; }
      if ((m = t.match(/remind me (?:to )?(.+?)(?: at | @ )(.+)$/))) return { tool: 'set_reminder', args: { what: m[1], when: parseTime(m[2]) || m[2] } };
      if ((m = t.match(/(?:wake me|alarm)(?: up)?(?: at| for)?\s*(.+)$/))) return { tool: 'set_alarm', args: { when: parseTime(m[1]) || m[1] } };
      if ((m = t.match(/^(?:open|launch|start)\s+(\w+)/))) return { tool: 'open_app', args: { app: m[1] } };
      if (/\b(dnd|do not disturb|quiet|silence|silent)\b/.test(t)) return { tool: 'dnd', args: { on: !/\b(off|disable|stop)\b/.test(t) } };
      if (/\b(flash|torch|light)\b/.test(t)) return { tool: 'flashlight', args: { on: !/\b(off|kill)\b/.test(t) } };
      if ((m = t.match(/^(?:note|remember|jot)(?: that| down)?\s+(.+)$/))) return { tool: 'note', args: { text: m[1] } };
      return null;
    }
    var ANSWERS = ['Eight to ten minutes for al dente; pull it a minute early if it goes in a sauce.', 'Nothing leaves the phone. I run on Gemma 4, right here, airplane mode and all.', 'Three souls, one glyph pass. You are talking to the pretty one.', 'Your next shift is at 18:30. You have time.', 'ASKS FIRST means I ask before every action. LOW-RISK AUTO lets me skip the ask for low-risk ones.'];
    var awaiting = null;
    function fmtArgs(a) { return Object.keys(a).map(function (k) { var v = a[k]; return typeof v === 'boolean' ? (v ? 'on' : 'off') : (k === 'when' ? '<span class="c2">@' + esc(v) + '</span>' : '"' + esc(v) + '"'); }).join(' '); }
    function propose(it) { var tool = TOOLS[it.tool], needsAsk = posture === 'LOCKED' || tool.risk !== 'low';
      say('<span class="ask">?</span> ' + it.tool + ' ' + fmtArgs(it.args) + ' <span class="dim">· ' + tool.risk + ' risk</span>');
      if (!needsAsk) { say('<span class="dim">  balanced · low risk · no ask</span>'); return execute(it, true); }
      say('  <span class="key">y</span>es  <span class="key">n</span>o'); awaiting = it; symEl.textContent = '?'; promptEl.placeholder = 'y / n'; S.drive('listening', 60000); }
    function execute(it, ok) { var tool = TOOLS[it.tool]; awaiting = null; symEl.textContent = '$'; promptEl.placeholder = PLACEHOLDER;
      if (!ok) { say('<span class="c3">✗</span> declined <span class="dim">· logged</span>'); S.drive('idle', 400); return; }
      say('<span class="ok">✓</span> ' + tool.run(it.args) + ' <span class="dim">· logged</span>'); var v = tool.voice(it.args); S.drive('speaking', 700 + v.length * 45); say('<span class="c1">♪</span> <span class="dim">"' + esc(v) + '"</span>'); }
    function brain(text) { echo(text, '>'); S.drive('thinking', 1400); setTimeout(function () { var it = intent(text); if (it) return propose(it); var a = ANSWERS[(Math.random() * ANSWERS.length) | 0]; S.drive('speaking', 700 + a.length * 45); say('<span class="ai">▸</span> ' + esc(a), 'say'); }, 900 + Math.random() * 700); }
    function builtin(text) { var parts = text.trim().split(/\s+/), cmd = parts[0], arg = parts.slice(1).join(' ').toLowerCase(), T = S.THEMES;
      switch (cmd) {
        case 'help': say('<span class="dim">/app · theme &lt;name&gt; · theme rice · theme oled · soul nyx|mochi|bit · posture · ls · clear · or just talk</span>'); return;
        case 'clear': scrollEl.innerHTML = ''; return;
        case 'ls': say('<span class="dim">drwx  /music  /games  /work  /cam  · 12 apps</span>'); return;
        case 'posture': if (postureEl) postureEl.click(); return;
        case 'theme': if (arg === 'oled') { S.set('oled', !S.state.oled); say('<span class="c3">◆</span> oled black ' + (S.state.oled ? 'on' : 'off')); return; }
          if ((arg === 'rice' || arg === 'yours' || arg === 'your rice') && !T.custom) { say('<span class="c3">✗</span> no rice yet <span class="dim">· paste one in the theme panel</span>'); return; }
          if (arg === 'rice' || arg === 'yours') arg = 'custom';
          var k = Object.keys(T).filter(function (k2) { return k2 === arg || T[k2].name.replace(/[^a-z]/g, '') === arg.replace(/[^a-z]/g, ''); })[0];
          if (!k) { say('<span class="c3">✗</span> no theme "' + esc(arg) + '" <span class="dim">· ' + Object.keys(T).map(function (k3) { return T[k3].name; }).join(', ') + '</span>'); return; }
          S.set('theme', k); say('<span class="c3">◆</span> ' + T[k].name + ' <span class="dim">· soul re-palettes</span>'); return;
        case 'soul': if (S.SOUL_ORDER.indexOf(arg) < 0) { say('<span class="c3">✗</span> souls: nyx, mochi, bit'); return; } S.set('soul', arg); say('<span class="c3">◆</span> soul ' + arg); return;
      } }
    /* the / launcher */
    var APPS = ['spotify', 'signal', 'chrome', 'tidal', 'steam', 'obsidian', 'termux', 'github', 'proton', 'maps', 'photos', 'tailscale', 'camera', 'settings', 'youtube', 'calendar', 'files', 'clock', 'speedtest', 'syncthing', 'terminal'];
    var hits = [], sel = 0;
    var mono = function (n) { return n.slice(0, 1).toUpperCase() + n.slice(1, 2); };
    function fuzzy(q, name) { var i = 0; for (var c = 0; c < name.length; c++) if (name[c] === q[i]) i++; return i === q.length; }
    function renderLaunch() { var v = promptEl.value; if (v[0] !== '/') { launchEl.hidden = true; return; } var q = v.slice(1).toLowerCase();
      hits = APPS.filter(function (n) { return fuzzy(q, n); }).sort(function (a, b) { return ((a.indexOf(q) === 0 ? 0 : 1) + a.length / 100) - ((b.indexOf(q) === 0 ? 0 : 1) + b.length / 100); }).slice(0, 5);
      sel = Math.min(sel, Math.max(0, hits.length - 1));
      launchEl.innerHTML = hits.length ? hits.map(function (n, i) { var k = n.indexOf(q), label = q && k >= 0 ? n.slice(0, k) + '<span class="m">' + n.slice(k, k + q.length) + '</span>' + n.slice(k + q.length) : n;
        return '<div class="hit' + (i === sel ? ' sel' : '') + '" data-i="' + i + '"><span class="g">' + mono(n) + '</span><span>' + label + '</span><span class="k">' + (i === sel ? '↵' : '') + '</span></div>'; }).join('') : '<div class="none">no app matches /' + esc(q) + '</div>';
      launchEl.hidden = false; }
    function launch(n) { echo('/' + n); say('<span class="dim">↗</span> ' + n[0].toUpperCase() + n.slice(1)); promptEl.value = ''; launchEl.hidden = true; sel = 0; }
    function submit() { var text = promptEl.value.trim(); if (!text) return; promptEl.value = ''; launchEl.hidden = true;
      if (awaiting) { var y = /^(y|yes|yeah|yep|do it|sure|ok)$/i.test(text), nn = /^(n|no|nah|nope|cancel|stop)$/i.test(text); echo(text, '?'); if (y || nn) return execute(awaiting, y); say('<span class="dim">  unclear · nothing done · y or n</span>'); return; }
      if (text[0] === '/') { if (hits[sel]) launch(hits[sel]); return; }
      var first = text.split(/\s+/)[0];
      if (['help', 'clear', 'ls', 'posture', 'theme', 'soul'].indexOf(first) >= 0) { if (first !== 'clear') echo(text); builtin(text); return; }
      brain(text); }
    promptEl.addEventListener('input', function () { sel = 0; renderLaunch(); });
    promptEl.addEventListener('keydown', function (e) {
      if (!launchEl.hidden) { if (e.key === 'ArrowDown') { sel = (sel + 1) % Math.max(1, hits.length); renderLaunch(); e.preventDefault(); return; }
        if (e.key === 'ArrowUp') { sel = (sel - 1 + hits.length) % Math.max(1, hits.length); renderLaunch(); e.preventDefault(); return; }
        if (e.key === 'Escape') { promptEl.value = ''; launchEl.hidden = true; return; } }
      if (e.key === 'Enter') { submit(); e.preventDefault(); } });
    launchEl.addEventListener('click', function (e) { var hh = e.target.closest('.hit'); if (hh) launch(hits[+hh.getAttribute('data-i')]); });
    promptEl.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== promptEl) launchEl.hidden = true; }, 150); });
    promptEl.addEventListener('focus', renderLaunch);
  }

  /* ---------- the widget stack ---------- */
  var wstack = $('wstack'), weditor = $('weditor');
  if (wstack) {
    var WIDGETS = { soul: 'mini soul', notifs: 'notifications', agenda: 'today', playing: 'now playing', toggles: 'quick toggles', weather: 'weather', sys: 'system', todo: 'todo' };
    var order = [{ id: 'soul', on: true }, { id: 'notifs', on: true }, { id: 'agenda', on: true }, { id: 'playing', on: true }, { id: 'toggles', on: true }, { id: 'weather', on: false }, { id: 'sys', on: false }, { id: 'todo', on: false }];
    try { var sv = JSON.parse(localStorage.getItem('smol-widgets') || 'null'); if (Array.isArray(sv) && sv.length === order.length) order = sv; } catch (e) {}
    var saveW = function () { try { localStorage.setItem('smol-widgets', JSON.stringify(order)); } catch (e) {} };
    var WHTML = {
      soul: '<canvas class="soul" data-rows="8" data-zoom="1.15"></canvas><div class="stateline">· idle</div>',
      notifs: '<div class="h">notifications <i>3</i></div><div class="n"><span class="b" style="background:var(--tc1)"></span><span class="app">signal</span><span class="txt">Mom · call me when you\'re off</span><span class="t">2m</span></div><div class="n"><span class="b" style="background:var(--tc2)"></span><span class="app">github</span><span class="txt">CI passed · smol #41</span><span class="t">11m</span></div><div class="n"><span class="b" style="background:var(--tc3)"></span><span class="app">tidal</span><span class="txt">Nothing Change · Yeat</span><span class="t">♪</span></div>',
      agenda: '<div class="h">today <i>tue 27</i></div><div class="row"><span class="k">15:00</span><span>call the jeweler <span class="c2">⏰</span></span></div><div class="row"><span class="k">18:30</span><span>dinner shift</span></div><div class="row"><span class="k dim">tmrw</span><span class="dim">09:00 CAD review · ring 0412</span></div>',
      playing: '<div class="h">now playing</div><div class="row"><span class="c3">♪</span><span class="txt" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Yeat – Nothing Change</span></div><div class="row dim"><span>▮▮▮▮▮▯▯▯▯▯ 2:14/3:40</span><span style="margin-left:auto;color:var(--tfg)">⏮ ⏯ ⏭</span></div>',
      toggles: '<div class="h">toggles</div><div class="tog"><span class="on">wifi ●</span><span>bt ○</span><span>dnd ○</span><span>flash ○</span><span class="on">vpn ●</span></div>',
      weather: '<div class="h">neo tokyo</div><div class="row"><span>☁ 16°C</span><span class="dim">feels 14° · ↑20 ↓9 · rain 20%</span></div><div class="row"><span class="spark">▂▂▃▅▆▆▅▃▂▁</span><span class="dim">next 10h</span></div>',
      sys: '<div class="h">system</div><div class="row dim"><span>s26 ultra · 12 GB · up 3d 4h</span></div><div class="row"><span class="dim">brain</span><span class="ok">E4B idle</span><span class="dim">· cpu ▰▱▱▱ · mem ▰▰▰▱ · bat ▰▰▰▱</span></div>',
      todo: '<div class="h">todo <i>2</i></div><div class="row"><span class="dim">[ ]</span><span>ship the smol brief</span></div><div class="row"><span class="ok">[x]</span><span class="dim" style="text-decoration:line-through">orb → AGSL notes</span></div><div class="row"><span class="dim">[ ]</span><span>tester list · 20 names</span></div>'
    };
    function renderWidgets() {
      wstack.innerHTML = order.filter(function (w) { return w.on && WHTML[w.id]; }).map(function (w) { return '<div class="w" data-w="' + w.id + '">' + WHTML[w.id] + '</div>'; }).join('');
      if (weditor) { weditor.innerHTML = '';
        order.forEach(function (w, i) { var row = document.createElement('div'); row.className = 'wrow';
          var b = document.createElement('button'); b.type = 'button'; b.className = 'pill-btn'; b.id = 'w-' + w.id; b.textContent = (w.on ? '● ' : '○ ') + WIDGETS[w.id]; b.setAttribute('aria-pressed', String(w.on)); b.addEventListener('click', function () { w.on = !w.on; saveW(); renderWidgets(); });
          var up = document.createElement('button'); up.type = 'button'; up.className = 'mv'; up.textContent = '↑'; up.setAttribute('aria-label', 'move ' + WIDGETS[w.id] + ' up'); up.disabled = i === 0; up.addEventListener('click', function () { var tmp = order[i - 1]; order[i - 1] = order[i]; order[i] = tmp; saveW(); renderWidgets(); });
          var dn = document.createElement('button'); dn.type = 'button'; dn.className = 'mv'; dn.textContent = '↓'; dn.setAttribute('aria-label', 'move ' + WIDGETS[w.id] + ' down'); dn.disabled = i === order.length - 1; dn.addEventListener('click', function () { var tmp = order[i + 1]; order[i + 1] = order[i]; order[i] = tmp; saveW(); renderWidgets(); });
          row.appendChild(b); row.appendChild(up); row.appendChild(dn); weditor.appendChild(row); }); }
      S.rescan();
    }
    renderWidgets();
  }
  /* ---------- paste your rice ---------- */
  var riceBtnHost = $('pills-rice'), riceBox = $('rice-box'), riceText = $('rice-text'), riceStatus = $('rice-status');
  if (riceBtnHost && riceBox && riceText) {
    var chip = document.createElement('button'); chip.type = 'button'; chip.className = 'pill-btn'; chip.id = 'pills-rice-custom'; riceBtnHost.appendChild(chip);
    var lastLink = '', paintChip = function () {
      var has = !!S.THEMES.custom, on = S.state.theme === 'custom';
      chip.innerHTML = has ? '<span class="sw" style="background:' + S.THEMES.custom.c1 + '"></span>your rice' : '+ paste your rice';
      chip.setAttribute('aria-pressed', String(on)); if (has) lastLink = S.riceLink(S.THEMES.custom);
    };
    var status = function (txt, cls) { riceStatus.textContent = txt; riceStatus.className = 'rice-status' + (cls ? ' ' + cls : ''); };
    var link = function () { return location.origin + location.pathname + '#rice=' + lastLink; };
    chip.addEventListener('click', function () {
      if (S.THEMES.custom && S.state.theme !== 'custom') { S.set('theme', 'custom'); return; }
      riceBox.hidden = !riceBox.hidden; chip.setAttribute('aria-expanded', String(!riceBox.hidden)); if (!riceBox.hidden) riceText.focus();
    });
    $('rice-apply').addEventListener('click', function () {
      var r = S.parseRiceEx(riceText.value);
      if (!r.theme) { status(r.reason, 'bad'); return; }
      S.riceUse(r.theme);
      var lo = S.contrast(r.theme.bg, r.theme.fg) < 3;
      status(r.source + ' · ' + r.count + ' colours · applied' + (lo ? ' · low contrast fg/bg' : ''), lo ? 'bad' : 'ok');
    });
    $('rice-copy').addEventListener('click', function () {
      if (!S.THEMES.custom) { status('nothing to link yet · apply a rice first', 'bad'); return; }
      var u = link(), done = function () { status('link copied · ' + u.length + ' chars', 'ok'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(done, function () { status(u, 'ok'); }); else status(u, 'ok');
    });
    S.onChange(paintChip); paintChip();
    if (S.THEMES.custom) status('saved rice loaded · ' + S.THEMES.custom.bg + ' / ' + S.THEMES.custom.fg, 'ok');
  }
})();
