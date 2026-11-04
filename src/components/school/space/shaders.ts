/* The schools space (SchoolsSpace.tsx): GLSL for the worlds, their air and rings, the quiet
   star and the dust of the orbital plane. Noise is Ashima/Gustavson simplex. */

export const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
float fbm(vec3 p){float f=0.,a=.5;for(int i=0;i<6;i++){f+=a*snoise(p);p*=2.02;a*=.5;}return f;}
float fbm3(vec3 p){float f=0.,a=.5;for(int i=0;i<3;i++){f+=a*snoise(p);p*=2.03;a*=.5;}return f;}
float ridged(vec3 p){float f=0.,a=.5;for(int i=0;i<5;i++){f+=a*(1.-abs(snoise(p)));p*=2.1;a*=.5;}return f;}
vec3 hash3(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return fract(sin(p)*43758.5453);}
float worley(vec3 p){vec3 i=floor(p),f=fract(p);float d=1.;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){vec3 g=vec3(x,y,z);vec3 o=hash3(i+g);d=min(d,length(g+o-f));}return d;}
`;

export const PLANET_VERT = /* glsl */ `varying vec3 vO; varying vec3 vN; varying vec3 vW;
      void main(){ vO = normalize(position); vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

export const PLANET_FRAG = /* glsl */ `
      uniform vec3 uC[4]; uniform int uKind; uniform float uSeed, uSat, uCity, uBump; uniform vec3 uSun, uAtmo; uniform mat3 uRot; uniform vec2 uFog; uniform float uNight, uHaze, uLift;
      varying vec3 vO; varying vec3 vN; varying vec3 vW;
      // The surface's height, so light rakes across craters, ridges and coastlines near the terminator.
      float heightAt(vec3 p){
        vec3 s = p + uSeed;
        if (uKind == 3 || uKind == 4) {
          float h = fbm3(s * 1.6) * .5;
          float c = worley(s * 5.); h += -.9 * smoothstep(.32, .0, c) + .45 * smoothstep(.26, .33, c) * smoothstep(.42, .33, c);
          float c2 = worley(s * 13. + 3.); h += -.35 * smoothstep(.2, .0, c2);
          return h;
        }
        if (uKind == 2 || uKind == 6) { float h = fbm(s * 1.7); return max(h, uKind == 6 ? .32 : .04) + .15 * ridged(s * 3.5) * step(.06, h); }
        if (uKind == 7) return ridged(s * 3.2) * .8 + fbm3(s * 1.9) * .3;
        if (uKind == 5) return ridged(s * 2.6 + vec3(fbm3(s * 1.5))) * .7 + fbm3(s * 1.8) * .4;
        return 0.;
      }
      void main(){
        vec3 p = vO; vec3 s = p * 1.0 + uSeed;
        vec3 col = vec3(0.); float water = 0.; float cloud = 0.; float emit = 0.; vec3 emitC = uC[3];
        float lat = p.y;
        if (uKind == 0) { // gas giant: fine bands with turbulence along them
          vec3 w = vec3(fbm3(s * 2.2), 0., fbm3(s * 2.2 + 4.1));
          float b = lat + .045 * fbm(vec3(p.x * 2.2, p.y * 16., p.z * 2.2) + w * 2. + uSeed);
          float t1 = .5 + .5 * sin(b * 19.), t2 = .5 + .5 * sin(b * 47. + 1.3), t3 = .5 + .5 * sin(b * 113. + 2.1);
          col = mix(uC[0], uC[1], smoothstep(.2, .8, t1));
          col = mix(col, uC[2], smoothstep(.45, .95, t2) * .55);
          col = mix(col, uC[3], smoothstep(.6, 1., t3) * .25);
          float storm = smoothstep(.16, .05, length((p - normalize(vec3(.55, -.32, .78))) * vec3(1., 2.4, 1.)));
          col = mix(col, uC[3] * 1.05, storm * .75);
          col *= .92 + .14 * fbm(vec3(p.x * 6., p.y * 40., p.z * 6.) + w);
          col = mix(col, uC[0] * .8, smoothstep(.72, .98, abs(lat)) * .5);
        } else if (uKind == 1) { // ice giant: smooth, faint banding, high haze
          float b = lat + .02 * fbm(vec3(p.x * 2., p.y * 9., p.z * 2.) + uSeed);
          col = mix(uC[0], uC[1], .5 + .5 * sin(b * 9.)); col = mix(col, uC[2], smoothstep(.6, 1., .5 + .5 * sin(b * 23.)) * .25);
          col = mix(col, uC[3], smoothstep(.12, .03, length((p - normalize(vec3(-.4, -.25, .88))) * vec3(1., 2., 1.))) * .8);
        } else if (uKind == 2 || uKind == 6) { // temperate / ocean world
          float h = fbm(s * 1.7) + .35 * (ridged(s * 3.5) - .5) * .5;
          float sea = uKind == 6 ? .32 : .04;
          float land = smoothstep(sea, sea + .03, h);
          vec3 deep = uC[0], shallow = uC[0] * 1.8 + vec3(0., .03, .05);
          vec3 ocean = mix(deep, shallow, smoothstep(sea - .25, sea, h));
          float moist = fbm3(s * 2.3 + 9.);
          vec3 ground = mix(uC[1], uC[2], smoothstep(-.1, .35, moist + abs(lat) * .2 - .1));
          ground = mix(ground, uC[3], smoothstep(.35, .6, h) * .6);
          col = mix(ocean, ground, land);
          col = mix(col, vec3(.92, .94, .96), smoothstep(.76, .9, abs(lat) + fbm3(s * 3.) * .08));
          water = 1. - land;
          vec3 cw = vec3(fbm3(s * 1.2 + 3.), fbm3(s * 1.2 + 7.), 0.) * 1.4;
          cloud = smoothstep(.08, .62, fbm(s * 2.4 + cw + 2.)) * .95;
        } else if (uKind == 3) { // arid world
          float h = fbm(s * 1.6);
          col = mix(uC[0], uC[1], smoothstep(-.35, .25, h)); col = mix(col, uC[2], smoothstep(.15, .6, fbm3(s * 3.1 + 5.)) * .55);
          col = mix(col, uC[3], smoothstep(.25, .55, ridged(s * 2.4) - .6) * .7);
          float cr = worley(s * 4.); col *= .82 + .18 * smoothstep(.12, .35, cr);
          col = mix(col, vec3(.9, .88, .86), smoothstep(.88, .96, abs(lat)) * .8);
        } else if (uKind == 4) { // rocky moon: maria and craters
          float h = fbm(s * 1.4);
          col = mix(uC[0], uC[2], smoothstep(-.4, .5, h)); col = mix(col, uC[3], smoothstep(.0, .35, fbm3(s * .9 + 2.)) * .45);
          float c1 = worley(s * 5.), c2 = worley(s * 13. + 3.);
          col *= .7 + .3 * smoothstep(.05, .3, c1); col += .07 * smoothstep(.3, .34, c1) * smoothstep(.42, .34, c1);
          col *= .85 + .15 * smoothstep(.04, .2, c2);
        } else if (uKind == 5) { // volcanic: dark crust, glowing fissures
          float h = fbm(s * 1.8);
          col = mix(uC[0], uC[2], smoothstep(-.3, .6, h));
          float r = ridged(s * 2.6 + vec3(fbm3(s * 1.5)));
          emit = smoothstep(.86, .97, r) * (.6 + .4 * fbm3(s * 6.));
        } else { // frozen
          float h = fbm(s * 1.9);
          col = mix(uC[0], uC[2], smoothstep(-.4, .5, h));
          float cr = ridged(s * 3.2);
          col = mix(col, uC[3], smoothstep(.82, .95, cr) * .6);
        }

        vec3 N = normalize(vN); vec3 L = normalize(uSun); vec3 V = normalize(cameraPosition - vW);
        if (uBump > 0.) {
          vec3 pn = normalize(vO);
          vec3 t1 = normalize(cross(pn, abs(pn.y) < .99 ? vec3(0., 1., 0.) : vec3(1., 0., 0.))); vec3 t2 = cross(pn, t1);
          float e = .004, h0 = heightAt(pn);
          float dx = (heightAt(normalize(pn + t1 * e)) - h0) / e, dy = (heightAt(normalize(pn + t2 * e)) - h0) / e;
          N = normalize(uRot * normalize(pn - uBump * .022 * (dx * t1 + dy * t2)));
        }
        float ndl = dot(N, L);
        float day = clamp(ndl * 1.15 + .02, 0., 1.);
        vec3 sunC = vec3(.96, .98, 1.) * 1.5;
        vec3 lit = col * day * sunC;
        float ndv = max(dot(N, V), 0.);
        lit *= .7 + .3 * pow(ndv, .45);                                     // the edge turns away from you
        lit += col * .05 * uNight * smoothstep(-.3, 1., dot(N, normalize(V + vec3(0., .5, 0.)))) * (1. - day);   // faint shine on the night side, so the shape still reads
        if (water > 0.) { vec3 H = normalize(L + V); lit += water * pow(max(dot(N, H), 0.), 90.) * .9 * day * sunC; }
        if (cloud > 0.) { lit = mix(lit, vec3(.95) * (day * .95 + .01) * sunC, cloud); }
        float night = 1. - smoothstep(-.12, .05, ndl);
        if (uCity > .5) { float c = smoothstep(.55, .9, fbm3(vO * 22. + 4.)) * (1. - water) * (1. - cloud * .8); lit += vec3(1., .72, .38) * c * night * 1.2; }
        lit += emitC * emit * (.5 + 1.2 * night) * 2.2;
        // thin atmosphere: scattered light at the limb on the day side
        float fr = pow(1. - max(dot(N, V), 0.), 4.);
        lit += uAtmo * fr * smoothstep(-.25, .45, ndl) * 1.1;
        float l = dot(lit, vec3(.299, .587, .114)); lit = mix(vec3(l), lit, uSat);
        float far = smoothstep(uFog.x, uFog.y, length(cameraPosition - vW));   // distance thins the light
        lit = mix(lit, lit * .4 + vec3(.003, .006, .013), clamp(far * .75 * uHaze, 0., 1.));
        lit *= uLift;
        gl_FragColor = vec4(lit, 1.);
      }`;

export const AIR_VERT = /* glsl */ `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;

export const AIR_FRAG = /* glsl */ `uniform vec3 uCol, uSun; uniform float uSat; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); float dv = dot(N, V);
        float f = pow(clamp(-dv / .3, 0., 1.), 3.);
        float sunSide = smoothstep(-.35, .5, dot(N, normalize(uSun)));
        vec3 c = uCol * f * sunSide * 1.4; float l = dot(c, vec3(.3,.59,.11)); c = mix(vec3(l), c, uSat);
        gl_FragColor = vec4(c, 1.); }`;

export const RING_VERT = /* glsl */ `varying vec3 vP; varying vec3 vW; void main(){ vP = position; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;

export const RING_FRAG = /* glsl */ `uniform float uIn, uOut, uR, uSat; uniform vec3 uSun, uC; varying vec3 vP; varying vec3 vW;
      void main(){ float t = (length(vP.xy) - uIn) / (uOut - uIn);
        float d = snoise(vec3(t * 28., 0., 1.)) * .6 + snoise(vec3(t * 90., 0., 3.)) * .4;
        float dens = .55 + .45 * d;
        dens *= smoothstep(0., .04, t) * smoothstep(1., .9, t);
        dens *= 1. - .92 * smoothstep(.52, .54, t) * smoothstep(.6, .58, t);   // a dark division
        dens *= mix(.45, 1., smoothstep(.0, .3, t));
        vec3 L = normalize(uSun);
        // the planet's shadow across the rings
        vec3 toC = uC - vW; float tt = dot(toC, L); float miss = length(vW + L * tt - uC);
        float shadow = (tt > 0. && miss < uR) ? .06 : 1.;
        vec3 col = mix(vec3(.42, .52, .66), vec3(.78, .85, .93), .5 + .5 * d) * 1.8;
        float l = dot(col, vec3(.3,.59,.11)); col = mix(vec3(l), col, uSat);
        gl_FragColor = vec4(col * shadow * (.35 + .65 * abs(dot(L, vec3(0.,1.,0.)))), dens * .85); }`;

export const DISC_VERT = /* glsl */ `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;

export const DISC_FRAG = /* glsl */ `varying vec3 vP;
      void main(){ float r = length(vP.xy); float a = atan(vP.y, vP.x);
        float lanes = .85 + .15 * sin(r * .35 + fbm3(vec3(vP.xy * .015, 1.)) * 3.);
        float n = fbm(vec3(vP.xy * .018, 3.)) * .5 + .5;
        float fade = smoothstep(6., 30., r) * smoothstep(260., 120., r);
        float glow = exp(-r / 70.);
        vec3 c = vec3(.35, .55, .9) * (.25 + .75 * glow);
        gl_FragColor = vec4(c, fade * (.008 + .03 * glow) * lanes * (.5 + .7 * n)); }`;

export const STAR_VERT = /* glsl */ `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;

export const STAR_FRAG = /* glsl */ `varying vec3 vN; void main(){ float mu = max(vN.z, 0.); vec3 c = vec3(.86, .93, 1.) * (.35 + .5 * pow(mu, .55)); gl_FragColor = vec4(c * .95, 1.); }`;


/* The sky behind the worlds: Society's photo for the nebula, read soft so its own
   (upscaled, blurry) stars melt away and only the glow is left. No stars of its own. */
export const SKY_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1., 1.); }`;

export const SKY_FRAG = /* glsl */ `uniform sampler2D uPhoto; uniform float uHasPhoto, uSky; uniform vec2 uRepeat, uOffset; uniform vec3 uNight;
varying vec2 vUv;
void main(){
  vec3 col = uNight;
  if (uHasPhoto > .5) {
    vec3 photo = texture2D(uPhoto, vUv * uRepeat + uOffset, 1.6).rgb;
    col = max(col, photo * uSky);
  }
  gl_FragColor = vec4(col, 1.);
}`;
