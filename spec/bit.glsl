/* Bit: the voxel one. A cube cloud on a lattice; noise decides which cubes exist, flow spins it, two eye-cubes blink. */
void main(){
  vec2 p = gl_FragCoord.xy/res - .5;
  p.y -= bob;
  float a = (roll*1.5 + flow*.12) * (1. - wl*.85); float ca=cos(a), sa=sin(a);
  vec2 q = vec2(p.x*ca-p.y*sa, p.x*sa+p.y*ca);
  q /= (1. + wl*.15 - widle()*.08);
  float N = 12.;
  vec2 qb = q; qb.y += ws*mouth*.03*sin(floor(q.x*N)*1.7 + time*18.);
  vec2 g = qb*N; vec2 cell = floor(g); vec2 f = fract(g) - .5;
  vec2 cc = (cell + .5)/N;
  float r = length(cc);
  float n = fbm(cell*.37 + vec2(time*.22, flow*.08));
  float rad = .25 + bass*.12 + .08*(fbm(cell*.8 + time*.09)-.5)*(1.-wl) + beat*.03;
  float present = step(r, rad) * step(.3 - .2*energy + widle()*.12 - wl*.4, n);
  vec2 ac = vec2(abs(cell.x + .5), cell.y + .5);
  float isEye = step(abs(ac.x-1.5), .1)*step(abs(ac.y-0.5), .1);
  present = max(present, isEye);
  float sz = .33 + .1*n + beat*.06;
  float ey = isEye > .5 ? sz*(1.-blink*.88) : sz;
  float cube = step(abs(f.x), sz)*step(abs(f.y), ey);
  vec3 c = pal(hash(cell)*.25 + r*1.4 + n*.3);
  float topb = step(ey-.14, f.y), botb = step(f.y, -ey+.12);
  vec3 cubeCol = c*(.75 + .35*topb - .3*botb);
  float edge = 1. - step(abs(f.x), sz-.07)*step(abs(f.y), ey-.07);
  cubeCol = mix(cubeCol, mix(c, fg, .55), edge*.55);
  if (isEye > .5) {
    float pupil = step(abs(f.x), sz*.45)*step(abs(f.y), ey*.5);
    cubeCol = mix(mix(fg, c3, .25), bg, pupil);
  }
  vec4 col = vec4(0.);
  float halo = glow(max(r-rad,0.), .13)*(.14+energy*.35+beat*.5);
  col = over(col, pal(r*1.4 + .3), halo*.55);
  float scan = .85 + .15*sin(q.y*90. - time*6.);
  col = over(col, cubeCol*scan, cube*present);
  col = over(col, mix(c3, fg, .3), fxListen(q, length(q), rad, atan(q.y,q.x)) * wl);
  col = over(col, mix(c2, fg, .5), fxThink(q, length(q), rad) * wt);
  col = over(col, mix(c1, fg, .55), fxSpeak(q, length(q), rad) * ws);
  col.a *= 1. - widle()*.3;
  gl_FragColor = vec4(col.rgb, col.a);
}
