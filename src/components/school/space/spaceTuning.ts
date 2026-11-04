/** The schools space's two views and the knobs that shape them (kept apart from three.js, so the page can load without it). */

export type SpaceView = "level" | "open";

export type SpaceTuning = {
  /** Level view only: how far above the orbital plane the camera sits. */
  cameraHeight: number;
  size: number;
  /** Depth of field; 0 turns it off. */
  depth: number;
  haze: number;
  /** How bright the photographed sky behind the worlds is. */
  sky: number;
  /** Light on the night side of each world, so its shape still reads. */
  night: number;
  brightness: number;
  /** How far the worlds lean from their own colours toward the page's night blues. */
  tint: number;
  spin: boolean;
};

export const DEFAULT_TUNING: Record<SpaceView, SpaceTuning> = {
  level: { cameraHeight: 20, size: 1, depth: 0, haze: 0.4, sky: 0.9, night: 1, brightness: 1, tint: 0, spin: true },
  open: { cameraHeight: 20, size: 1, depth: 0, haze: 0.4, sky: 0.9, night: 1, brightness: 1, tint: 0, spin: true },
};
