# smol soul spec

Dumped by build.js from assets/souls.js and assets/spec.js; the site runs these exact strings.

- prelude.glsl — shared uniforms, cyclic palette, noise, state signatures (fxListen / fxThink / fxSpeak)
- nyx.glsl, mochi.glsl, bit.glsl — one `main()` per soul; prepend prelude.glsl
- soul-state.json — SoulState → uniform mapping, per-state behaviour, blink, music, tiers
- glyph-pass.md — cell geometry, braille bits, dither, ramp, blocks, AGSL notes

GLSL ES 1.0 as written for WebGL. For AGSL: main(float2) returns half4, replace texture2D band lookups with a float[32] uniform and a manual lerp, mat2 and atan carry over, no derivatives are used.

Orb lineage: Orpheus (GeneralDussDuss), GPL-3.0-or-later; dual-licensed into smol by the author.
