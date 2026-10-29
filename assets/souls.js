/* smol — the souls engine.
   One soul shader renders per frame into a small square target; every registered
   canvas on the page then quantizes that same frame into terminal glyphs
   (braille, ASCII ramp, half-blocks) in its own cell grid. This is the WebGL
   stand-in for the two RuntimeShader draws the Android app makes.
   The strings below are the spec: spec/*.glsl are dumped from them unchanged. */
window.SmolSouls = (function () {
  'use strict';

  /* The app's set (core/theme Themes.ALL): Omarchy's own palettes plus three extras, each with its own look.
     `free`: the three in the free tier (one cool dark, one warm dark, one light); the rest come with Pro. */
  var THEMES = {
    tokyo:      {name:'tokyo night', bg:'#1a1b26', fg:'#c0caf5', c1:'#7aa2f7', c2:'#bb9af7', c3:'#7dcfff', dim:'#737aa2', ok:'#9ece6a', warn:'#e0af68', free:true},
    catppuccin: {name:'catppuccin', bg:'#1e1e2e', fg:'#cdd6f4', c1:'#f5c2e7', c2:'#cba6f7', c3:'#94e2d5', dim:'#7f849c', ok:'#a6e3a1', warn:'#f9e2af'},
    ethereal:   {name:'ethereal', bg:'#060b1e', fg:'#ffcead', c1:'#7d82d9', c2:'#c89dc1', c3:'#e9bb4f', dim:'#6d7db6', ok:'#92a593', warn:'#eb8b54'},
    kanagawa:   {name:'kanagawa', bg:'#1f1f28', fg:'#dcd7ba', c1:'#957fb8', c2:'#e6c384', c3:'#7e9cd8', dim:'#727169', ok:'#98bb6c', warn:'#ffa066'},
    nord:       {name:'nord', bg:'#2e3440', fg:'#eceff4', c1:'#88c0d0', c2:'#a3be8c', c3:'#b48ead', dim:'#7b88a1', ok:'#a3be8c', warn:'#ebcb8b'},
    everforest: {name:'everforest', bg:'#2d353b', fg:'#d3c6aa', c1:'#a7c080', c2:'#e69875', c3:'#83c092', dim:'#859289', ok:'#a7c080', warn:'#dbbc7f'},
    jade:       {name:'osaka jade', bg:'#111c18', fg:'#c1c497', c1:'#2dd5b7', c2:'#549e6a', c3:'#d2689c', dim:'#5f7a6c', ok:'#549e6a', warn:'#e6b450'},
    gruvbox:    {name:'gruvbox', bg:'#282828', fg:'#ebdbb2', c1:'#fabd2f', c2:'#fb4934', c3:'#b8bb26', dim:'#928374', ok:'#b8bb26', warn:'#fe8019', free:true},
    matte:      {name:'matte black', bg:'#121212', fg:'#bebebe', c1:'#e68e0d', c2:'#d35f5f', c3:'#ffc107', dim:'#6a6a6a', ok:'#9bb79b', warn:'#ffc107'},
    ristretto:  {name:'ristretto', bg:'#2c2525', fg:'#e6d9db', c1:'#fd6883', c2:'#f9cc6c', c3:'#a8a9eb', dim:'#8c8384', ok:'#adda78', warn:'#f9cc6c'},
    retro:      {name:'retro 82', bg:'#05182e', fg:'#f6dcac', c1:'#faa968', c2:'#8cbfb8', c3:'#f85525', dim:'#4f8a96', ok:'#8cbfb8', warn:'#faa968'},
    hackerman:  {name:'hackerman', bg:'#0b0c16', fg:'#ddf7ff', c1:'#82fb9c', c2:'#7cf8f7', c3:'#50f7d4', dim:'#4f6a8a', ok:'#4fe88f', warn:'#50f7d4'},
    lumon:      {name:'lumon', bg:'#0e1b24', fg:'#d6e2ee', c1:'#8bc9eb', c2:'#b4e4f6', c3:'#4d86b0', dim:'#56718a', ok:'#8bc9eb', warn:'#b4e4f6'},
    miasma:     {name:'miasma', bg:'#222222', fg:'#c2c2b0', c1:'#c9a554', c2:'#bb7744', c3:'#5f875f', dim:'#7a7a6a', ok:'#5f875f', warn:'#b36d43'},
    cyberdream: {name:'cyberdream', bg:'#16181a', fg:'#ffffff', c1:'#bd5eff', c2:'#5ef1ff', c3:'#5eff6c', dim:'#6f7680', ok:'#5eff6c', warn:'#f1ff5e', extra:true},
    vesper:     {name:'vesper', bg:'#101010', fg:'#ffffff', c1:'#ffc799', c2:'#99ffe4', c3:'#ff8080', dim:'#707070', ok:'#99ffe4', warn:'#ffc799', extra:true},
    oxocarbon:  {name:'oxocarbon', bg:'#161616', fg:'#f2f4f8', c1:'#ff7eb6', c2:'#33b1ff', c3:'#be95ff', dim:'#7a7a7a', ok:'#42be65', warn:'#ffe97b', extra:true},
    vantablack: {name:'vantablack', bg:'#000000', fg:'#ffffff', c1:'#d0d0d0', c2:'#8d8d8d', c3:'#ffffff', dim:'#6a6a6a', ok:'#b6b6b6', warn:'#cecece'},
    latte:      {name:'catppuccin latte', bg:'#eff1f5', fg:'#4c4f69', c1:'#8839ef', c2:'#1e66f5', c3:'#179299', dim:'#6c6f85', ok:'#2e7d1f', warn:'#b35c00', light:true, free:true},
    dawn:       {name:'rosé pine dawn', bg:'#faf4ed', fg:'#464261', c1:'#b4637a', c2:'#286983', c3:'#907aa9', dim:'#797593', ok:'#286983', warn:'#a8661a', light:true},
    flexoki:    {name:'flexoki light', bg:'#fffcf0', fg:'#100f0f', c1:'#205ea6', c2:'#d14d41', c3:'#879a39', dim:'#6f6e69', ok:'#879a39', warn:'#d0772b', light:true}
  };
  var PALS = {
    theme:  {name:'match theme'},
    nebula: {name:'nebula', c1:'#6f7bf7', c2:'#b48cf2', c3:'#f3a7d3'},
    aurora: {name:'aurora', c1:'#2dd4bf', c2:'#60a5fa', c3:'#c084fc'},
    ember:  {name:'ember',  c1:'#ff6a3d', c2:'#ffb347', c3:'#ffe29a'},
    ice:    {name:'ice',    c1:'#7dd3fc', c2:'#a5b4fc', c3:'#e0e7ff'},
    mono:   {name:'mono'}
  };
  var SOUL_ORDER = ['nyx', 'mochi', 'bit'];
  var STATES = ['auto', 'idle', 'listening', 'thinking', 'speaking'];
  var STATE_LABEL = { idle:'· idle', listening:'◌ listening…', thinking:'◐ thinking', speaking:'♪ speaking' };

  /* ---------------- shaders ---------------- */
  var PRELUDE = [
'precision highp float;',
'uniform vec2 res; uniform float time;',
'uniform sampler2D bandTex;',
'uniform vec3 c1,c2,c3,bg,fg;',
'uniform float bass,energy,beat,flow,spin,roll,bob,shift,blink,mouth;',
'uniform float wl,wt,ws; /* smooth state weights: listening, thinking, speaking; idle = what is left */',
'float band(float x){ x=clamp(x,0.,1.); return texture2D(bandTex, vec2((x*31.+.5)/32.,.5)).r; }',
'/* cyclic palette c1 -> c2 -> c3 -> c1, offset by a slow global shift so the whole soul drifts through the theme */',
'vec3 pal(float x){ x=fract(x+shift)*3.;',
'  if (x<1.) return mix(c1,c2,smoothstep(0.,1.,x));',
'  if (x<2.) return mix(c2,c3,smoothstep(0.,1.,x-1.));',
'  return mix(c3,c1,smoothstep(0.,1.,x-2.)); }',
'float glow(float d,float r){ return exp(-(d*d)/(r*r)); }',
'vec4 over(vec4 dst, vec3 rgb, float a){ return vec4(mix(dst.rgb,rgb,a), dst.a + a*(1.-dst.a)); }',
'/* portable hash: float only, no sin() (Hoskins hash12), same bits on every GPU */',
'float hash(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }',
'float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);',
'  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }',
'float fbm(vec2 p){ float a=0., w=.5; for(int i=0;i<4;i++){ a+=w*noise(p); p=p*2.03+vec2(1.7,9.2); w*=.5; } return a; }',
'float swirl(vec2 q,float t){ float a=0.; vec2 z=q; for(int i=0;i<4;i++){ float fi=float(i); float cs=cos(t*.2+fi), sn=sin(t*.2+fi); z=vec2(z.x*cs-z.y*sn, z.x*sn+z.y*cs)*1.7; a+=sin(z.x*3.+t)*cos(z.y*3.-t*.7)/(fi+1.); } return a*.5+.5; }',
'float widle(){ return clamp(1.-wl-wt-ws, 0., 1.); }',
'/* state signatures shared by every soul */',
'/* listening: sound coming IN. Rings contract toward the body, and a VU tick ring sits just outside it. */',
'float fxListen(vec2 q, float r, float rim, float ang){',
'  float k = fract((r-rim)*7. + time*1.1);',
'  float ring = glow(k-.5, .07) * step(rim, r) * glow(r-rim, .38) * .9;',
'  float a = fract(ang/6.2831853*28. + time*.05);',
'  float lv = band(abs(ang)/3.14159265);',
'  float tick = step(abs(a-.5), .14) * glow(r-(rim+.075), .006 + lv*.03) * (.6 + lv*1.5);',
'  return clamp(ring + tick, 0., 1.);',
'}',
'/* thinking: churn. A scan band sweeps the body, sparks orbit fast. */',
'float fxThink(vec2 q, float r, float rim){',
'  float sweepY = (fract(time*.55)*2.-1.)*(rim+.1);',
'  float sweep = glow(q.y - sweepY, .025) * step(r, rim+.05) * .8;',
'  float sp = 0.;',
'  for (int i=0;i<6;i++){ float fi=float(i); float a = flow*(1.4+fi*.11) + fi*1.047; float rr = rim + .09 + .05*sin(time*2.+fi); vec2 pp = vec2(cos(a),sin(a))*rr; sp += glow(length(q-pp), .012) * (.6+.4*sin(time*7.+fi)); }',
'  return clamp(sweep + sp, 0., 1.);',
'}',
'/* speaking: sound going OUT. Waves expand from the rim with the voice, and a waveform runs through the center. */',
'float fxSpeak(vec2 q, float r, float rim){',
'  float k = fract((r-rim)*6. - time*1.6);',
'  float wave = glow(k-.5, .06) * step(rim, r) * glow(r-rim, .3) * (.3 + mouth*1.2);',
'  float x = q.x*1.1 + .5;',
'  float env = band(clamp(x,0.,1.))*.5 + band(clamp(1.-x,0.,1.))*.5;',
'  float y = (env - .25) * .22 * mouth * sin(q.x*52. + time*26.) + .02*mouth*sin(q.x*17. - time*9.);',
'  float wf = glow(q.y - y, .007 + mouth*.004) * step(abs(q.x), rim*1.9) * glow(q.x, rim*1.3) * (.4 + mouth*1.2);',
'  return clamp(wave + wf, 0., 1.);',
'}'
  ].join('\n');

  var NYX = [
'/* Nyx: the ethereal nebula. Noisy rim, cloud body, wisp rings, a drifting nebula in the halo. */',
'void main(){',
'  vec2 p = gl_FragCoord.xy/res - .5;',
'  p.y -= bob;',
'  float ca=cos(roll), sa=sin(roll); vec2 q = vec2(p.x*ca-p.y*sa, p.x*sa+p.y*ca);',
'  q /= (1. + wl*.18 - widle()*.08 + ws*mouth*.05);',
'  float px = 1./res.x;',
'  float r=length(q); float ang=atan(q.y,q.x); float mirrored=abs(ang)/3.14159265;',
'  vec2 dir = vec2(cos(ang),sin(ang));',
'  float wob = fbm(dir*1.8 + vec2(time*.09, -time*.07)) - .5;',
'  float wob2 = fbm(dir*4.5 + vec2(-time*.13, time*.05)) - .5;',
'  float r0 = .19 + bass*.04 + beat*.015;',
'  float lv = (band(mirrored-.03)+band(mirrored)*2.+band(mirrored+.03))*.25;',
'  float rim = r0 + lv*.10 + wob*.09 + wob2*.03*(1.+energy);',
'  vec4 col=vec4(0.);',
'  vec2 nq = q*3.2 + vec2(flow*.12, time*.04);',
'  float neb = fbm(nq) * fbm(nq*1.7 + 3.1);',
'  float cloud = neb * glow(max(r-rim,0.), .20+energy*.08) * (.9 + energy*.9 + beat*.6);',
'  col = over(col, pal(fract(mirrored*.7 + neb*.5)), clamp(cloud*1.6,0.,.85));',
'  float halo = glow(max(r-rim,0.),.15)*(.18+energy*.35+beat*.3);',
'  col = over(col, pal(mirrored), halo*.7);',
'  float wave = rim + (1.-beat)*.32;',
'  float aW = glow(r-wave, px*5.)*beat*beat*.8;',
'  col = over(col, mix(c1,fg,.3), aW);',
'  for(int ps=0; ps<2; ps++){',
'    for(int k=0;k<3;k++){',
'      float fk=float(k); float tilt=.28+fk*.14;',
'      float sp = time*spin*(.15+fk*.07)*((k==1)?-1.:1.)+fk*2.1;',
'      vec2 rq = mat2(cos(sp),-sin(sp),sin(sp),cos(sp))*q;',
'      bool back = rq.y>0.;',
'      if((ps==0)!=back) continue;',
'      if(ps==0 && r<rim*.92) continue;',
'      float RR=.36+fk*.055 + wob*.02;',
'      vec2 e=vec2(rq.x, rq.y/tilt);',
'      float d=abs(length(e)-RR)*tilt;',
'      float line=glow(d, px*4.5);',
'      float ea=atan(e.y,e.x);',
'      float lvl=band(fract(ea/6.2831853+.5));',
'      float wisp = .5 + .5*fbm(vec2(ea*1.2, fk*3. + time*.2));',
'      vec3 rc=pal(.2+fk*.35);',
'      float a=line*(back?.22:.5)*(.3+lvl*1.2)*wisp;',
'      float bead=0.;',
'      for(int b=0;b<3;b++){ float ba=flow*(.9+fk*.3)+float(b)*2.094+fk; vec2 bp=vec2(cos(ba),sin(ba))*RR; bead+=glow(length(e-bp)*res.x, 5.+lvl*4.); }',
'      col = over(col, rc, clamp(a+bead*(back?.3:.8),0.,1.));',
'    }',
'    if(ps==0){',
'      float edge = smoothstep(rim+.07, rim-.10, r);',
'      float body_n = fbm(q*5. + vec2(time*.06, -time*.05));',
'      float aO = edge * (.55 + .45*body_n) + glow(max(r-rim,0.), .05)*.35*edge;',
'      aO = clamp(aO,0.,1.);',
'      if(aO>0.003){',
'        float zz=sqrt(max(0.,1.-pow(min(r/rim,1.),2.)));',
'        vec3 n=normalize(vec3(q/rim,zz));',
'        vec3 L=normalize(vec3(-.5,.6,.8));',
'        float diff=max(dot(n,L),0.);',
'        float fres=pow(1.-zz,2.0);',
'        float sw=swirl(q/rim, time*(.5+energy));',
'        float drift = fbm(q*2.2 + vec2(-time*.05, time*.035))*.6;',
'        vec3 body=mix(bg, pal(mirrored*.35+sw*.2+body_n*.25+drift), .20+diff*.3+sw*.18+body_n*.25);',
'        body += c3*fres*(.3+energy*.5+beat*.5);',
'        body = mix(body, pal(.66 + sw*.3), wt*.35);',
'        col=over(col, body, aO);',
'      }',
'      /* two lil eyes: soft lights, not holes. Half-lidded and deadpan at rest, wide open when listening, a glance up and away while thinking; they blink with the others */',
'      vec2 look = vec2(sin(time*.31), sin(time*.47)*.5)*.008*(1.-wl) + vec2(.016, .02)*wt;',
'      float lid = clamp(max(blink, .45 - wl*.4 + widle()*.25 - ws*.15), 0., 1.);',
'      float ery = .034*(1.-lid) + .004;',
'      vec2 eq = vec2(abs(q.x) - .068, q.y - .014 + lid*.01) - look;',
'      float de = length(vec2(eq.x/.034, eq.y/ery)) - 1.;',
'      float eyeA = smoothstep(px*2., -px*2., de) * edge;',
'      col = over(col, bg, glow(max(de, 0.)*.03, .022)*.55*edge);',
'      col = over(col, mix(c3, fg, .5), glow(max(de, 0.)*.03, .012)*.5*edge);',
'      col = over(col, mix(fg, vec3(1.), .35), eyeA);',
'    }',
'  }',
'  col = over(col, mix(c3, fg, .3), fxListen(q, r, rim, ang) * wl);',
'  col = over(col, mix(c2, fg, .5), fxThink(q, r, rim) * wt);',
'  col = over(col, mix(c1, fg, .55), fxSpeak(q, r, rim) * ws);',
'  col.a *= 1. - widle()*.25;',
'  gl_FragColor = vec4(col.rgb, col.a);',
'}'
  ].join('\n');

  var MOCHI = [
'/* Mochi: the cutie. A squishy blob with eyes that blink, blush, a mouth on the voice, hearts when she talks. */',
'void main(){',
'  vec2 p = gl_FragCoord.xy/res - .5;',
'  p.y -= bob*.6;',
'  float tilt = roll*.6 + wl*.14 - wt*.1;',
'  float ca=cos(tilt), sa=sin(tilt); vec2 q = vec2(p.x*ca-p.y*sa, p.x*sa+p.y*ca);',
'  q /= (1. + wl*.15 - widle()*.07);',
'  float px = 1./res.x;',
'  float sq = 1. + (bass-.15)*.9 - beat*.3 + ws*mouth*.12*sin(time*14.);',
'  vec2 e = vec2(q.x*sq, q.y/sq);',
'  float ang = atan(e.y,e.x);',
'  float wob = fbm(vec2(ang*1.3 + 3., time*.45)) - .5;',
'  float R0 = .235 + wob*.035;',
'  float d = length(e*vec2(1., 1.08 + .18*smoothstep(0.,-.22,e.y))) - R0;',
'  float body = smoothstep(px*2.5, -px*2.5, d);',
'  vec4 col = vec4(0.);',
'  float aura = glow(max(d,0.), .13 + energy*.05)*(.22+energy*.4+beat*.6+mouth*.3);',
'  float an = fbm(q*4. + vec2(time*.1, -time*.07));',
'  col = over(col, pal(.75 + an*.3), clamp(aura*(.6+an),0.,.8));',
'  float h = clamp(.5 - e.y/(2.*R0), 0., 1.);',
'  float bn = fbm(e*3. + vec2(time*.05, time*.03));',
'  vec3 bc = pal(.5 + h*.25 + bn*.2);',
'  bc = mix(bc, vec3(1.), .22*smoothstep(.0,-.2,d)*smoothstep(-.02,.16,e.y)*(1.-bn*.5));',
'  bc = mix(bc, mix(bc, fg, .45), smoothstep(-.03,0.,d)*.5);',
'  col = over(col, bc, body);',
'  float lid = max(blink, widle()*.38);',
'  vec2 look = vec2(sin(time*.37), sin(time*.53)*.4)*.012*(1.-blink)*(1.-wl) + vec2(.022, .03)*wt;',
'  vec2 eye = vec2(abs(e.x)-.082, e.y-.035) - look;',
'  float eyeScale = 1. + wl*.3;',
'  float ry = max(.012, .056*(1.-lid)*eyeScale);',
'  float de = length(vec2(eye.x/(.044*eyeScale), eye.y/ry)) - 1.;',
'  float eyeA = smoothstep(px*2.5, -px*2.5, de)*body;',
'  col = over(col, mix(bg, c2, .25), eyeA);',
'  vec2 hl = vec2(abs(e.x)-.068, e.y-.058) - look;',
'  float dh = length(hl/vec2(.015,.019)) - 1.;',
'  col = over(col, vec3(1.), smoothstep(px*2.5,-px*2.5,dh)*(1.-blink)*body);',
'  float bd = length(vec2(abs(e.x)-.145, e.y+.035)/vec2(.055,.03)) - 1.;',
'  col = over(col, pal(.9), smoothstep(.35,-.35,bd)*.6*body);',
'  float mo = .008 + mouth*.04;',
'  float md = length(vec2(e.x/(.03 + mouth*.012), (e.y+.075)/mo)) - 1.;',
'  col = over(col, mix(bg, c3, .3), smoothstep(px*2.5,-px*2.5,md)*body);',
'  for (int i=0;i<4;i++){ float fi=float(i); float ph=fract(time*.22+fi*.27);',
'    vec2 hp = vec2(sin(fi*2.1+time*.6)*.2, -.05+ph*.62);',
'    vec2 hq = (q-hp)*vec2(1.,1.15); hq.x = abs(hq.x);',
'    float hd = length(hq - vec2(.012, .012)) - .018;  hd = min(hd, length(hq - vec2(0., -.008)) - .024);',
'    float ha = smoothstep(px*2.,-px*2.,hd)*(1.-ph)*mouth*1.6;',
'    col = over(col, pal(.85+fi*.05), clamp(ha,0.,1.)); }',
'  for (int i=0;i<3;i++){ float fi=float(i); vec2 dp = vec2(.2 + fi*.055, .2 + fi*.07); float on = .35 + .65*step(.5, fract(time*1.1 - fi*.3));',
'    col = over(col, mix(c2, fg, .4), smoothstep(px*2.,-px*2., length(q-dp) - (.012 + fi*.006)) * on * wt); }',
'  float rr = R0*1.05;',
'  col = over(col, mix(c3, fg, .3), fxListen(q, length(e), rr, atan(e.y,e.x)) * wl * .8);',
'  col = over(col, mix(c1, fg, .5), fxSpeak(q, length(e), rr) * ws * .7);',
'  col.a *= 1. - widle()*.2;',
'  gl_FragColor = vec4(col.rgb, col.a);',
'}'
  ].join('\n');

  var BIT = [
'/* Bit: the voxel one. A cube cloud on a lattice; noise decides which cubes exist, flow spins it, two eye-cubes blink. */',
'void main(){',
'  vec2 p = gl_FragCoord.xy/res - .5;',
'  p.y -= bob;',
'  float a = (roll*1.5 + flow*.12) * (1. - wl*.85); float ca=cos(a), sa=sin(a);',
'  vec2 q = vec2(p.x*ca-p.y*sa, p.x*sa+p.y*ca);',
'  q /= (1. + wl*.15 - widle()*.08);',
'  float N = 12.;',
'  vec2 qb = q; qb.y += ws*mouth*.03*sin(floor(q.x*N)*1.7 + time*18.);',
'  vec2 g = qb*N; vec2 cell = floor(g); vec2 f = fract(g) - .5;',
'  vec2 cc = (cell + .5)/N;',
'  float r = length(cc);',
'  float n = fbm(cell*.37 + vec2(time*.22, flow*.08));',
'  float rad = .25 + bass*.12 + .08*(fbm(cell*.8 + time*.09)-.5)*(1.-wl) + beat*.03;',
'  float present = step(r, rad) * step(.3 - .2*energy + widle()*.12 - wl*.4, n);',
'  vec2 ac = vec2(abs(cell.x + .5), cell.y + .5);',
'  float isEye = step(abs(ac.x-1.5), .1)*step(abs(ac.y-0.5), .1);',
'  present = max(present, isEye);',
'  float sz = .33 + .1*n + beat*.06;',
'  float ey = isEye > .5 ? sz*(1.-blink*.88) : sz;',
'  float cube = step(abs(f.x), sz)*step(abs(f.y), ey);',
'  vec3 c = pal(hash(cell)*.25 + r*1.4 + n*.3);',
'  float topb = step(ey-.14, f.y), botb = step(f.y, -ey+.12);',
'  vec3 cubeCol = c*(.75 + .35*topb - .3*botb);',
'  float edge = 1. - step(abs(f.x), sz-.07)*step(abs(f.y), ey-.07);',
'  cubeCol = mix(cubeCol, mix(c, fg, .55), edge*.55);',
'  if (isEye > .5) {',
'    float pupil = step(abs(f.x), sz*.45)*step(abs(f.y), ey*.5);',
'    cubeCol = mix(mix(fg, c3, .25), bg, pupil);',
'  }',
'  vec4 col = vec4(0.);',
'  float halo = glow(max(r-rad,0.), .13)*(.14+energy*.35+beat*.5);',
'  col = over(col, pal(r*1.4 + .3), halo*.55);',
'  float scan = .85 + .15*sin(q.y*90. - time*6.);',
'  col = over(col, cubeCol*scan, cube*present);',
'  col = over(col, mix(c3, fg, .3), fxListen(q, length(q), rad, atan(q.y,q.x)) * wl);',
'  col = over(col, mix(c2, fg, .5), fxThink(q, length(q), rad) * wt);',
'  col = over(col, mix(c1, fg, .55), fxSpeak(q, length(q), rad) * ws);',
'  col.a *= 1. - widle()*.3;',
'  gl_FragColor = vec4(col.rgb, col.a);',
'}'
  ].join('\n');
  var SHADERS = { nyx: NYX, mochi: MOCHI, bit: BIT };

  /* ---------------- paste your rice ---------------- */
  var RICE_KEYS = ['bg', 'fg', 'c1', 'c2', 'c3', 'dim', 'ok', 'warn'];
  function normHex(v) {
    var m = /^(?:#|0x)?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(v).replace(/^\s*['"]|['"]\s*$/g, '').trim());
    if (!m) return null; var h = m[1].toLowerCase();
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    return '#' + h;
  }
  function rgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function mixHex(a, b, k) { var x = rgb(a), y = rgb(b), o = '#'; for (var i = 0; i < 3; i++) { var v = Math.round(x[i] + (y[i] - x[i]) * k); o += (v < 16 ? '0' : '') + v.toString(16); } return o; }
  function lum(h) { var c = rgb(h).map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  /* bg, fg and a map of ANSI colours {0..15} -> theme; null without bg + fg */
  function riceFrom(bg, fg, n) {
    if (!bg || !fg) return null;
    return { name: 'your rice', bg: bg, fg: fg, c1: n[4] || fg, c2: n[5] || n[4] || fg, c3: n[6] || n[4] || fg,
      dim: n[8] || mixHex(bg, fg, .45), ok: n[2] || n[6] || fg, warn: n[3] || n[1] || fg };
  }
  var ANSI = { black: 0, red: 1, green: 2, yellow: 3, blue: 4, magenta: 5, cyan: 6, white: 7 };
  /* -> {theme, source, count} or {reason} */
  function parseRiceEx(text) {
    text = String(text == null ? '' : text);
    var lines = text.split(/\r?\n/), i, m, v;
    /* kitty.conf: "background #xxxxxx", "color4 #xxxxxx" */
    var k = { n: {} }, kc = 0;
    for (i = 0; i < lines.length; i++) {
      m = /^\s*(background|foreground|color(\d{1,2}))\s+(\S+)/.exec(lines[i]); if (!m) continue;
      v = normHex(m[3]); if (!v) continue;
      if (m[1] === 'background') k.bg = v; else if (m[1] === 'foreground') k.fg = v;
      else if (+m[2] < 16) k.n[+m[2]] = v; else continue;
      kc++;
    }
    var t = riceFrom(k.bg, k.fg, k.n);
    if (t) return { theme: t, source: 'kitty.conf', count: kc };
    /* alacritty.toml ([colors.normal] blue = "#..") and alacritty.yml (normal:\n  blue: '0x..') */
    var a = { n: {} }, ac = 0, sec = '', yml = false, put = function (s, key, val) {
      var c = normHex(val); if (!c) return;
      if (s === 'primary' && (key === 'background' || key === 'foreground')) { a[key === 'background' ? 'bg' : 'fg'] = c; ac++; }
      else if ((s === 'normal' || s === 'bright') && ANSI[key] !== undefined) { a.n[ANSI[key] + (s === 'bright' ? 8 : 0)] = c; ac++; }
    };
    for (i = 0; i < lines.length; i++) {
      var ln = lines[i].replace(/\s+#(?!\s*[0-9a-f]{3,6}\b).*$/i, '');
      if ((m = /^\s*\[\s*([^\]]+?)\s*\]\s*$/.exec(ln))) { var p = m[1].split('.'); sec = p[0] === 'colors' && p.length === 2 ? p[1] : ''; continue; }
      if ((m = /^\s*(primary|normal|bright)\s*=\s*\{(.*)\}/.exec(ln))) { var re = /(\w+)\s*=\s*("[^"]*"|'[^']*'|[^\s,]+)/g, q; while ((q = re.exec(m[2]))) put(m[1], q[1], q[2]); continue; }
      if ((m = /^\s*(\w+)\s*:\s*$/.exec(ln))) { yml = true; sec = m[1]; continue; }
      if ((m = /^\s*(\w+)\s*[=:]\s*(.+?)\s*,?\s*$/.exec(ln))) put(sec, m[1], m[2]);
    }
    t = riceFrom(a.bg, a.fg, a.n);
    if (t) return { theme: t, source: yml ? 'alacritty.yml' : 'alacritty.toml', count: ac };
    /* last resort: a plain list of hex colours, in theme order (bg fg c1 c2 c3 dim ok warn) */
    var toks = text.match(/(?:#|0x)[0-9a-f]{6}\b/gi) || [];
    if (!toks.length && /^[\s,;"'0-9a-f]+$/i.test(text)) toks = text.split(/[\s,;"']+/).filter(function (s) { return /^[0-9a-f]{6}$/i.test(s); });
    var hx = toks.map(normHex).filter(Boolean);
    if (hx.length >= 2) {
      var o = { name: 'your rice', bg: hx[0], fg: hx[1] };
      for (i = 2; i < 8; i++) o[RICE_KEYS[i]] = hx[i] || (RICE_KEYS[i] === 'dim' ? mixHex(o.bg, o.fg, .45) : o.fg);
      return { theme: o, source: 'hex list', count: hx.length };
    }
    var bgf = k.bg || a.bg, fgf = k.fg || a.fg;
    return { reason: !text.replace(/\s/g, '') ? 'nothing pasted' : (bgf || fgf) ? 'missing ' + (bgf ? 'foreground' : 'background') : 'no colours found (need kitty.conf, alacritty.toml or hex colours)' };
  }
  function parseRice(text) { var r = parseRiceEx(text); return r.theme ? r.theme : null; }
  function riceLink(t) { return RICE_KEYS.map(function (k) { return t[k].slice(1); }).join('.'); }
  /* strict: exactly 8 six-digit hex values */
  function riceFromHash(s) {
    var m = /^#?rice=([0-9a-fA-F.]+)$/.exec(String(s || '')); if (!m) return null;
    var p = m[1].split('.'); if (p.length !== 8) return null;
    var t = { name: 'your rice' };
    for (var i = 0; i < 8; i++) { if (!/^[0-9a-fA-F]{6}$/.test(p[i])) return null; t[RICE_KEYS[i]] = '#' + p[i].toLowerCase(); }
    return t;
  }
  function riceStore(t) { try { localStorage.setItem('smol-rice', JSON.stringify(RICE_KEYS.map(function (k) { return t[k]; }))); } catch (e) {} }
  function riceRegister(t) { THEMES.custom = t; }
  function riceUse(t) { riceRegister(t); riceStore(t); set('theme', 'custom'); }
  function riceLoad() {
    try {
      var a = JSON.parse(localStorage.getItem('smol-rice') || 'null'); if (!a || a.length !== 8) return;
      var t = { name: 'your rice' };
      for (var i = 0; i < 8; i++) { var h = normHex(a[i]); if (!h) return; t[RICE_KEYS[i]] = h; }
      riceRegister(t);
    } catch (e) {}
  }

  /* ---------------- state ---------------- */
  var st = { theme:'tokyo', oled:false, pal:'theme', soul:'nyx', state:'auto', mode:'braille', music:false, soft:true, trail:true };
  try { var saved = JSON.parse(localStorage.getItem('smol-souls') || '{}'); for (var k in saved) if (k in st) st[k] = saved[k]; } catch (e) {}
  riceLoad();
  var hashRice = null; try { hashRice = riceFromHash(location.hash); } catch (e) {}
  if (hashRice) { riceRegister(hashRice); riceStore(hashRice); st.theme = 'custom'; save(); }
  if (!THEMES[st.theme]) st.theme = 'tokyo';
  if (!SHADERS[st.soul]) st.soul = 'nyx';
  function save() { try { localStorage.setItem('smol-souls', JSON.stringify(st)); } catch (e) {} }
  var listeners = [];
  function emit() { listeners.forEach(function (f) { f(st); }); }

  function theme() { var t = THEMES[st.theme] || THEMES.tokyo; if (!st.oled || t.light) return t; var o = {}; for (var k in t) o[k] = t[k]; o.bg = '#000000'; return o; }
  function soulPal() {
    var t = theme();
    if (st.pal === 'mono') return { c1: t.dim, c2: t.fg, c3: t.fg };
    if (st.pal === 'theme' || !PALS[st.pal] || !PALS[st.pal].c1) return { c1: t.c1, c2: t.c2, c3: t.c3 };
    return PALS[st.pal];
  }
  var root = document.documentElement;
  function applyTheme() {
    var t = theme();
    var map = { '--tbg': t.bg, '--tfg': t.fg, '--tc1': t.c1, '--tc2': t.c2, '--tc3': t.c3, '--tdim': t.dim, '--tok': t.ok, '--twarn': t.warn };
    for (var k in map) root.style.setProperty(k, map[k]);
    root.setAttribute('data-theme-name', st.theme);
  }
  function set(key, val) { st[key] = val; if (key === 'theme' || key === 'oled') applyTheme(); save(); emit(); }

  /* ---------------- signals ---------------- */
  var sig = { bass:.15, energy:.2, beat:0, flow:0, spin:1, roll:0, bob:0, rollAmp:1, bobAmp:0, blink:0, mouth:0, wl:0, wt:0, ws:0 };
  var bands = new Float32Array(32), bandT = new Float32Array(32), bandBytes = new Uint8Array(32);
  var autoIdx = 1, autoT = 0, pulseT = 0, env = 0, envT = 0, kick = 0, snare = 0, blinkAt = 2.5, blinkT = -1;
  var driven = null, shownState = '';
  function lerp(a, b, k) { return a + (b - a) * k; }
  function drive(state, ms) { driven = { state: state, until: performance.now() + ms }; }
  function currentState(dt) {
    if (driven) { if (performance.now() < driven.until) return driven.state; driven = null; }
    if (st.state !== 'auto') return st.state;
    autoT += dt; if (autoT > 4.5) { autoT = 0; autoIdx = autoIdx % 4 + 1; }
    return STATES[autoIdx];
  }
  function updateSignals(t, dt) {
    var s = currentState(dt);
    var k = 1 - Math.exp(-dt * 3), ks = 1 - Math.exp(-dt * 8);
    var tb = .15, te = .2, tspin = 1, flowRate = .6, trollAmp = 1, tbobAmp = 0;
    if (s === 'idle') { tb = .15 + .09 * Math.sin(t * .75); te = .2; }
    if (s === 'listening') { tb = .26; te = .15; tspin = .12; flowRate = .05; trollAmp = 0; tbobAmp = 1; }
    if (s === 'thinking') { tb = .18 + .07 * Math.sin(t * 2.2); te = .75; tspin = 3.2; flowRate = 2.4; }
    if (s === 'speaking') {
      envT += dt; if (envT > .09) { envT = 0; env = Math.random() < .25 ? .05 : .35 + Math.random() * .65; }
      tb = .12 + env * .45; te = .45; flowRate = .9;
      pulseT += dt; if (pulseT > 1.4 + Math.random() * .4) { pulseT = 0; sig.beat = .75; }
    }
    if (st.music) {
      var bpm = 104, beatLen = 60 / bpm, ph = (t % beatLen) / beatLen, bar = Math.floor(t / beatLen) % 4;
      kick = Math.exp(-ph * 7) * (bar % 2 === 0 ? 1 : .55);
      snare = bar % 2 === 1 ? Math.exp(-ph * 9) : 0;
      if (ph < dt * 1.2 && bar % 2 === 0) sig.beat = Math.max(sig.beat, .9);
      tb = Math.max(tb, .1 + kick * .45); te = Math.max(te, .35 + snare * .3);
    }
    sig.bass = lerp(sig.bass, tb, ks); sig.energy = lerp(sig.energy, te, k);
    sig.spin = lerp(sig.spin, tspin, k); sig.rollAmp = lerp(sig.rollAmp, trollAmp, k); sig.bobAmp = lerp(sig.bobAmp, tbobAmp, k);
    sig.flow += flowRate * dt; sig.beat *= Math.exp(-dt * 3.2);
    sig.roll = (Math.sin(t * .17) * .035 + Math.sin(t * .071 + 1.7) * .02) * sig.rollAmp;
    sig.bob = Math.sin(t * 1.1) * .025 * sig.bobAmp;
    if (t > blinkAt && blinkT < 0) { blinkT = 0; blinkAt = t + 2.2 + Math.random() * 3.2; }
    if (blinkT >= 0) { blinkT += dt; var dur = s === 'listening' ? .32 : .18; var x = blinkT / dur; sig.blink = x < 1 ? Math.sin(x * Math.PI) : 0; if (x >= 1) blinkT = -1; } else sig.blink = 0;
    var kw = 1 - Math.exp(-dt * 4.5);
    sig.wl = lerp(sig.wl, s === 'listening' ? 1 : 0, kw); sig.wt = lerp(sig.wt, s === 'thinking' ? 1 : 0, kw); sig.ws = lerp(sig.ws, s === 'speaking' ? 1 : 0, kw);
    if (s !== shownState) { shownState = s; var els = document.querySelectorAll('.stateline'); for (var i = 0; i < els.length; i++) { els[i].textContent = STATE_LABEL[s]; els[i].setAttribute('data-s', s); } }
    var tm = s === 'speaking' ? .15 + env * .85 : (s === 'thinking' ? .08 : .04);
    sig.mouth = lerp(sig.mouth, tm, 1 - Math.exp(-dt * (tm > sig.mouth ? 22 : 9)));
    for (var i2 = 0; i2 < 32; i2++) {
      var v = .15 + .1 * Math.sin(t * .7 + i2 * .4);
      if (s === 'listening') v = .06;
      if (s === 'thinking') v = .15 + .3 * Math.abs(Math.sin(i2 * 2.3 + t * 5.5 + Math.sin(i2 + t * 2)));
      if (s === 'speaking') v = env * (.25 + .75 * Math.exp(-i2 / 9)) * (.7 + .3 * Math.sin(i2 * 1.3 + t * 9));
      if (st.music) { var low = i2 < 6 ? kick * (1 - i2 / 7) : 0, mid = (i2 >= 8 && i2 < 16) ? snare * .8 : 0, hi = i2 >= 18 ? .12 + .1 * Math.sin(t * 13 + i2) : 0; v = Math.max(v * .4, low, mid, hi); }
      bandT[i2] = v;
      bands[i2] = lerp(bands[i2], bandT[i2], 1 - Math.exp(-dt * (bandT[i2] > bands[i2] ? 18 : 6)));
      bandBytes[i2] = Math.max(0, Math.min(255, bands[i2] * 255)) | 0;
    }
  }

  /* ---------------- WebGL ---------------- */
  var R = 160, off = document.createElement('canvas'); off.width = R; off.height = R;
  var gl = off.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
  var progs = {}, bandTex, pixels = new Uint8Array(R * R * 4), ok = false;
  /* motion blur: the glyph pass reads an exponential moving average of the shader's frames, not the raw frame.
     Fast moves leave a short fading trail, a soul or theme switch dissolves, and a dot near its threshold stops
     flickering because it has to stay bright for a moment before it changes. */
  var TRAIL_TAU = .085, trailF = new Float32Array(R * R * 4), trailU = new Uint8Array(R * R * 4), src = pixels, trailPrimed = false;
  function blendTrail(dt) {
    if (!st.trail) { src = pixels; trailPrimed = false; return; }
    var k = trailPrimed ? 1 - Math.exp(-Math.max(dt, .001) / TRAIL_TAU) : 1;
    for (var i = 0; i < pixels.length; i++) { var v = trailF[i] + (pixels[i] - trailF[i]) * k; trailF[i] = v; trailU[i] = v; }
    trailPrimed = true; src = trailU;
  }
  function compile(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  if (gl) try {
    var vs = compile(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a,0.,1.); }');
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var names = ['res', 'time', 'bandTex', 'c1', 'c2', 'c3', 'bg', 'fg', 'bass', 'energy', 'beat', 'flow', 'spin', 'roll', 'bob', 'shift', 'blink', 'mouth', 'wl', 'wt', 'ws'];
    Object.keys(SHADERS).forEach(function (k2) {
      var prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, PRELUDE + '\n' + SHADERS[k2])); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(k2 + ': ' + gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      var a = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      var U = {}; names.forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      gl.uniform1i(U.bandTex, 0); gl.uniform2f(U.res, R, R);
      progs[k2] = { prog: prog, U: U };
    });
    bandTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, bandTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.viewport(0, 0, R, R);
    ok = true;
  } catch (e) { console.warn('smol souls: shader failed', e); }

  /* ---------------- glyph pass ---------------- */
  var RAMP = ' .:-=+*#%@', DITH = [[.10, .60], [.35, .85], [.60, .10], [.85, .35]];
  var souls = [], tmp = [0, 0, 0, 0];
  function hex(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function rescan() {
    var cs = document.querySelectorAll('canvas.soul');
    souls = [];
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      souls.push({ c: c, ctx: c.getContext('2d'), rows: +c.getAttribute('data-rows') || 14, zoom: +c.getAttribute('data-zoom') || 1, dim: +c.getAttribute('data-dim') || 1, cols: +c.getAttribute('data-cols') || 40, autoCols: c.hasAttribute('data-autocols'), cw: 0, ch: 0, W: 0, H: 0 });
    }
    layout();
  }
  function layout() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    souls.forEach(function (s) {
      var host = s.c.parentElement, cs = getComputedStyle(host);
      var w = host.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); if (w <= 0) return;
      if (s.autoCols) s.cols = w < 640 ? 56 : (w < 1000 ? 80 : 112);
      s.cw = w / s.cols; s.ch = s.cw * 2; s.W = w; s.H = s.rows * s.ch;
      s.c.style.height = s.H + 'px';
      s.c.width = Math.round(w * dpr); s.c.height = Math.round(s.H * dpr);
      s.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.dpr = dpr; s.img = s.ctx.createImageData(s.c.width, s.c.height); s.buf = new Uint32Array(s.img.data.buffer);
    });
  }
  window.addEventListener('resize', layout);
  function sample(ox, oy, out) {
    if (ox < 0 || ox >= 1 || oy < 0 || oy >= 1) { out[0] = out[1] = out[2] = out[3] = 0; return; }
    var x = (ox * (R - 1)) | 0, y = ((1 - oy) * (R - 1)) | 0, i = (y * R + x) * 4;
    out[0] = src[i]; out[1] = src[i + 1]; out[2] = src[i + 2]; out[3] = src[i + 3];
  }
  function luma(o) { return (o[0] * .30 + o[1] * .59 + o[2] * .11) / 255 * (o[3] / 255); }
  var mono = "'JetBrains Mono', ui-monospace, Menlo, monospace";
  function draw(s, th) {
    var ctx = s.ctx, cols = s.cols, rows = s.rows, cw = s.cw, ch = s.ch, W = s.W, H = s.H, zoom = s.zoom, dim = s.dim; if (!W) return;
    var bg = hex(th.bg);
    ctx.clearRect(0, 0, W, H);
    if (!ok) { ctx.fillStyle = th.dim; ctx.font = '11px ' + mono; ctx.fillText('soul: webgl unavailable', 8, 16); return; }
    var S = Math.min(W, H) * zoom;
    var mapX = function (u) { return .5 + (u - .5) * W / S; }, mapY = function (v) { return .5 + (v - .5) * H / S; };
    if (st.mode === 'raw') { ctx.imageSmoothingEnabled = true; ctx.globalAlpha = dim; ctx.drawImage(off, (W - S) / 2, (H - S) / 2, S, S); ctx.globalAlpha = 1; return; }
    if (st.mode === 'braille' && st.soft && s.img) { softDots(s, mapX, mapY); return; }
    ctx.font = (ch * 1.02).toFixed(1) + 'px ' + mono; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    /* the soul fades out toward the canvas edges instead of stopping at them: a hard cut reads as a crop */
    var fadeC = Math.max(2, cols * .12), fadeR = Math.max(1.5, rows * .16);
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
      var cx = (i + .5) * cw, cy = (j + .5) * ch, r = 0, g = 0, b = 0, a = 0, n = 0, dx, dy, al;
      var ef = Math.min(1, Math.min(i + .5, cols - i - .5) / fadeC, Math.min(j + .5, rows - j - .5) / fadeR);
      if (ef <= .02) continue;
      var dimc = dim * ef * ef * (3 - 2 * ef);
      if (st.mode === 'braille') {
        var mask = 0;
        for (dy = 0; dy < 4; dy++) for (dx = 0; dx < 2; dx++) {
          sample(mapX((i + (dx + .5) / 2) / cols), mapY((j + (dy + .5) / 4) / rows), tmp);
          if (luma(tmp) * 1.35 > .025 + DITH[dy][dx] * .5) mask |= dy < 3 ? (1 << (dy + dx * 3)) : (1 << (6 + dx));
          if (tmp[3] > 20) { r += tmp[0] * tmp[3]; g += tmp[1] * tmp[3]; b += tmp[2] * tmp[3]; a += tmp[3]; n++; }
        }
        if (!mask || !a) continue;
        r /= a; g /= a; b /= a; al = (a / n / 255) * dimc;
        ctx.fillStyle = 'rgb(' + (lerp(bg[0], r, al) | 0) + ',' + (lerp(bg[1], g, al) | 0) + ',' + (lerp(bg[2], b, al) | 0) + ')';
        ctx.fillText(String.fromCharCode(0x2800 + mask), cx, cy);
      } else if (st.mode === 'ramp') {
        var L = 0;
        for (dy = 0; dy < 2; dy++) for (dx = 0; dx < 2; dx++) { sample(mapX((i + (dx + .5) / 2) / cols), mapY((j + (dy + .5) / 2) / rows), tmp); L += luma(tmp) / 4; r += tmp[0] / 4; g += tmp[1] / 4; b += tmp[2] / 4; a += tmp[3] / 4; }
        var idx = Math.min(RAMP.length - 1, (L * 1.2 * (RAMP.length - 1)) | 0); if (!idx) continue;
        al = (a / 255) * dimc;
        ctx.fillStyle = 'rgb(' + (lerp(bg[0], r, al) | 0) + ',' + (lerp(bg[1], g, al) | 0) + ',' + (lerp(bg[2], b, al) | 0) + ')';
        ctx.fillText(RAMP[idx], cx, cy);
      } else {
        var half = [[0, 0, 0, 0], [0, 0, 0, 0]];
        for (var h = 0; h < 2; h++) { r = g = b = a = 0; for (dy = 0; dy < 2; dy++) for (dx = 0; dx < 2; dx++) { sample(mapX((i + (dx + .5) / 2) / cols), mapY((j + (h * 2 + dy + .5) / 4) / rows), tmp); r += tmp[0] / 4; g += tmp[1] / 4; b += tmp[2] / 4; a += tmp[3] / 4; }
          var lvl = Math.round((a / 255) * 3) / 3 * dimc; half[h] = [lerp(bg[0], r, lvl) | 0, lerp(bg[1], g, lvl) | 0, lerp(bg[2], b, lvl) | 0, lvl]; }
        if (!half[0][3] && !half[1][3]) continue;
        ctx.fillStyle = 'rgb(' + half[1][0] + ',' + half[1][1] + ',' + half[1][2] + ')'; ctx.fillRect(cx - cw / 2, cy - ch / 2, cw + .5, ch + .5);
        ctx.fillStyle = 'rgb(' + half[0][0] + ',' + half[0][1] + ',' + half[0][2] + ')'; ctx.fillText('▀', cx, cy);
      }
    }
  }

  /* soft dots: braille drawn dot by dot instead of picked from 256 glyphs. Each of a cell's eight dots is a
     halftone disc, its area following the brightness under it (with a little of the ordered dither left in for
     texture), anti-aliased at the edge. A dot grows and fades instead of popping on and off. */
  var DOT_X = [.3, .7], DOT_Y = [.14, .38, .62, .86], DOT_R = .2;
  function softDots(s, mapX, mapY) {
    var cols = s.cols, rows = s.rows, dim = s.dim, img = s.img, d = img.data, PW = img.width, PH = img.height;
    var sx = PW / cols, sy = PH / rows, r0 = DOT_R * sx;
    var fadeC = Math.max(2, cols * .12), fadeR = Math.max(1.5, rows * .16);
    s.buf.fill(0);
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
      var ef = Math.min(1, Math.min(i + .5, cols - i - .5) / fadeC, Math.min(j + .5, rows - j - .5) / fadeR);
      if (ef <= .02) continue;
      var dimc = dim * ef * ef * (3 - 2 * ef);
      for (var dy = 0; dy < 4; dy++) for (var dx = 0; dx < 2; dx++) {
        sample(mapX((i + DOT_X[dx]) / cols), mapY((j + DOT_Y[dy]) / rows), tmp);
        if (tmp[3] < 6) continue;
        var c = (luma(tmp) * 1.35 - .02 - (DITH[dy][dx] - .47) * .1) / .36; /* thin rings and rims stay visible */
        if (c < .04) continue; if (c > 1) c = 1;
        disc(d, PW, PH, (i + DOT_X[dx]) * sx, (j + DOT_Y[dy]) * sy, Math.max(.6, r0 * Math.sqrt(c)), tmp[0], tmp[1], tmp[2], (tmp[3] / 255) * dimc * (.6 + .4 * c));
      }
    }
    s.ctx.putImageData(img, 0, 0);
  }
  function disc(d, PW, PH, cx, cy, rad, r, g, b, alpha) {
    var x0 = Math.max(0, (cx - rad - 1) | 0), x1 = Math.min(PW - 1, (cx + rad + 1) | 0);
    var y0 = Math.max(0, (cy - rad - 1) | 0), y1 = Math.min(PH - 1, (cy + rad + 1) | 0);
    for (var y = y0; y <= y1; y++) { var ddy = y + .5 - cy; for (var x = x0; x <= x1; x++) {
      var ddx = x + .5 - cx, cov = rad + .5 - Math.sqrt(ddx * ddx + ddy * ddy); if (cov <= 0) continue; if (cov > 1) cov = 1;
      var A = alpha * cov * 255, q = (y * PW + x) * 4; if (A > d[q + 3]) { d[q] = r; d[q + 1] = g; d[q + 2] = b; d[q + 3] = A; } } }
  }

  /* ---------------- loop ---------------- */
  /* device tier: phones get fewer columns (layout) and a lower frame cap; the shader is the same everywhere */
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var still = /[?&]still=1/.test(location.search);
  var isPhone = document.documentElement.classList.contains('is-phone') || (window.matchMedia && matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) <= 820);
  var fpsCap = isPhone ? 24 : 30, costAvg = 1 / 60;
  document.documentElement.setAttribute('data-tier', isPhone ? 'phone' : 'desktop');
  var last = performance.now(), acc = 0, t = 0, drawn = 0, running = false;
  function frame(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    if ((reduced || still) && drawn > (still ? 40 : 1)) { requestAnimationFrame(frame); return; }
    acc += dt; var minFrame = document.hidden ? 1 : 1 / fpsCap;
    if (acc < minFrame) { requestAnimationFrame(frame); return; }
    var fdt = acc; updateSignals(t, acc); acc = 0;
    var th = theme(), pl = soulPal();
    if (ok) {
      var P = progs[st.soul] || progs.nyx, U = P.U;
      gl.useProgram(P.prog);
      gl.bindTexture(gl.TEXTURE_2D, bandTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 32, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, bandBytes);
      var c = function (h2) { return hex(h2).map(function (v) { return v / 255; }); };
      gl.uniform3fv(U.c1, c(pl.c1)); gl.uniform3fv(U.c2, c(pl.c2)); gl.uniform3fv(U.c3, c(pl.c3)); gl.uniform3fv(U.bg, c(th.bg)); gl.uniform3fv(U.fg, c(th.fg));
      gl.uniform1f(U.time, t); gl.uniform1f(U.bass, sig.bass); gl.uniform1f(U.energy, sig.energy); gl.uniform1f(U.beat, sig.beat);
      gl.uniform1f(U.flow, sig.flow); gl.uniform1f(U.spin, sig.spin); gl.uniform1f(U.roll, sig.roll); gl.uniform1f(U.bob, sig.bob);
      gl.uniform1f(U.shift, t * .02 + sig.flow * .015); gl.uniform1f(U.blink, sig.blink); gl.uniform1f(U.mouth, sig.mouth);
      gl.uniform1f(U.wl, sig.wl); gl.uniform1f(U.wt, sig.wt); gl.uniform1f(U.ws, sig.ws);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.readPixels(0, 0, R, R, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      blendTrail(fdt);
    }
    var t0 = performance.now();
    souls.forEach(function (s) { draw(s, th); });
    /* the tier is a guess; this is the measurement. If a frame's glyph pass keeps costing more than its budget, cap lower. */
    costAvg = costAvg * .9 + ((performance.now() - t0) / 1000) * .1;
    if (drawn > 60 && costAvg > (1 / fpsCap) * .7 && fpsCap > 15) { fpsCap -= 3; drawn = 0; }
    drawn++;
    requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; applyTheme(); rescan(); requestAnimationFrame(frame); if (document.fonts) document.fonts.ready.then(layout); }

  return {
    THEMES: THEMES, PALS: PALS, SOUL_ORDER: SOUL_ORDER, STATES: STATES, STATE_LABEL: STATE_LABEL,
    SHADERS: { prelude: PRELUDE, nyx: NYX, mochi: MOCHI, bit: BIT },
    parseRice: parseRice, parseRiceEx: parseRiceEx, riceUse: riceUse, riceLink: riceLink, contrast: contrast,
    state: st, set: set, theme: theme, drive: drive, rescan: rescan, layout: layout, start: start, onChange: function (f) { listeners.push(f); }, webgl: ok
  };
})();
