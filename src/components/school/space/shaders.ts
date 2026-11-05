/* The schools space (SchoolsSpace.tsx): GLSL for the worlds, their air and rings, the small
   star at the centre and the dust of the orbital plane. Noise is Ashima/Gustavson simplex. */

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

/* Saturn's rings from the inside out: the faint C ring, the dense B ring, the Cassini Division,
   the A ring with the Encke Gap, the thin F ring; fine ringlets on top, faded out where they
   would be finer than a pixel (fw is the ring's width of one pixel, 0..1 across the rings). */
export const RING_PROFILE = /* glsl */ `
float ringDensity(float t, float fw){
  float d = .12 + .16 * smoothstep(0., .28, t);
  d = mix(d, .8 + .15 * smoothstep(.3, .5, t), smoothstep(.27, .3, t));
  d = mix(d, .05, smoothstep(.55, .565, t));
  d = mix(d, .6, smoothstep(.61, .625, t));
  d *= 1. - .85 * smoothstep(.872, .878, t) * (1. - smoothstep(.884, .89, t));
  d *= 1. - smoothstep(.915, .935, t);
  d += .45 * smoothstep(.968, .972, t) * (1. - smoothstep(.976, .98, t));
  float s = 0., a = .5, f = 38.;
  for (int i = 0; i < 4; i++) { s += a * snoise(vec3(t * f, 1.7, 3.1 + float(i))) * (1. - smoothstep(.12, .45, f * fw)); f *= 2.3; a *= .62; }
  return clamp(d * (1. + .5 * s), 0., 1.) * smoothstep(0., .01, t) * step(t, 1.);
}
`;

export const PLANET_VERT = /* glsl */ `uniform vec3 uSun; varying vec2 vUv; varying vec3 vO; varying vec3 vN; varying vec3 vW; varying vec3 vLo;
      void main(){ vUv = uv; vO = normalize(position); vN = normalize(mat3(modelMatrix) * normal);
        vLo = transpose(mat3(modelMatrix)) * uSun;   // the sun in the world's own frame, for cloud shadows
        vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

/* A world, lit by one sun the way orbital photographs and space games show them (EVE Online's
   planets are the touchstone): its own colours from a real surface map; airless rock by
   Lommel-Seeliger, so a full moon stays bright to its edge, with relief from the map; gas by
   Lambert with a darkening limb; air that reddens the light at the terminator and lets it creep
   past it; clouds with their shadows cast on the ground, offset toward the sun; city lights on
   the night side; and a night side that is truly dark. */
export const PLANET_FRAG = /* glsl */ `
      uniform sampler2D uMap, uCloudMap; uniform float uHasMap, uHasClouds, uMirror, uFlip, uRocky, uLimb, uBump, uGloss, uCities, uSeed, uR;
      uniform float uSaturation, uTint, uAirK, uBias, uContrast, uSmooth; uniform vec3 uTone; uniform vec2 uLevels; uniform vec3 uC[3];
      uniform vec3 uSun, uAtmo; uniform vec2 uFog; uniform float uSat, uNight, uHaze, uLift;
      uniform vec3 uRingN, uCenter; uniform vec2 uRingR;
      varying vec2 vUv; varying vec3 vO; varying vec3 vN; varying vec3 vW; varying vec3 vLo;
      vec3 ramp(float t){ return t < .5 ? mix(uC[0], uC[1], t * 2.) : mix(uC[1], uC[2], t * 2. - 1.); }
      vec3 bumped(vec3 pos, vec3 n, vec2 dH){ // three.js's perturbNormalArb
        vec3 sx = dFdx(pos), sy = dFdy(pos); vec3 r1 = cross(sy, n), r2 = cross(n, sx);
        float det = dot(sx, r1); vec3 g = sign(det) * (dH.x * r1 + dH.y * r2);
        return normalize(abs(det) * n - g);
      }
      float luma(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
      void main(){
        vec2 uv = vec2(uMirror > .5 ? 1. - vUv.x : vUv.x, uFlip > .5 ? 1. - vUv.y : vUv.y);
        vec3 tex = texture2D(uMap, uv, uBias + uSmooth).rgb;   // linear light; read a touch soft, as a lens resolves it
        float lt = luma(tex);
        vec3 col = mix(vec3(lt), tex, uSaturation);
        col = max(mix(vec3(pow((uLevels.x + uLevels.y) * .5, 2.2)), col, uContrast), 0.) * uTone;
        float level = clamp((pow(lt, 1. / 2.2) - uLevels.x) / (uLevels.y - uLevels.x), 0., 1.);
        col = mix(col, ramp(level), uTint);
        if (uHasMap < .5) col = ramp(.45 + .2 * vO.y);

        vec3 N = normalize(vN); vec3 L = normalize(uSun); vec3 V = normalize(cameraPosition - vW);
        if (uBump > 0. && uHasMap > .5) {
          vec2 dx = dFdx(uv), dy = dFdy(uv);
          vec2 dH = vec2(luma(texture2D(uMap, uv + dx, uBias + uSmooth).rgb) - lt, luma(texture2D(uMap, uv + dy, uBias + uSmooth).rgb) - lt);
          N = bumped(vW, N, dH * uBump * uR * .02);
        }
        float ndl = dot(N, L), mu0 = max(ndl, 0.), mu = max(dot(N, V), 1e-3);
        // Air bends a little light past the terminator and reddens what reaches the ground there.
        float wrap = .07 * uAirK;
        float lambert = clamp((ndl + wrap) / (1. + wrap), 0., 1.);
        float lommel = min(2. * mu0 / (mu0 + mu), 1.2);
        float diffuse = mix(lambert, lommel, uRocky) * mix(1., pow(mu, .4), uLimb);
        vec3 sunC = vec3(1., .935, .83) * 1.85;   // a warm, low sun
        vec3 sunAtGround = sunC * mix(vec3(1., .5, .26), vec3(1.), mix(1., smoothstep(-.05, .32, ndl), min(uAirK, 1.)));
        vec3 lit = col * diffuse * sunAtGround;

        float water = 0.;
        if (uGloss > 0. && uHasMap > .5) {   // open water: darker, with the sun's glint
          water = smoothstep(.03, .1, tex.b - max(tex.r, tex.g)) * (1. - smoothstep(.3, .6, tex.r)) * uGloss;
          vec3 H = normalize(L + V);
          lit += water * (pow(max(dot(N, H), 0.), 140.) * .22 + pow(max(dot(N, H), 0.), 24.) * .05) * mu0 * sunC;
        }
        float cloud = 0.;
        if (uHasClouds > .5) {
          // Clouds ride with the world; their shadow falls on the ground a step away from the sun.
          vec3 n = normalize(vO); float st = max(length(n.xz), .02);
          vec3 east = vec3(n.z, 0., -n.x) / st, north = normalize(vec3(0., 1., 0.) - n * n.y);
          vec3 Lo = normalize(vLo);
          vec2 cuv = vUv + vec2(fract(uSeed * .37), 0.);
          vec2 off = vec2(dot(Lo, east) / (6.2832 * st), dot(Lo, north) / 3.1416) * .01;
          cloud = texture2D(uCloudMap, cuv, uBias).r;
          float shade = texture2D(uCloudMap, cuv + off, uBias + 1.).r;
          lit *= 1. - .6 * shade * smoothstep(-.1, .2, ndl);
          float cl = clamp((ndl + .1) / 1.1, 0., 1.);
          lit = mix(lit, vec3(.95, .96, .98) * cl * sunAtGround, cloud);
        }
        if (uCities > 0. && uHasMap > .5) {   // the night side's cities, along the land, under the cloud
          float land = (1. - water / max(uGloss, .01)) * (1. - smoothstep(.45, .7, tex.r));
          float c = smoothstep(.62, .86, fbm3(vO * 46. + uSeed)) * smoothstep(-.05, .35, fbm3(vO * 6. + uSeed + 3.));
          float dark = 1. - smoothstep(-.2, .02, ndl);
          lit += vec3(1., .64, .3) * c * land * dark * (1. - cloud * .8) * 1.1 * uCities;
        }
        if (uRingR.y > 0.) {   // the rings' shadow across the globe
          float den = dot(L, uRingN);
          if (abs(den) > 1e-4) {
            float tt = dot(uCenter - vW, uRingN) / den;
            if (tt > 0.) { float t = (length(vW + L * tt - uCenter) - uRingR.x) / (uRingR.y - uRingR.x); lit *= 1. - .75 * ringDensity(t, .004); }
          }
        }
        lit += col * .012 * uNight * smoothstep(-.2, 1., mu) * (1. - smoothstep(-.1, .15, ndl));   // only the faintest earthshine on the night side
        // Air seen edge-on: a thin haze over the limb, lit where the sun reaches it.
        float edge = pow(1. - mu, 2.6);
        lit = mix(lit, uAtmo * 1.2 * smoothstep(-.25, .3, ndl), edge * .55 * min(uAirK, 1.));
        float l = dot(lit, vec3(.299, .587, .114)); lit = mix(vec3(l), lit, uSat);
        float far = smoothstep(uFog.x, uFog.y, length(cameraPosition - vW));
        lit = mix(lit, lit * .4 + vec3(.003, .006, .013), clamp(far * .75 * uHaze, 0., 1.));
        lit *= uLift;
        gl_FragColor = vec4(lit, 1.);
      }`;

export const AIR_VERT = /* glsl */ `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;

/* The air beyond the limb: brightest where the sun lights it, reaching a little past the
   terminator and reddened there, and glowing all the way round when the sun is behind the world. */
export const AIR_FRAG = /* glsl */ `uniform vec3 uCol, uSun; uniform float uSat, uK; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); vec3 L = normalize(uSun);
        float f = pow(clamp(-dot(N, V) / .26, 0., 1.), 2.4);
        float sl = dot(N, L);
        float day = smoothstep(-.3, .35, sl);
        float behind = pow(max(dot(-V, L), 0.), 5.);
        vec3 c = uCol * (day + behind * 1.6);
        c *= mix(vec3(1.), vec3(1.3, .7, .45), (1. - smoothstep(0., .35, abs(sl))) * .7);
        c *= f * uK; float l = dot(c, vec3(.3,.59,.11)); c = mix(vec3(l), c, uSat);
        gl_FragColor = vec4(c, 1.); }`;

export const RING_VERT = /* glsl */ `varying vec3 vP; varying vec3 vW; varying vec3 vRN; void main(){ vP = position; vRN = normalize(mat3(modelMatrix) * vec3(0., 0., 1.)); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;

export const RING_FRAG = /* glsl */ `uniform float uIn, uOut, uR, uSat, uTint; uniform vec3 uSun, uC; varying vec3 vP; varying vec3 vW; varying vec3 vRN;
      void main(){ float t = (length(vP.xy) - uIn) / (uOut - uIn);
        float dens = ringDensity(t, fwidth(t));
        vec3 L = normalize(uSun), V = normalize(cameraPosition - vW);
        float sl = dot(L, vRN), sv = dot(V, vRN);
        // Seen from the sunlit face the rings shine; from the other face only their thin parts glow.
        float light = sl * sv > 0. ? .3 + .7 * pow(abs(sl), .4) : (.08 + .4 * (1. - dens)) * pow(abs(sl), .4);
        vec3 toC = uC - vW; float tt = dot(toC, L); float miss = length(vW + L * tt - uC);
        float shadow = (tt > 0. && miss < uR) ? .04 : 1.;
        vec3 col = mix(mix(vec3(.4, .36, .3), vec3(.88, .82, .7), smoothstep(.15, .5, t)), mix(vec3(.36, .42, .52), vec3(.8, .84, .9), smoothstep(.15, .5, t)), uTint) * mix(.8, 1.1, smoothstep(.62, .7, t) * (1. - smoothstep(.85, .93, t)) + .5 * (1. - step(.62, t)));
        col *= 1.5 * light * shadow;
        float l = dot(col, vec3(.3,.59,.11)); col = mix(vec3(l), col, uSat);
        gl_FragColor = vec4(col, dens * .92); }`;

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

export const STAR_FRAG = /* glsl */ `varying vec3 vN; void main(){ float mu = max(vN.z, 0.); vec3 c = vec3(1., .97, .92) * (1.25 + .35 * pow(mu, .5)); gl_FragColor = vec4(c, 1.); }`;


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

/* A camera's softness over the whole frame: a small optical blur (a nine-tap kernel, its radius
   in device pixels), so the worlds' edges sit in the image the way a lens draws them rather than
   cut out and laid on top. */
export const LENS_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;

export const LENS_FRAG = /* glsl */ `uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uRadius; varying vec2 vUv;
void main(){
  vec2 o = uTexel * uRadius;
  vec4 c = texture2D(tDiffuse, vUv) * .36;
  c += (texture2D(tDiffuse, vUv + vec2(o.x, 0.)) + texture2D(tDiffuse, vUv - vec2(o.x, 0.)) + texture2D(tDiffuse, vUv + vec2(0., o.y)) + texture2D(tDiffuse, vUv - vec2(0., o.y))) * .11;
  c += (texture2D(tDiffuse, vUv + o) + texture2D(tDiffuse, vUv - o) + texture2D(tDiffuse, vUv + vec2(o.x, -o.y)) + texture2D(tDiffuse, vUv + vec2(-o.x, o.y))) * .05;
  gl_FragColor = c;
}`;
