/* Mochi: the cutie. A squishy blob with eyes that blink, blush, a mouth on the voice, hearts when she talks. */
void main(){
  vec2 p = gl_FragCoord.xy/res - .5;
  p.y -= bob*.6;
  float tilt = roll*.6 + wl*.14 - wt*.1;
  float ca=cos(tilt), sa=sin(tilt); vec2 q = vec2(p.x*ca-p.y*sa, p.x*sa+p.y*ca);
  q /= (1. + wl*.15 - widle()*.07);
  float px = 1./res.x;
  float sq = 1. + (bass-.15)*.9 - beat*.3 + ws*mouth*.12*sin(time*14.);
  vec2 e = vec2(q.x*sq, q.y/sq);
  float ang = atan(e.y,e.x);
  float wob = fbm(vec2(ang*1.3 + 3., time*.45)) - .5;
  float R0 = .235 + wob*.035;
  float d = length(e*vec2(1., 1.08 + .18*smoothstep(0.,-.22,e.y))) - R0;
  float body = smoothstep(px*2.5, -px*2.5, d);
  vec4 col = vec4(0.);
  float aura = glow(max(d,0.), .13 + energy*.05)*(.22+energy*.4+beat*.6+mouth*.3);
  float an = fbm(q*4. + vec2(time*.1, -time*.07));
  col = over(col, pal(.75 + an*.3), clamp(aura*(.6+an),0.,.8));
  float h = clamp(.5 - e.y/(2.*R0), 0., 1.);
  float bn = fbm(e*3. + vec2(time*.05, time*.03));
  vec3 bc = pal(.5 + h*.25 + bn*.2);
  bc = mix(bc, vec3(1.), .22*smoothstep(.0,-.2,d)*smoothstep(-.02,.16,e.y)*(1.-bn*.5));
  bc = mix(bc, mix(bc, fg, .45), smoothstep(-.03,0.,d)*.5);
  col = over(col, bc, body);
  float lid = max(blink, widle()*.38);
  vec2 look = vec2(sin(time*.37), sin(time*.53)*.4)*.012*(1.-blink)*(1.-wl) + vec2(.022, .03)*wt;
  vec2 eye = vec2(abs(e.x)-.082, e.y-.035) - look;
  float eyeScale = 1. + wl*.3;
  float ry = max(.012, .056*(1.-lid)*eyeScale);
  float de = length(vec2(eye.x/(.044*eyeScale), eye.y/ry)) - 1.;
  float eyeA = smoothstep(px*2.5, -px*2.5, de)*body;
  col = over(col, mix(bg, c2, .25), eyeA);
  vec2 hl = vec2(abs(e.x)-.068, e.y-.058) - look;
  float dh = length(hl/vec2(.015,.019)) - 1.;
  col = over(col, vec3(1.), smoothstep(px*2.5,-px*2.5,dh)*(1.-blink)*body);
  float bd = length(vec2(abs(e.x)-.145, e.y+.035)/vec2(.055,.03)) - 1.;
  col = over(col, pal(.9), smoothstep(.35,-.35,bd)*.6*body);
  float mo = .008 + mouth*.04;
  float md = length(vec2(e.x/(.03 + mouth*.012), (e.y+.075)/mo)) - 1.;
  col = over(col, mix(bg, c3, .3), smoothstep(px*2.5,-px*2.5,md)*body);
  for (int i=0;i<4;i++){ float fi=float(i); float ph=fract(time*.22+fi*.27);
    vec2 hp = vec2(sin(fi*2.1+time*.6)*.2, -.05+ph*.62);
    vec2 hq = (q-hp)*vec2(1.,1.15); hq.x = abs(hq.x);
    float hd = length(hq - vec2(.012, .012)) - .018;  hd = min(hd, length(hq - vec2(0., -.008)) - .024);
    float ha = smoothstep(px*2.,-px*2.,hd)*(1.-ph)*mouth*1.6;
    col = over(col, pal(.85+fi*.05), clamp(ha,0.,1.)); }
  for (int i=0;i<3;i++){ float fi=float(i); vec2 dp = vec2(.2 + fi*.055, .2 + fi*.07); float on = .35 + .65*step(.5, fract(time*1.1 - fi*.3));
    col = over(col, mix(c2, fg, .4), smoothstep(px*2.,-px*2., length(q-dp) - (.012 + fi*.006)) * on * wt); }
  float rr = R0*1.05;
  col = over(col, mix(c3, fg, .3), fxListen(q, length(e), rr, atan(e.y,e.x)) * wl * .8);
  col = over(col, mix(c1, fg, .5), fxSpeak(q, length(e), rr) * ws * .7);
  col.a *= 1. - widle()*.2;
  gl_FragColor = vec4(col.rgb, col.a);
}
