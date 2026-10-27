# glyph pass

Two draws per frame. Draw 1: the soul shader into a small square target (160x160 here; 256 on device).
Draw 2: a glyph shader samples it per text cell and looks up a glyph in a pre-rendered atlas.

## cell geometry
- cell width  = monospace advance of the UI font (JetBrains Mono)
- cell height = 2 x cell width (braille and half-blocks assume 1:2)
- the soul region is cols x rows cells; the soul square is mapped to the smaller axis times zoom
  u = (i + (dx+0.5)/2) / cols,  v = (j + (dy+0.5)/4) / rows
  ox = 0.5 + (u-0.5) * W/S,  oy = 0.5 + (v-0.5) * H/S,  S = min(W,H) * zoom
  outside [0,1] is background; zoom > 1 crops (the strip souls use 3.4)

## braille (Nyx)
- 2x4 sub-dots per cell, sampled at dot centres
- L = luma(rgb) * alpha ;  dot on if  L*1.35 > 0.025 + D[dy][dx]*0.5
- D (ordered dither) = [[.10,.60],[.35,.85],[.60,.10],[.85,.35]]
- bit layout (U+2800 + mask): left column rows 0-2 = bits 0,1,2 ; right column rows 0-2 = bits 3,4,5 ; row 3 left = bit 6 ; row 3 right = bit 7
- glyph colour = alpha-weighted mean of the lit samples, blended toward bg by (mean alpha * dim)

## ramp (ASCII, mid tier)
- 2x2 samples, mean L ; index = floor(L * 1.2 * 9) into " .:-=+*#%@" ; index 0 draws nothing

## blocks (Bit)
- top and bottom halves sampled 2x2 each ; alpha posterised to 4 levels
- fill the cell with the bottom colour, draw U+2580 (upper half block) in the top colour

## raw
- draw the soul target scaled, no quantisation (reference, and Mochi's best look)

## on Android
- RuntimeShader #1 = soul (AGSL: main(float2) returns half4, texture2D -> float[32] uniform + manual lerp, no fwidth)
- RuntimeShader #2 = glyph pass with the soul as a child shader and a BitmapShader atlas of 256 braille + ramp glyphs
- atlas is re-rendered once per font/theme ; zero readback ; CPU text path is the charging screen and budget fallback
- frame rate: 60 on the home screen, 15 after 10 s idle, paused when another app is in front, 1 fps on the charging screen

