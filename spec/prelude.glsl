precision highp float;
uniform vec2 res; uniform float time;
uniform sampler2D bandTex;
uniform vec3 c1,c2,c3,bg,fg;
uniform float bass,energy,beat,flow,spin,roll,bob,shift,blink,mouth;
uniform float wl,wt,ws; /* smooth state weights: listening, thinking, speaking; idle = what is left */
float band(float x){ x=clamp(x,0.,1.); return texture2D(bandTex, vec2((x*31.+.5)/32.,.5)).r; }
/* cyclic palette c1 -> c2 -> c3 -> c1, offset by a slow global shift so the whole soul drifts through the theme */
vec3 pal(float x){ x=fract(x+shift)*3.;
  if (x<1.) return mix(c1,c2,smoothstep(0.,1.,x));
  if (x<2.) return mix(c2,c3,smoothstep(0.,1.,x-1.));
  return mix(c3,c1,smoothstep(0.,1.,x-2.)); }
float glow(float d,float r){ return exp(-(d*d)/(r*r)); }
vec4 over(vec4 dst, vec3 rgb, float a){ return vec4(mix(dst.rgb,rgb,a), dst.a + a*(1.-dst.a)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=0., w=.5; for(int i=0;i<4;i++){ a+=w*noise(p); p=p*2.03+vec2(1.7,9.2); w*=.5; } return a; }
float swirl(vec2 q,float t){ float a=0.; vec2 z=q; for(int i=0;i<4;i++){ float fi=float(i); float cs=cos(t*.2+fi), sn=sin(t*.2+fi); z=vec2(z.x*cs-z.y*sn, z.x*sn+z.y*cs)*1.7; a+=sin(z.x*3.+t)*cos(z.y*3.-t*.7)/(fi+1.); } return a*.5+.5; }
float widle(){ return clamp(1.-wl-wt-ws, 0., 1.); }
/* state signatures shared by every soul */
/* listening: sound coming IN. Rings contract toward the body, and a VU tick ring sits just outside it. */
float fxListen(vec2 q, float r, float rim, float ang){
  float k = fract((r-rim)*7. + time*1.1);
  float ring = glow(k-.5, .07) * step(rim, r) * glow(r-rim, .38) * .9;
  float a = fract(ang/6.2831853*28. + time*.05);
  float lv = band(abs(ang)/3.14159265);
  float tick = step(abs(a-.5), .14) * glow(r-(rim+.075), .006 + lv*.03) * (.6 + lv*1.5);
  return clamp(ring + tick, 0., 1.);
}
/* thinking: churn. A scan band sweeps the body, sparks orbit fast. */
float fxThink(vec2 q, float r, float rim){
  float sweepY = (fract(time*.55)*2.-1.)*(rim+.1);
  float sweep = glow(q.y - sweepY, .025) * step(r, rim+.05) * .8;
  float sp = 0.;
  for (int i=0;i<6;i++){ float fi=float(i); float a = flow*(1.4+fi*.11) + fi*1.047; float rr = rim + .09 + .05*sin(time*2.+fi); vec2 pp = vec2(cos(a),sin(a))*rr; sp += glow(length(q-pp), .012) * (.6+.4*sin(time*7.+fi)); }
  return clamp(sweep + sp, 0., 1.);
}
/* speaking: sound going OUT. Waves expand from the rim with the voice, and a waveform runs through the center. */
float fxSpeak(vec2 q, float r, float rim){
  float k = fract((r-rim)*6. - time*1.6);
  float wave = glow(k-.5, .06) * step(rim, r) * glow(r-rim, .3) * (.3 + mouth*1.2);
  float x = q.x*1.1 + .5;
  float env = band(clamp(x,0.,1.))*.5 + band(clamp(1.-x,0.,1.))*.5;
  float y = (env - .25) * .22 * mouth * sin(q.x*52. + time*26.) + .02*mouth*sin(q.x*17. - time*9.);
  float wf = glow(q.y - y, .007 + mouth*.004) * step(abs(q.x), rim*1.9) * glow(q.x, rim*1.3) * (.4 + mouth*1.2);
  return clamp(wave + wf, 0., 1.);
}
