import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import {
  AIR_FRAG, AIR_VERT, DISC_FRAG, DISC_VERT, NOISE, PLANET_FRAG, PLANET_VERT,
  RING_FRAG, RING_VERT, STAR_FRAG, STAR_VERT,
} from "./shaders";
import type { SpaceTuning, SpaceView } from "./spaceTuning";
import { AIR, PAL, RELIEF, SHADER_KIND, hash, kindOf, type Kind } from "./worldLook";

export type { SpaceTuning, SpaceView } from "./spaceTuning";

/**
 * The schools space: every school a world, its size what its students have
 * made, all of them in shades of blue and told apart by what is on them —
 * cloud bands, storms, oceans, craters, ice, glowing fissures.
 *
 * Two views. "level" sits nearly in the plane of the system, so the orbits lie
 * flat and perspective carries the depth; "open" looks out into open space,
 * the school with the most uploads nearest. Rebuilt whole on every change,
 * which is cheap: the shader programs are compiled once and reused.
 */

export type SpaceSchool = { id: string; name: string; value: number };

/** A world as it lands on screen, in canvas pixels. */
export type ProjectedWorld = { id: string; rank: number; x: number; y: number; r: number };

export type SpaceFrame = { worlds: ProjectedWorld[]; star: { x: number; y: number; r: number } | null };

/** Screen spots for the open view (x, y in -1..1 across the part of the canvas left of the panel). */
const OPEN_SPOTS = [[0.12, 0.42], [-0.28, 0.6], [0.33, -0.12], [-0.05, 0.12], [0.3, 0.62], [-0.42, 0.3], [0.18, -0.45], [-0.15, 0.82], [0.02, -0.2], [0.4, 0.25], [-0.22, 0.38], [0.1, 0.72], [0.38, -0.62], [-0.4, 0.82], [0.22, 0.1], [-0.8, 0.12], [-0.72, -0.4], [-0.48, 0.55], [-0.2, -0.66], [0.25, 0.32]];
const OPEN_SPOTS_NARROW = [[0.45, 0.62], [-0.35, 0.72], [0.55, 0.3], [-0.05, 0.42], [0.1, 0.82], [0.2, 0.18], [0.75, 0.78], [-0.3, 0.3], [0.3, 0.48], [-0.72, 0.82], [0.8, 0.12], [-0.45, 0.55], [0.82, 0.5], [0.0, 0.65], [0.55, 0.12], [0.4, 0.9], [-0.15, 0.58], [0.7, 0.4], [-0.6, 0.66], [0.25, 0.7]];

type World = { id: string; rank: number; r: number; group: THREE.Group; body: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> };

export type BuildInput = {
  schools: SpaceSchool[];
  view: SpaceView;
  tuning: SpaceTuning;
  width: number;
  height: number;
  /** Left edge of the panel over the canvas, in canvas pixels; the scene keeps clear of it. Null when nothing covers it. */
  panelLeft: number | null;
};

const SKY_PHOTO = "/images/society/society_space.webp";
const SKY_ASPECT = 1915 / 821;
/** Where the photo is anchored when the screen crops it (Society's own framing). */
const SKY_X = 0.64;

export function createSchoolsScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  // Full resolution, and a tone curve that leaves the sky photo's colours as they are.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;

  // Society's photographed sky (society/discover/SocietySky.tsx), so the two pages share one night.
  const NIGHT = new THREE.Color("#07111b");
  let sky: THREE.Texture | null = null;
  new THREE.TextureLoader().load(SKY_PHOTO, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    sky = texture;
    if (lastInput) build(lastInput);
  });
  let lastInput: BuildInput | null = null;

  let scene = new THREE.Scene();
  let camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20000);
  let composer: EffectComposer | null = null;
  let worlds: World[] = [];
  let star: THREE.Vector3 | null = null;
  let spinning = false;
  let last = 0;
  let size = { w: 1, h: 1 };

  const disposeScene = () => {
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
    composer?.dispose();
  };

  const planetMaterial = (kind: Kind, seed: number, t: SpaceTuning) =>
    new THREE.ShaderMaterial({
      uniforms: {
        uC: { value: PAL[kind].map((c) => new THREE.Vector3(...c)) },
        uKind: { value: SHADER_KIND[kind] },
        uSeed: { value: seed },
        uSun: { value: new THREE.Vector3() },
        uAtmo: { value: new THREE.Vector3(...(AIR[kind] ?? [0, 0, 0])) },
        uSat: { value: 1 },
        uCity: { value: kind === "terran" ? 1 : 0 },
        uBump: { value: RELIEF[kind] ?? 0 },
        uRot: { value: new THREE.Matrix3() },
        uFog: { value: new THREE.Vector2(1e5, 2e5) },
        uNight: { value: t.night },
        uHaze: { value: t.haze },
        uLift: { value: t.brightness },
      },
      vertexShader: PLANET_VERT,
      fragmentShader: NOISE + PLANET_FRAG,
    });

  const airShell = (r: number, kind: Kind) => {
    const color = AIR[kind];
    if (!color) return null;
    const material = new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Vector3(...color) }, uSun: { value: new THREE.Vector3() }, uSat: { value: 1 } },
      vertexShader: AIR_VERT,
      fragmentShader: AIR_FRAG,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return new THREE.Mesh(new THREE.SphereGeometry(r * 1.035, 96, 96), material);
  };

  const ringBand = (r: number, center: THREE.Vector3) => {
    const inner = r * 1.28, outer = r * 2.35;
    const material = new THREE.ShaderMaterial({
      uniforms: { uIn: { value: inner }, uOut: { value: outer }, uSun: { value: new THREE.Vector3() }, uC: { value: center.clone() }, uR: { value: r }, uSat: { value: 1 } },
      vertexShader: RING_VERT,
      fragmentShader: NOISE + RING_FRAG,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    return new THREE.Mesh(new THREE.RingGeometry(inner, outer, 256, 1), material);
  };

  function build(input: BuildInput): SpaceFrame {
    const { schools, view, tuning: t, width: W, height: H } = input;
    lastInput = input;
    disposeScene();
    scene = new THREE.Scene();
    worlds = [];
    star = null;
    size = { w: W, h: H };
    renderer.setSize(W, H, false);
    const narrow = input.panelLeft === null || W < 700;
    const panelLeft = input.panelLeft ?? W;

    const fovFor = (horizontalDeg: number) => (2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(horizontalDeg / 2)) / (W / H)) * 180) / Math.PI;
    camera = new THREE.PerspectiveCamera(
      view === "open" ? (narrow ? fovFor(30) : 42) : narrow ? fovFor(27) : 44,
      W / H, 0.1, 20000
    );
    // Centre the scene in the part of the canvas the panel leaves open.
    const sx = narrow ? 0 : Math.max(0, Math.round((W - panelLeft + 24) / 2));

    if (sky) {
      // Cover the canvas the way Society covers its page.
      const aspect = W / H;
      sky.repeat.set(aspect > SKY_ASPECT ? 1 : aspect / SKY_ASPECT, aspect > SKY_ASPECT ? SKY_ASPECT / aspect : 1);
      sky.offset.set((1 - sky.repeat.x) * SKY_X, (1 - sky.repeat.y) * 0.5);
      scene.background = sky;
      scene.backgroundIntensity = t.sky;
    } else {
      scene.background = NIGHT;
    }

    const addWorld = (school: SpaceSchool, i: number, pos: THREE.Vector3, r: number, ring?: { tilt: number; yaw: number }) => {
      const kind = kindOf(school.id);
      const group = new THREE.Group();
      group.position.copy(pos);
      scene.add(group);
      const body = new THREE.Mesh(new THREE.SphereGeometry(r, 128, 128), planetMaterial(kind, 1.7 + (hash(school.id) % 997) / 97, t));
      body.rotation.set(0.2, (i * 1.7) % 6.28, -0.18);
      group.add(body);
      const air = airShell(r, kind);
      if (air) group.add(air);
      if (kind === "ringgas" && ring) {
        const band = ringBand(r, pos);
        band.rotation.x = Math.PI / 2 - ring.tilt;
        band.rotation.y = ring.yaw;
        group.add(band);
      }
      worlds.push({ id: school.id, rank: i + 1, r, group, body });
    };

    let sunDir: (pos: THREE.Vector3) => THREE.Vector3;
    let fog: THREE.Vector2;

    if (view === "open") {
      if (sx) camera.setViewOffset(W + 2 * sx, H, 2 * sx, 0, W, H);
      camera.position.set(0, 0, 0);
      camera.lookAt(0, 0, -1);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();
      const at = (nx: number, ny: number, dist: number) => {
        const v = new THREE.Vector3(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize();
        return camera.position.clone().add(v.multiplyScalar(dist));
      };
      const radiusOf = (n: number) => (0.25 + 3.4 * Math.sqrt(n / 2300)) * t.size;
      const spots = narrow ? OPEN_SPOTS_NARROW : OPEN_SPOTS;
      schools.forEach((school, i) => {
        if (i === 0) {
          addWorld(school, 0, narrow ? at(-0.3, -0.02, 130) : at(-0.46, -0.2, 100), radiusOf(school.value) * 2.2, { tilt: 0.3, yaw: -0.3 });
          return;
        }
        const k = i - 1;
        const spot = spots[k] ?? [Math.cos(k * 2.39996) * 0.8, Math.sin(k * 2.39996) * 0.8];
        const dist = Math.min(110 + k * 48 + k * k * 4, 5200);
        addWorld(school, i, at(spot[0]!, spot[1]!, dist), radiusOf(school.value) * (2.2 + k * 0.08), { tilt: 0.42, yaw: 0.12 });
      });
      const sun = new THREE.Vector3(0.86, 0.42, -0.22).normalize();
      sunDir = () => sun.clone();
      fog = new THREE.Vector2(220, 1500);
    } else {
      const sy = Math.round(H * (narrow ? 0.12 : 0.1));
      camera.setViewOffset(W + 2 * sx, H + 2 * sy, 2 * sx, 2 * sy, W, H);
      const lift = narrow ? t.cameraHeight * 2.6 : t.cameraHeight; // a tall screen looks down a little more, to spread the system out
      camera.position.set(0, lift, narrow ? 235 : 185);
      camera.lookAt(0, narrow ? -3 : -2, 0);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();

      const starMesh = new THREE.Mesh(new THREE.SphereGeometry(2, 64, 64), new THREE.ShaderMaterial({ vertexShader: STAR_VERT, fragmentShader: STAR_FRAG }));
      scene.add(starMesh);
      star = new THREE.Vector3();

      const disc = (pos: THREE.Vector3, r: number) => {
        const c = pos.clone().project(camera);
        const e = pos.clone().add(new THREE.Vector3(r, 0, 0).applyQuaternion(camera.quaternion)).project(camera);
        return { x: (c.x * 0.5 + 0.5) * W, y: (-c.y * 0.5 + 0.5) * H, r: Math.abs(e.x - c.x) * 0.5 * W, z: c.z };
      };
      const sunOnScreen = disc(new THREE.Vector3(), 3.2);
      const taken = [{ x: sunOnScreen.x, y: sunOnScreen.y, r: 30 }];
      const k = narrow ? 0.74 : 1;
      const right = narrow ? W - 8 : panelLeft - 20, floor = H - (narrow ? 110 : 60), top = narrow ? 130 : 104; // the site header lies over the top
      const refD = camera.position.length();
      schools.forEach((school, i) => {
        const rad = (i < 15 ? 27 + i * 7.8 : 148 + (i - 15) * 6) * k;
        const r0 = (1 + 5 * Math.sqrt(school.value / 2300)) * (narrow ? 0.78 : 0.86) * t.size;
        // On screen a world's size is its uploads; nearness adds only a little.
        const sized = (p: THREE.Vector3) => r0 * Math.pow(camera.position.distanceTo(p) / refD, 0.6);
        const ringed = kindOf(school.id) === "ringgas";
        const base = i * 2.39996 + 0.5;
        // Walk along the orbit to the first place that is on screen and clear of the others (and of the name under it).
        let angle = base;
        for (let step = 0; step < 48; step++) {
          const a = base + step * 0.131;
          const p = new THREE.Vector3(Math.cos(a) * rad, 0, Math.sin(a) * rad);
          const d = disc(p, sized(p) * (ringed ? 2.45 : 1));
          const clear = d.z < 1 && d.x - d.r > 12 && d.x + d.r < right && d.y - d.r > top && d.y + d.r + (narrow ? 26 : 34) < floor
            && taken.every((o, n) => Math.hypot(o.x - d.x, (o.y - d.y) * 1.25) > o.r + d.r + (n === 0 ? 16 : narrow ? 20 : 30));
          if (clear) {
            angle = a;
            taken.push(d);
            break;
          }
          if (step === 47) {
            const p0 = new THREE.Vector3(Math.cos(base) * rad, 0, Math.sin(base) * rad);
            taken.push(disc(p0, sized(p0)));
          }
        }
        const pos = new THREE.Vector3(Math.cos(angle) * rad, 0, Math.sin(angle) * rad);
        addWorld(school, i, pos, sized(pos), { tilt: 0.42, yaw: 0.12 });
        const orbit = new THREE.EllipseCurve(0, 0, rad, rad).getPoints(480).map((p) => new THREE.Vector3(p.x, 0, p.y));
        scene.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(orbit),
          new THREE.LineBasicMaterial({ color: 0x8fb8dd, transparent: true, opacity: i < 15 ? 0.1 : 0.05 })
        ));
      });

      const dust = new THREE.Mesh(
        new THREE.RingGeometry(6, 260, 256, 1),
        new THREE.ShaderMaterial({
          vertexShader: DISC_VERT,
          fragmentShader: NOISE + DISC_FRAG,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        })
      );
      dust.rotation.x = -Math.PI / 2;
      scene.add(dust);

      sunDir = (pos) => pos.clone().negate().normalize().add(camera.position.clone().sub(pos).normalize().multiplyScalar(0.75)).normalize();
      fog = narrow ? new THREE.Vector2(250, 520) : new THREE.Vector2(190, 420);
    }

    for (const world of worlds) {
      world.body.updateMatrixWorld(true);
      const u = world.body.material.uniforms;
      u.uRot!.value.setFromMatrix4(world.body.matrixWorld);
      u.uFog!.value.copy(fog);
      const light = sunDir(world.group.position);
      u.uSun!.value.copy(light);
      for (const child of world.group.children) {
        const m = (child as THREE.Mesh).material as THREE.ShaderMaterial;
        if (m !== world.body.material && m.uniforms?.uSun) m.uniforms.uSun.value.copy(light);
      }
    }

    const pr = renderer.getPixelRatio();
    // Multisampled, so the edges of the worlds and the orbit lines stay crisp through the passes.
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W * pr, H * pr, { type: THREE.HalfFloatType, samples: pr < 1.5 ? 4 : 2 }));
    composer.setPixelRatio(pr);
    composer.setSize(W, H);
    composer.addPass(new RenderPass(scene, camera));
    if (t.depth > 0) {
      composer.addPass(new BokehPass(scene, camera, {
        focus: view === "open" ? 150 : camera.position.length(),
        aperture: (view === "open" ? 0.0008 : 0.0011) * t.depth,
        maxblur: 0.0018 * Math.min(2, t.depth),
      }));
    }
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), view === "open" ? 0.28 : 0.16, 0.4, 0.94));
    composer.addPass(new OutputPass());

    spinning = t.spin && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    render();
    return frame();
  }

  function frame(): SpaceFrame {
    const { w, h } = size;
    const toScreen = (pos: THREE.Vector3, r: number) => {
      const c = pos.clone().project(camera);
      const e = pos.clone().add(new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(r)).project(camera);
      return { x: (c.x * 0.5 + 0.5) * w, y: (-c.y * 0.5 + 0.5) * h, r: Math.abs(e.x - c.x) * 0.5 * w, behind: c.z > 1 };
    };
    const projected = worlds.flatMap((world) => {
      const s = toScreen(world.group.position, world.r);
      return s.behind ? [] : [{ id: world.id, rank: world.rank, x: s.x, y: s.y, r: s.r }];
    });
    const starOnScreen = star ? toScreen(star, 2) : null;
    return { worlds: projected, star: starOnScreen ? { x: starOnScreen.x, y: starOnScreen.y, r: 18 } : null };
  }

  function render() {
    composer?.render();
  }

  /** One frame of slow spin; the caller drives it from requestAnimationFrame while the scene is on screen. */
  function tick(now: number) {
    if (!spinning) return false;
    // The spin is slow, so 30 frames a second is plenty and halves the work.
    if (last && now - last < 32) return true;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    for (const world of worlds) {
      world.body.rotation.y += dt * 0.035;
      world.body.updateMatrixWorld(true);
      world.body.material.uniforms.uRot!.value.setFromMatrix4(world.body.matrixWorld);
    }
    render();
    return true;
  }

  const raycaster = new THREE.Raycaster();
  function pick(x: number, y: number): string | null {
    const ndc = new THREE.Vector2((x / size.w) * 2 - 1, -(y / size.h) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(worlds.map((w) => w.body), false)[0];
    return hit ? worlds.find((w) => w.body === hit.object)?.id ?? null : null;
  }

  function dispose() {
    lastInput = null;
    sky?.dispose();
    disposeScene();
    renderer.dispose();
  }

  return { build, tick, render, pick, dispose, isSpinning: () => spinning, resetClock: () => { last = 0; } };
}

export type SchoolsScene = ReturnType<typeof createSchoolsScene>;
