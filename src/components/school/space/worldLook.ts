/**
 * What each school's world looks like. Every world is a real planetary
 * surface map (Solar System Scope, CC BY 4.0, from NASA data), recoloured
 * into the page's night blues, and lit the way that kind of body is lit.
 * Kept apart from three.js so the ranking can show the same world as a small
 * chip without loading the scene.
 */

export type Kind = "gas" | "ringgas" | "ice" | "terran" | "desert" | "rock" | "lava" | "ocean" | "frozen";

type RGB = [number, number, number];

export type Look = {
  /** The surface map, under /images/schools/worlds. */
  map: string;
  /** Natural colour maps are kept in colour (and cooled); the rest are greyscale, mapped onto `ramp`. */
  natural?: boolean;
  /** Dark, middle and light tones of the surface, in linear light. Also the chip in the ranking. */
  ramp: [RGB, RGB, RGB];
  /** 1 for airless rock (a full moon stays bright out to its edge), 0 for a world wrapped in gas. */
  rocky: number;
  /** How much the limb darkens, as it does on a gas giant. */
  limb: number;
  /** Relief read from the map, raking across craters near the terminator. */
  bump: number;
  /** The colour of its air at the limb, if it has any. */
  air: RGB | null;
  clouds?: number;
  /** Sun glint off open water. */
  gloss?: number;
};

export const LOOK: Record<Kind, Look> = {
  gas: { map: "jupiter", ramp: [[0.02, 0.045, 0.1], [0.17, 0.26, 0.42], [0.72, 0.79, 0.88]], rocky: 0, limb: 1, bump: 0, air: [0.22, 0.36, 0.7] },
  ringgas: { map: "saturn", ramp: [[0.07, 0.1, 0.16], [0.32, 0.39, 0.5], [0.74, 0.78, 0.85]], rocky: 0, limb: 1, bump: 0, air: [0.25, 0.38, 0.68] },
  ice: { map: "neptune", natural: true, ramp: [[0.02, 0.05, 0.22], [0.08, 0.2, 0.62], [0.42, 0.6, 0.95]], rocky: 0, limb: 0.8, bump: 0, air: [0.28, 0.48, 1] },
  terran: { map: "earth", natural: true, ramp: [[0.01, 0.03, 0.1], [0.1, 0.2, 0.36], [0.7, 0.76, 0.84]], rocky: 0, limb: 0.25, bump: 0, air: [0.3, 0.55, 1], clouds: 1, gloss: 1 },
  ocean: { map: "uranus", ramp: [[0.08, 0.2, 0.3], [0.26, 0.46, 0.6], [0.58, 0.76, 0.85]], rocky: 0, limb: 0.9, bump: 0, air: [0.35, 0.62, 0.85] },
  desert: { map: "mars", ramp: [[0.035, 0.05, 0.075], [0.22, 0.26, 0.33], [0.6, 0.64, 0.71]], rocky: 0.6, limb: 0, bump: 0.6, air: [0.3, 0.42, 0.62] },
  rock: { map: "moon", ramp: [[0.03, 0.035, 0.045], [0.28, 0.3, 0.34], [0.78, 0.8, 0.84]], rocky: 1, limb: 0, bump: 1, air: null },
  lava: { map: "mercury", ramp: [[0.025, 0.03, 0.045], [0.19, 0.22, 0.27], [0.56, 0.6, 0.67]], rocky: 1, limb: 0, bump: 1, air: null },
  frozen: { map: "venus", ramp: [[0.13, 0.18, 0.25], [0.44, 0.52, 0.62], [0.8, 0.85, 0.91]], rocky: 0.8, limb: 0, bump: 0.5, air: [0.45, 0.62, 0.9] },
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

/** Two worlds of the same kind still differ a little: a touch lighter or darker, a touch greener or bluer. */
export function rampFor(id: string): [RGB, RGB, RGB] {
  const h = hash(id + "#tone");
  const light = 0.9 + ((h % 1000) / 1000) * 0.22;
  const cool = (((h >>> 10) % 1000) / 1000 - 0.5) * 0.12;
  return LOOK[kindOf(id)].ramp.map(([r, g, b]) => [r * light * (1 - cool), g * light, b * light * (1 + cool)] as RGB) as [RGB, RGB, RGB];
}

const srgb = (v: number) => Math.round(255 * Math.min(1, v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
const css = (c: RGB) => `rgb(${c.map(srgb).join(",")})`;

/** A world as a small lit chip, for the ranking and the size key. */
export function worldSwatch(id: string): string {
  const [deep, mid, light] = rampFor(id);
  return `radial-gradient(circle at 34% 30%, ${css(light)}, ${css(mid)} 40%, ${css(deep)} 72%, #02060c 100%)`;
}
