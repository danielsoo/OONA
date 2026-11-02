/** The schools space's two views and the knobs that shape them (kept apart from three.js, so the page can load without it). */

export type SpaceView = "level" | "open";

export type SpaceTuning = {
  /** Level view only: how far above the orbital plane the camera sits. */
  cameraHeight: number;
  size: number;
  /** Depth of field; 0 turns it off. */
  depth: number;
  haze: number;
  milkyWay: number;
  /** Light on the night side of each world, so its shape still reads. */
  night: number;
  brightness: number;
  spin: boolean;
};

export const DEFAULT_TUNING: Record<SpaceView, SpaceTuning> = {
  level: { cameraHeight: 20, size: 1, depth: 1, haze: 1, milkyWay: 1, night: 1, brightness: 1, spin: true },
  open: { cameraHeight: 20, size: 1, depth: 1, haze: 1, milkyWay: 1, night: 1, brightness: 1, spin: true },
};
