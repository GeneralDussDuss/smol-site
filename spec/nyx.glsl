/* Nyx: the ethereal nebula. Noisy rim, cloud body, wisp rings, a drifting nebula in the halo. */
void main(){
  vec2 p = gl_FragCoord.xy/res - .5;
  p.y -= bob;
  float ca=cos(roll), sa=sin(roll); vec2 q = vec2(p.x*ca-p.y*sa, p.x*sa+p.y*ca);
  q /= (1. + wl*.18 - widle()*.08 + ws*mouth*.05);
  float px = 1./res.x;
  float r=length(q); float ang=atan(q.y,q.x); float mirrored=abs(ang)/3.14159265;
  vec2 dir = vec2(cos(ang),sin(ang));
  float wob = fbm(dir*1.8 + vec2(time*.09, -time*.07)) - .5;
  float wob2 = fbm(dir*4.5 + vec2(-time*.13, time*.05)) - .5;
  float r0 = .19 + bass*.04 + beat*.015;
  float lv = (band(mirrored-.03)+band(mirrored)*2.+band(mirrored+.03))*.25;
  float rim = r0 + lv*.10 + wob*.09 + wob2*.03*(1.+energy);
  vec4 col=vec4(0.);
  vec2 nq = q*3.2 + vec2(flow*.12, time*.04);
  float neb = fbm(nq) * fbm(nq*1.7 + 3.1);
  float cloud = neb * glow(max(r-rim,0.), .20+energy*.08) * (.9 + energy*.9 + beat*.6);
  col = over(col, pal(fract(mirrored*.7 + neb*.5)), clamp(cloud*1.6,0.,.85));
  float halo = glow(max(r-rim,0.),.15)*(.18+energy*.35+beat*.3);
  col = over(col, pal(mirrored), halo*.7);
  float wave = rim + (1.-beat)*.32;
  float aW = glow(r-wave, px*5.)*beat*beat*.8;
  col = over(col, mix(c1,fg,.3), aW);
  for(int ps=0; ps<2; ps++){
    for(int k=0;k<3;k++){
      float fk=float(k); float tilt=.28+fk*.14;
      float sp = time*spin*(.15+fk*.07)*((k==1)?-1.:1.)+fk*2.1;
      vec2 rq = mat2(cos(sp),-sin(sp),sin(sp),cos(sp))*q;
      bool back = rq.y>0.;
      if((ps==0)!=back) continue;
      if(ps==0 && r<rim*.92) continue;
      float RR=.36+fk*.055 + wob*.02;
      vec2 e=vec2(rq.x, rq.y/tilt);
      float d=abs(length(e)-RR)*tilt;
      float line=glow(d, px*4.5);
      float ea=atan(e.y,e.x);
      float lvl=band(fract(ea/6.2831853+.5));
      float wisp = .5 + .5*fbm(vec2(ea*1.2, fk*3. + time*.2));
      vec3 rc=pal(.2+fk*.35);
      float a=line*(back?.22:.5)*(.3+lvl*1.2)*wisp;
      float bead=0.;
      for(int b=0;b<3;b++){ float ba=flow*(.9+fk*.3)+float(b)*2.094+fk; vec2 bp=vec2(cos(ba),sin(ba))*RR; bead+=glow(length(e-bp)*res.x, 5.+lvl*4.); }
      col = over(col, rc, clamp(a+bead*(back?.3:.8),0.,1.));
    }
    if(ps==0){
      float edge = smoothstep(rim+.07, rim-.10, r);
      float body_n = fbm(q*5. + vec2(time*.06, -time*.05));
      float aO = edge * (.55 + .45*body_n) + glow(max(r-rim,0.), .05)*.35*edge;
      aO = clamp(aO,0.,1.);
      if(aO>0.003){
        float zz=sqrt(max(0.,1.-pow(min(r/rim,1.),2.)));
        vec3 n=normalize(vec3(q/rim,zz));
        vec3 L=normalize(vec3(-.5,.6,.8));
        float diff=max(dot(n,L),0.);
        float fres=pow(1.-zz,2.0);
        float sw=swirl(q/rim, time*(.5+energy));
        float drift = fbm(q*2.2 + vec2(-time*.05, time*.035))*.6;
        vec3 body=mix(bg, pal(mirrored*.35+sw*.2+body_n*.25+drift), .20+diff*.3+sw*.18+body_n*.25);
        body += c3*fres*(.3+energy*.5+beat*.5);
        body = mix(body, pal(.66 + sw*.3), wt*.35);
        col=over(col, body, aO);
      }
    }
  }
  col = over(col, mix(c3, fg, .3), fxListen(q, r, rim, ang) * wl);
  col = over(col, mix(c2, fg, .5), fxThink(q, r, rim) * wt);
  col = over(col, mix(c1, fg, .55), fxSpeak(q, r, rim) * ws);
  col.a *= 1. - widle()*.25;
  gl_FragColor = vec4(col.rgb, col.a);
}
