/**
 * What each school's world looks like. Every world is a real planetary
 * surface map (Solar System Scope, CC BY 4.0, from NASA data) in its own
 * colours, lit the way that kind of body is lit, as space games and orbital
 * photographs show them. A "blue tone" setting can pull them all toward the
 * page's night blues. Kept apart from three.js so the ranking can show the
 * same world as a small chip without loading the scene.
 */

export type Kind = "gas" | "ringgas" | "ice" | "terran" | "desert" | "rock" | "lava" | "ocean" | "frozen";

type RGB = [number, number, number];

export type Look = {
  /** The surface map, under /images/schools/worlds. */
  map: string;
  /** The map's 1st and 99th percentile brightness, so the blue tone spans its whole range. */
  levels: [number, number];
  /** Its own colours, a little desaturated or tinted where a kind asks for it. */
  saturation: number;
  tone: RGB;
  /** Dark, middle and light tones in the page's night blues (linear light), for the blue tone setting. */
  ramp: [RGB, RGB, RGB];
  /** Dark, middle and light of its natural colouring, for the chip in the ranking. */
  chip: [RGB, RGB, RGB];
  /** 1 for airless rock (a full moon stays bright out to its edge), 0 for a world wrapped in gas. */
  rocky: number;
  /** How much the limb darkens, as it does on a gas giant. */
  limb: number;
  /** Relief read from the map, raking across craters near the terminator. */
  bump: number;
  /** The colour its air scatters, if it has any, and how thick it looks. */
  air: RGB | null;
  airStrength?: number;
  /** Weather over the surface (a map of its own), with shadows on the ground below. */
  clouds?: string;
  /** Sun glint off open water, and city lights on the night side. */
  gloss?: number;
  cities?: number;
};

export const LOOK: Record<Kind, Look> = {
  gas: {
    map: "jupiter", levels: [0.475, 0.875], saturation: 0.85, tone: [1, 0.98, 0.95],
    ramp: [[0.02, 0.045, 0.1], [0.17, 0.26, 0.42], [0.72, 0.79, 0.88]], chip: [[0.1, 0.07, 0.05], [0.48, 0.37, 0.27], [0.86, 0.79, 0.69]],
    rocky: 0, limb: 1, bump: 0, air: [0.55, 0.62, 0.8], airStrength: 0.5,
  },
  ringgas: {
    map: "saturn", levels: [0.576, 0.937], saturation: 0.8, tone: [1, 0.97, 0.92],
    ramp: [[0.07, 0.1, 0.16], [0.32, 0.39, 0.5], [0.74, 0.78, 0.85]], chip: [[0.14, 0.11, 0.07], [0.58, 0.5, 0.37], [0.9, 0.85, 0.72]],
    rocky: 0, limb: 1, bump: 0, air: [0.6, 0.62, 0.72], airStrength: 0.45,
  },
  ice: {
    map: "neptune", levels: [0.247, 0.525], saturation: 0.9, tone: [0.95, 1, 1.05],
    ramp: [[0.02, 0.05, 0.22], [0.08, 0.2, 0.62], [0.42, 0.6, 0.95]], chip: [[0.02, 0.05, 0.22], [0.08, 0.2, 0.62], [0.42, 0.6, 0.95]],
    rocky: 0, limb: 0.8, bump: 0, air: [0.3, 0.5, 1], airStrength: 0.8,
  },
  terran: {
    map: "earth", levels: [0.227, 0.925], saturation: 0.92, tone: [0.97, 1, 1.03],
    ramp: [[0.01, 0.03, 0.1], [0.1, 0.2, 0.36], [0.7, 0.76, 0.84]], chip: [[0.01, 0.03, 0.12], [0.08, 0.2, 0.38], [0.72, 0.78, 0.85]],
    rocky: 0, limb: 0.2, bump: 0, air: [0.28, 0.52, 1], airStrength: 1, clouds: "earth-clouds", gloss: 1, cities: 1,
  },
  ocean: {
    map: "uranus", levels: [0.639, 0.863], saturation: 0.85, tone: [0.97, 1, 1],
    ramp: [[0.08, 0.2, 0.3], [0.26, 0.46, 0.6], [0.58, 0.76, 0.85]], chip: [[0.08, 0.22, 0.28], [0.32, 0.58, 0.64], [0.68, 0.86, 0.88]],
    rocky: 0, limb: 0.9, bump: 0, air: [0.4, 0.7, 0.85], airStrength: 0.7,
  },
  desert: {
    map: "mars", levels: [0.216, 0.996], saturation: 0.82, tone: [1, 0.97, 0.95],
    ramp: [[0.035, 0.05, 0.075], [0.22, 0.26, 0.33], [0.6, 0.64, 0.71]], chip: [[0.09, 0.04, 0.02], [0.42, 0.2, 0.1], [0.8, 0.56, 0.4]],
    rocky: 0.6, limb: 0, bump: 0.6, air: [0.7, 0.55, 0.45], airStrength: 0.3,
  },
  rock: {
    map: "moon", levels: [0.286, 0.808], saturation: 0.6, tone: [1, 1, 1],
    ramp: [[0.03, 0.035, 0.045], [0.28, 0.3, 0.34], [0.78, 0.8, 0.84]], chip: [[0.04, 0.04, 0.04], [0.3, 0.3, 0.29], [0.78, 0.77, 0.75]],
    rocky: 1, limb: 0, bump: 1, air: null,
  },
  lava: {
    map: "mercury", levels: [0.341, 0.725], saturation: 0.7, tone: [1, 0.98, 0.95],
    ramp: [[0.025, 0.03, 0.045], [0.19, 0.22, 0.27], [0.56, 0.6, 0.67]], chip: [[0.04, 0.035, 0.03], [0.25, 0.23, 0.21], [0.62, 0.6, 0.57]],
    rocky: 1, limb: 0, bump: 1, air: null,
  },
  frozen: {
    // Venus's radar surface, bleached: a cream world of frozen flows, like the icy moons.
    map: "venus", levels: [0.302, 0.831], saturation: 0.25, tone: [1.05, 1.03, 1],
    ramp: [[0.13, 0.18, 0.25], [0.44, 0.52, 0.62], [0.8, 0.85, 0.91]], chip: [[0.12, 0.11, 0.1], [0.5, 0.47, 0.43], [0.86, 0.84, 0.8]],
    rocky: 0.8, limb: 0, bump: 0.5, air: [0.6, 0.7, 0.9], airStrength: 0.25,
  },
};

/** The schools we know get the world that suits them; the rest one picked from their id. */
const KIND_BY_ID: Record<string, Kind> = {
  "penn-state": "ringgas", snu: "gas", ucla: "terran", pku: "desert", nyu: "ice", tokyo: "ringgas", tsinghua: "ocean",
  berkeley: "desert", toronto: "frozen", melbourne: "gas", oxford: "rock", nus: "lava", sydney: "desert", mit: "ice", mcgill: "rock",
};
const KINDS_FOR_OTHERS: Kind[] = ["rock", "frozen", "desert", "lava", "rock", "frozen", "ocean", "lava"];

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const kindOf = (id: string): Kind => KIND_BY_ID[id] ?? KINDS_FOR_OTHERS[hash(id) % KINDS_FOR_OTHERS.length]!;

/** Two worlds of the same kind still differ: a touch lighter or darker, warmer or cooler. */
export function toneFor(id: string): RGB {
  const h = hash(id + "#tone");
  const light = 0.9 + ((h % 1000) / 1000) * 0.2;
  const warm = (((h >>> 10) % 1000) / 1000 - 0.5) * 0.16;
  const [r, g, b] = LOOK[kindOf(id)].tone;
  return [r * light * (1 + warm), g * light, b * light * (1 - warm)];
}

/** The night-blue tones for a school's world, varied the same way. */
export function rampFor(id: string): [RGB, RGB, RGB] {
  const [tr, , tb] = toneFor(id);
  const light = (tr + tb) / 2;
  return LOOK[kindOf(id)].ramp.map(([r, g, b]) => [r * light, g * light, b * light] as RGB) as [RGB, RGB, RGB];
}

const srgb = (v: number) => Math.round(255 * Math.min(1, v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
const css = (c: RGB) => `rgb(${c.map(srgb).join(",")})`;

/** A world as a small lit chip, for the ranking and the size key. */
export function worldSwatch(id: string): string {
  const tone = toneFor(id);
  const [deep, mid, light] = LOOK[kindOf(id)].chip.map((c) => c.map((v, i) => v * tone[i]!) as RGB);
  return `radial-gradient(circle at 34% 30%, ${css(light!)}, ${css(mid!)} 40%, ${css(deep!)} 72%, #02060c 100%)`;
}
