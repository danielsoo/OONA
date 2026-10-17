import { seeded } from "@/lib/society-sky";

/**
 * Paints a night sky the way a camera records one, onto a canvas:
 * - many faint stars and few bright ones (brightness falls off steeply);
 * - each star a slightly different colour, from blue-white to orange;
 * - bright stars with a soft glow, faint ones barely a point;
 * - a faint Milky Way: a diffuse band of light crossed by dark dust lanes,
 *   thick with tiny stars;
 * - fewer, dimmer stars toward the horizon (`fadeFrom`→`fadeTo`), where
 *   more air lies in the way.
 * Drawn once per size; the same seed gives the same sky.
 */

export type StarfieldOptions = {
  width: number;
  height: number;
  /** Device pixels per CSS pixel (capped by the caller). */
  ratio: number;
  /** Canvas y (CSS px) where stars start to thin out, and where they're gone. */
  fadeFrom: number;
  fadeTo: number;
  seed?: number;
};

const COLORS: [number, number, number, number][] = [
  // r, g, b, share
  [244, 247, 255, 0.58],
  [206, 222, 255, 0.2],
  [255, 243, 222, 0.13],
  [255, 214, 178, 0.09],
];

function pickColor(rand: () => number): [number, number, number] {
  let u = rand();
  for (const [r, g, b, share] of COLORS) {
    if ((u -= share) <= 0) return [r, g, b];
  }
  return [244, 247, 255];
}

function gauss(rand: () => number): number {
  // Box–Muller.
  const u = Math.max(1e-9, rand());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

export function drawStarfield(canvas: HTMLCanvasElement, opts: StarfieldOptions) {
  const { width, height, ratio, fadeFrom, fadeTo } = opts;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const rand = seeded(opts.seed ?? 20261017);

  const air = (y: number) => {
    if (y <= fadeFrom) return 1;
    if (y >= fadeTo) return 0;
    const t = (y - fadeFrom) / (fadeTo - fadeFrom);
    return 1 - t * t * (3 - 2 * t);
  };

  // The Milky Way rises from the lower right toward the upper left, faintly.
  const band = {
    x0: width * 0.92,
    y0: height * 1.05,
    x1: width * 0.18,
    y1: -height * 0.15,
    w: Math.max(120, Math.min(width, height) * 0.32),
  };
  const bx = band.x1 - band.x0;
  const by = band.y1 - band.y0;
  const blen = Math.hypot(bx, by);
  const nx = -by / blen;
  const ny = bx / blen;
  const along = (t: number, off: number) => ({ x: band.x0 + bx * t + nx * off, y: band.y0 + by * t + ny * off });
  // Brighter and dimmer stretches along it.
  const swell = (t: number) => 0.55 + 0.25 * Math.sin(t * 7.1 + 1.3) + 0.2 * Math.sin(t * 17.3 + 0.4);

  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 320; i += 1) {
    const t = rand();
    const off = gauss(rand) * band.w * 0.3;
    const p = along(t, off);
    const r = band.w * (0.18 + rand() * 0.45);
    // Dust lanes: a ragged, darker seam down the band where less light gets through.
    const lane = Math.sin(t * 9 + 0.7) * band.w * 0.07;
    const dust = Math.abs(off - lane) < band.w * 0.07 ? 0.3 : 1;
    const a = 0.014 * swell(t) * dust * air(p.y);
    if (a <= 0.001) continue;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, `rgba(160,182,222,${a})`);
    g.addColorStop(1, "rgba(160,182,222,0)");
    ctx.fillStyle = g;
    ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = "source-over";

  const star = (x: number, y: number, b: number) => {
    const fade = air(y);
    if (fade <= 0.02) return;
    const [r, g, bl] = pickColor(rand);
    const radius = 0.3 + 1.3 * b ** 1.1;
    const alpha = Math.min(1, (0.1 + 0.9 * b ** 0.7) * fade);
    if (radius < 0.75) {
      ctx.fillStyle = `rgba(${r},${g},${bl},${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.4, radius), 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    // A brighter star spreads into a soft glow; only the brightest few get a wide one.
    const halo = radius * (b > 0.8 ? 5 : 2.6);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, halo);
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(radius / halo, `rgba(${r},${g},${bl},${alpha * 0.8})`);
    grad.addColorStop(Math.min(0.99, (radius * 1.7) / halo), `rgba(${r},${g},${bl},${alpha * 0.12})`);
    grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(x - halo, y - halo, halo * 2, halo * 2);
  };

  // Field stars: brightness falls off steeply, so most are faint.
  // Field stars: each step brighter is far rarer, so most are barely there.
  const field = Math.round(width * height * 0.0017);
  for (let i = 0; i < field; i += 1) star(rand() * width, rand() * height, rand() ** 30);
  // The band is thick with tiny stars.
  const crowd = Math.round(blen * band.w * 0.0016);
  for (let i = 0; i < crowd; i += 1) {
    const t = rand();
    const p = along(t, gauss(rand) * band.w * 0.28);
    if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) continue;
    star(p.x, p.y, rand() ** 30 * 0.6);
  }
}
