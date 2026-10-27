/* smol — spec documents. The shader strings come from souls.js; the state map and the
   glyph pass are written here. build.js dumps all of it to spec/* so the files and the
   page cannot disagree. */
window.SmolSpec = (function () {
  'use strict';
  var S = window.SmolSouls;
  var SPEC = {
    'prelude.glsl': S.SHADERS.prelude,
    'nyx.glsl': S.SHADERS.nyx,
    'mochi.glsl': S.SHADERS.mochi,
    'bit.glsl': S.SHADERS.bit,
    'soul-state.json': JSON.stringify({
      uniforms: { res: 'vec2 px', time: 's', bandTex: '32x1 R8 texture, 0..1 per band (AGSL: float[32])', 'c1 c2 c3': 'palette, cyclic c1>c2>c3>c1', 'bg fg': 'theme', bass: 'rim radius drive 0..1', energy: 'halo + swirl speed 0..1', beat: 'one-shot pulse, decays exp(-3.2t)', flow: 'integrated travel, never time*speed', spin: 'ring spin multiplier', roll: 'camera roll rad', bob: 'vertical float', shift: 'palette phase = t*0.02 + flow*0.015', blink: '0 open .. 1 closed', mouth: 'voice envelope 0..1', 'wl wt ws': 'state weights listening/thinking/speaking, eased k=1-exp(-4.5dt); idle = 1-wl-wt-ws' },
      states: {
        idle: { bass: '0.15 + 0.09 sin(0.75t)', energy: 0.2, spin: 1, flowRate: 0.6, roll: 'on', bob: 'off', bands: '0.15 + 0.1 sin(0.7t + 0.4i)', look: 'scale x0.92, half-lidded (Mochi lid 0.38), sparse lattice (Bit), alpha x0.75' },
        listening: { bass: 0.26, energy: 0.15, spin: 0.12, flowRate: 0.05, roll: 'eases to 0', bob: 'sin(1.1t) * 0.025', bands: 0.06, look: 'scale x1.18, inward rings at 7/rim spacing speed 1.1, 28-tick VU ring at rim+0.075, eyes x1.3 fixed on user, lattice snaps upright and fills' },
        thinking: { bass: '0.18 + 0.07 sin(2.2t)', energy: 0.75, spin: 3.2, flowRate: 2.4, roll: 'on', bands: '0.15 + 0.3|sin(2.3i + 5.5t)|', look: 'scan band sweep 0.55 Hz, 6 orbit sparks, body cooled toward c2, eyes up-right + 3 thought dots, lattice spins with flow' },
        speaking: { bass: '0.12 + 0.45 env', energy: 0.45, spin: 1, flowRate: 0.9, beat: '0.75 pulse every 1.4-1.8 s (per phrase, never per syllable)', bands: 'env (0.25 + 0.75 e^(-i/9)) (0.7 + 0.3 sin(1.3i + 9t))', mouth: '0.15 + 0.85 env, env resampled every 90 ms', look: 'outward waves at 6/rim speed 1.6 scaled by mouth, centre waveform from bands, Mochi bounce + hearts, Bit column bounce' }
      },
      blink: { every: '2.2 + rand*3.2 s', duration: '0.18 s (0.32 s when listening)', shape: 'sin(pi x)' },
      music: { bpm: 104, kick: 'exp(-7 phase) on even beats, bands 0..5', snare: 'exp(-9 phase) on odd beats, bands 8..15', hats: '0.12 + 0.1 sin(13t + i) bands 18..31' },
      tiers: { flagship: '12 GB+, Gemma 4 E4B, braille pass 60 fps', mid: '8 GB, E2B, ramp pass 30 fps, rings off', budget: '<=6 GB, launcher-only or E2B with warning, CPU text soul 10 fps', web: 'this site: 30 fps cap, 24 on phones; columns 56 / 80 / 112 by width' }
    }, null, 2),
    'glyph-pass.md': [
'# glyph pass', '',
'Two draws per frame. Draw 1: the soul shader into a small square target (160x160 here; 256 on device).',
'Draw 2: a glyph shader samples it per text cell and looks up a glyph in a pre-rendered atlas.', '',
'## cell geometry',
'- cell width  = monospace advance of the UI font (JetBrains Mono)',
'- cell height = 2 x cell width (braille and half-blocks assume 1:2)',
'- the soul region is cols x rows cells; the soul square is mapped to the smaller axis times zoom',
'  u = (i + (dx+0.5)/2) / cols,  v = (j + (dy+0.5)/4) / rows',
'  ox = 0.5 + (u-0.5) * W/S,  oy = 0.5 + (v-0.5) * H/S,  S = min(W,H) * zoom',
'  outside [0,1] is background; zoom > 1 crops (the strip souls use 3.4)', '',
'## braille (Nyx)',
'- 2x4 sub-dots per cell, sampled at dot centres',
'- L = luma(rgb) * alpha ;  dot on if  L*1.35 > 0.025 + D[dy][dx]*0.5',
'- D (ordered dither) = [[.10,.60],[.35,.85],[.60,.10],[.85,.35]]',
'- bit layout (U+2800 + mask): left column rows 0-2 = bits 0,1,2 ; right column rows 0-2 = bits 3,4,5 ; row 3 left = bit 6 ; row 3 right = bit 7',
'- glyph colour = alpha-weighted mean of the lit samples, blended toward bg by (mean alpha * dim)', '',
'## ramp (ASCII, mid tier)',
'- 2x2 samples, mean L ; index = floor(L * 1.2 * 9) into " .:-=+*#%@" ; index 0 draws nothing', '',
'## blocks (Bit)',
'- top and bottom halves sampled 2x2 each ; alpha posterised to 4 levels',
'- fill the cell with the bottom colour, draw U+2580 (upper half block) in the top colour', '',
'## raw',
'- draw the soul target scaled, no quantisation (reference, and Mochi\'s best look)', '',
'## on Android',
'- RuntimeShader #1 = soul (AGSL: main(float2) returns half4, texture2D -> float[32] uniform + manual lerp, no fwidth)',
'- RuntimeShader #2 = glyph pass with the soul as a child shader and a BitmapShader atlas of 256 braille + ramp glyphs',
'- atlas is re-rendered once per font/theme ; zero readback ; CPU text path is the charging screen and budget fallback',
'- frame rate: 60 on the home screen, 15 after 10 s idle, paused when another app is in front, 1 fps on the charging screen', ''
    ].join('\n')
  };
  var tabs = document.getElementById('spectabs'), code = document.getElementById('speccode'), name = document.getElementById('specname');
  if (tabs && code) {
    var cur = 'nyx.glsl';
    function show(k) { cur = k; code.textContent = SPEC[k]; name.textContent = 'spec/' + k + ' · ' + SPEC[k].split('\n').length + ' lines'; var kids = tabs.children; for (var i = 0; i < kids.length; i++) kids[i].setAttribute('aria-pressed', String(kids[i].getAttribute('data-k') === k)); }
    Object.keys(SPEC).forEach(function (k) { var b = document.createElement('button'); b.type = 'button'; b.className = 'pill-btn'; b.setAttribute('data-k', k); b.textContent = k; b.addEventListener('click', function () { show(k); }); tabs.appendChild(b); });
    show(cur);
  }
  return SPEC;
})();
