/**
 * The activity charts' colors, for the admin console's dark surface
 * (#111114): the reference data-viz palette's dark steps. The three device
 * colors are categorical slots 1–3 and pass the palette checks on this
 * surface (CVD ΔE 9.4, normal vision 26.5, all ≥ 3:1).
 */

export const INK = {
  primary: "#ffffff",
  secondary: "#c3c2b7",
  muted: "#898781",
  grid: "#2c2c2a",
  baseline: "#383835",
} as const;

export const SURFACE = "#111114";

/** One-series charts and bars. */
export const ACCENT = "#3987e5";

/** Parts of a whole (devices), in this order. */
export const SERIES = ["#3987e5", "#d95926", "#199e70"] as const;

/** Heatmap, low to high: dark blues recede into the surface, bright ones stand out. */
export const HEAT = ["#104281", "#1c5cab", "#2a78d6", "#5598e7", "#9ec5f4"] as const;
export const HEAT_ZERO = "rgba(255,255,255,0.05)";

export const DELTA_UP = "#0ca30c";
export const DELTA_DOWN = "#d03b3b";
