/**
 * What each school's world looks like: its kind and colours. Kept apart from
 * three.js so the ranking can show the same world as a small chip without
 * loading the scene.
 */

export type Kind = "gas" | "ringgas" | "ice" | "terran" | "desert" | "rock" | "lava" | "ocean" | "frozen";

export const PAL: Record<Kind, [number, number, number][]> = {
  gas: [[0.04, 0.10, 0.27], [0.16, 0.33, 0.60], [0.60, 0.74, 0.90], [0.86, 0.93, 0.99]],
  ringgas: [[0.10, 0.19, 0.38], [0.30, 0.47, 0.70], [0.70, 0.80, 0.91], [0.18, 0.29, 0.52]],
  ice: [[0.05, 0.16, 0.50], [0.11, 0.30, 0.72], [0.45, 0.65, 0.92], [0.03, 0.09, 0.32]],
  terran: [[0.01, 0.04, 0.14], [0.20, 0.27, 0.36], [0.52, 0.60, 0.69], [0.84, 0.88, 0.92]],
  desert: [[0.11, 0.17, 0.27], [0.27, 0.37, 0.51], [0.50, 0.60, 0.72], [0.07, 0.11, 0.19]],
  rock: [[0.13, 0.15, 0.19], [0.29, 0.33, 0.39], [0.51, 0.55, 0.61], [0.09, 0.10, 0.13]],
  lava: [[0.03, 0.04, 0.06], [0.08, 0.10, 0.14], [0.18, 0.21, 0.27], [0.30, 0.68, 1.00]],
  ocean: [[0.01, 0.05, 0.16], [0.03, 0.14, 0.30], [0.10, 0.30, 0.45], [0.80, 0.85, 0.90]],
  frozen: [[0.52, 0.63, 0.77], [0.72, 0.83, 0.92], [0.90, 0.95, 0.99], [0.33, 0.53, 0.77]],
};
export const AIR: Record<Kind, [number, number, number] | null> = {
  gas: [0.45, 0.65, 1.0], ringgas: [0.55, 0.72, 1.0], ice: [0.35, 0.6, 1.0], terran: [0.35, 0.6, 1.0], desert: [0.5, 0.65, 0.95],
  rock: null, lava: [0.35, 0.65, 1.0], ocean: [0.4, 0.68, 1.0], frozen: [0.65, 0.82, 1.0],
};
export const SHADER_KIND: Record<Kind, number> = { gas: 0, ringgas: 0, ice: 1, terran: 2, desert: 3, rock: 4, lava: 5, ocean: 6, frozen: 7 };
export const RELIEF: Partial<Record<Kind, number>> = { rock: 1, desert: 0.9, terran: 0.45, ocean: 0.3, frozen: 0.7, lava: 0.7 };

/** The schools we know get the world that suits them; the rest one picked from their id. */
const KIND_BY_ID: Record<string, Kind> = {
  "penn-state": "ringgas", snu: "gas", ucla: "terran", pku: "desert", nyu: "ice", tokyo: "ringgas", tsinghua: "ocean",
  berkeley: "desert", toronto: "frozen", melbourne: "terran", oxford: "rock", nus: "lava", sydney: "desert", mit: "ice", mcgill: "rock",
};
const KINDS_FOR_OTHERS: Kind[] = ["rock", "frozen", "desert", "ice", "rock", "frozen", "terran", "lava"];

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const kindOf = (id: string): Kind => KIND_BY_ID[id] ?? KINDS_FOR_OTHERS[hash(id) % KINDS_FOR_OTHERS.length]!;

const rgb = (c: [number, number, number]) => `rgb(${c.map((v) => Math.round(Math.min(1, v) * 255)).join(",")})`;

/** A world as a small lit chip, for the ranking and the size key. */
export function worldSwatch(id: string): string {
  const [deep, mid, light] = PAL[kindOf(id)];
  return `radial-gradient(circle at 34% 30%, ${rgb(light!)}, ${rgb(mid!)} 42%, ${rgb(deep!)} 74%, #02060c 100%)`;
}
