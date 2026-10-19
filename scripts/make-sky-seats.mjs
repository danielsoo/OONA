/**
 * Lays out where a person's star can sit in the Society sky, and prints the
 * SKY_SEATS body for src/components/society/discover/skySeats.ts.
 *
 *   node scripts/make-sky-seats.mjs
 *
 * Poisson-disc (Bridson) from a fixed seed: even over the frame, never a
 * grid, and far enough apart that each star has room for its name. The
 * scene has no stars of its own to sit on — the people are the only ones.
 */
const W = 1916, H = 821, COUNT = 600;
const R = Math.sqrt((W * H) / (COUNT * 1.9));   // spacing that lands near COUNT
const K = 30;
const cell = R / Math.SQRT2;
const gw = Math.ceil(W / cell), gh = Math.ceil(H / cell);
const grid = new Int32Array(gw * gh).fill(-1);
const pts = [];
const active = [];

// Deterministic, so the file is reproducible.
let s = 20261019;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

const fits = (x, y) => {
  const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
  for (let j = Math.max(0, cy - 2); j <= Math.min(gh - 1, cy + 2); j++)
    for (let i = Math.max(0, cx - 2); i <= Math.min(gw - 1, cx + 2); i++) {
      const p = grid[j * gw + i];
      if (p !== -1 && Math.hypot(pts[p][0] - x, pts[p][1] - y) < R) return false;
    }
  return true;
};
const add = (x, y) => {
  grid[Math.floor(y / cell) * gw + Math.floor(x / cell)] = pts.length;
  pts.push([x, y]);
  active.push(pts.length - 1);
};
add(rnd() * W, rnd() * H);
while (active.length && pts.length < COUNT * 1.4) {
  const ai = Math.floor(rnd() * active.length);
  const [px, py] = pts[active[ai]];
  let placed = false;
  for (let t = 0; t < K; t++) {
    const a = rnd() * Math.PI * 2, d = R * (1 + rnd());
    const x = px + Math.cos(a) * d, y = py + Math.sin(a) * d;
    if (x >= 0 && x < W && y >= 0 && y < H && fits(x, y)) { add(x, y); placed = true; break; }
  }
  if (!placed) active.splice(ai, 1);
}

// Take the 600 as a random subset of all that fitted, not the first 600:
// Bridson fills outward from its seed, so insertion order is biased.
for (let i = pts.length - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1));
  [pts[i], pts[j]] = [pts[j], pts[i]];
}

// Brightness: a few bright, many faint, as a sky reads.
const seats = pts.slice(0, COUNT).map(([x, y]) => {
  const b = Math.pow(rnd(), 2.2);                 // skewed to the faint end
  return [Number((x / W).toFixed(4)), Number((y / H).toFixed(4)), Number((0.3 + b * 0.7).toFixed(2))];
});
seats.sort((a, b) => b[2] - a[2]);                // brightest first, as before

console.log(`좌석 ${seats.length}개 · 최소 간격 ${R.toFixed(1)}px`);
const xs = seats.map(s => s[0]), ys = seats.map(s => s[1]);
console.log(`x ${Math.min(...xs).toFixed(3)}~${Math.max(...xs).toFixed(3)}  y ${Math.min(...ys).toFixed(3)}~${Math.max(...ys).toFixed(3)}`);
for (let i = 0; i < 5; i++) {
  const n = ys.filter(y => y >= i / 5 && y < (i + 1) / 5).length;
  console.log(`  y ${(i/5).toFixed(1)}~${((i+1)/5).toFixed(1)}: ${n}개`);
}
console.log('\n--- skySeats.ts 의 SKY_SEATS 본문 ---');
console.log(seats.map((s) => `[${s[0]},${s[1]},${s[2]}]`).join(','));
