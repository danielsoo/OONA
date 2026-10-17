import type { DirPerson, DirWork } from "@/lib/society-directory";

/**
 * Society's sky: each person is a star, and each work that two or more of
 * them made together is a constellation joining them. Positions come from
 * the people and works alone (not the visit), so the sky stays the same
 * from one visit to the next, the way a real one does.
 *
 * Coordinates are 0–1 across the box the sky is drawn in; `aspect` is that
 * box's width / height, so spacing looks even on any screen.
 */

export type SkyStar = {
  uid: string;
  x: number;
  y: number;
  /** Works it belongs to in this sky; none for a lone star. */
  works: string[];
};

export type SkyConstellation = {
  work: DirWork;
  members: string[];
  /** Pairs of member uids: the figure's lines (a minimum spanning tree). */
  lines: [string, string][];
  /** Where the work's name sits: above the figure. */
  labelX: number;
  labelY: number;
};

export type Sky = { stars: SkyStar[]; constellations: SkyConstellation[] };

export const SKY_MAX_CONSTELLATIONS = 9;
export const SKY_MAX_MEMBERS = 60;
export const SKY_MAX_LONE = 28;

/** FNV-1a: a stable number for a string. */
export function hashString(value: string): number {
  let h = 0x811c9dc5;
  for (const ch of value) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A small seeded generator (mulberry32), 0 ≤ n < 1. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MARGIN_X = 0.05;
const MARGIN_Y = 0.08;

/** Prim's minimum spanning tree over points: a constellation's stick figure. */
export function spanningLines(points: { id: string; x: number; y: number }[]): [string, string][] {
  if (points.length < 2) return [];
  const inTree = new Set([points[0]!.id]);
  const lines: [string, string][] = [];
  while (inTree.size < points.length) {
    let best: [string, string] | null = null;
    let bestD = Infinity;
    for (const a of points) {
      if (!inTree.has(a.id)) continue;
      for (const b of points) {
        if (inTree.has(b.id)) continue;
        const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = [a.id, b.id];
        }
      }
    }
    if (!best) break;
    lines.push(best);
    inTree.add(best[1]);
  }
  return lines;
}

export function buildSky(
  people: readonly DirPerson[],
  { aspect = 1.7, maxConstellations = SKY_MAX_CONSTELLATIONS }: { aspect?: number; maxConstellations?: number } = {}
): Sky {
  const byUid = new Map(people.map((person) => [person.uid, person]));

  // Works with two or more people here, biggest first.
  const crews = new Map<string, { work: DirWork; members: string[] }>();
  for (const person of people) {
    for (const credit of person.credits) {
      const crew = crews.get(credit.work.key) ?? { work: credit.work, members: [] };
      if (!crew.members.includes(person.uid)) crew.members.push(person.uid);
      crews.set(credit.work.key, crew);
    }
  }
  const chosen: { work: DirWork; members: string[] }[] = [];
  const memberSet = new Set<string>();
  for (const crew of [...crews.values()]
    .filter((c) => c.members.length >= 2)
    .sort((a, b) => b.members.length - a.members.length || hashString(a.work.key) - hashString(b.work.key))) {
    if (chosen.length >= maxConstellations) break;
    const members = crew.members.sort((a, b) => hashString(a) - hashString(b));
    const added = members.filter((uid) => !memberSet.has(uid));
    if (memberSet.size + added.length > SKY_MAX_MEMBERS) continue;
    added.forEach((uid) => memberSet.add(uid));
    chosen.push({ work: crew.work, members });
  }

  // Work at a time, in a space where x runs 0..aspect so distances are even.
  const W = aspect;
  const n = chosen.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * aspect)));
  const rows = Math.max(1, Math.ceil(n / cols));
  const cellW = (W * (1 - 2 * MARGIN_X)) / cols;
  const cellH = (1 - 2 * MARGIN_Y) / rows;
  const centers = new Map<string, { x: number; y: number }>();
  chosen.forEach((crew, i) => {
    const rand = seeded(hashString(crew.work.key));
    const col = i % cols;
    const row = Math.floor(i / cols);
    // Stagger rows so the figures don't line up like a table.
    const shift = row % 2 ? cellW * 0.3 : 0;
    centers.set(crew.work.key, {
      x: W * MARGIN_X + cellW * (col + 0.5) + shift * (col === cols - 1 ? -1 : 1) + (rand() - 0.5) * cellW * 0.35,
      y: MARGIN_Y + cellH * (row + 0.5) + (rand() - 0.5) * cellH * 0.35,
    });
  });

  const worksOf = new Map<string, string[]>();
  for (const crew of chosen) for (const uid of crew.members) worksOf.set(uid, [...(worksOf.get(uid) ?? []), crew.work.key]);

  const reach = Math.min(cellW, cellH) * 0.42;
  const pos = new Map<string, { x: number; y: number }>();
  for (const [uid, works] of worksOf) {
    const rand = seeded(hashString(uid));
    const cx = works.reduce((s, k) => s + centers.get(k)!.x, 0) / works.length;
    const cy = works.reduce((s, k) => s + centers.get(k)!.y, 0) / works.length;
    const angle = rand() * Math.PI * 2;
    const r = reach * (0.35 + rand() * 0.65);
    pos.set(uid, { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }

  // Relax: stars keep a little apart, and stay near the works they're in.
  const ids = [...pos.keys()];
  // About a name label's height apart, so labels don't sit on each other.
  const minD = 0.17;
  for (let step = 0; step < 220; step += 1) {
    for (let i = 0; i < ids.length; i += 1) {
      const a = pos.get(ids[i]!)!;
      for (let j = i + 1; j < ids.length; j += 1) {
        const b = pos.get(ids[j]!)!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        if (d < minD) {
          const push = ((minD - d) / d) * 0.5;
          a.x -= dx * push;
          a.y -= dy * push;
          b.x += dx * push;
          b.y += dy * push;
        }
      }
    }
    for (const uid of ids) {
      const p = pos.get(uid)!;
      for (const key of worksOf.get(uid)!) {
        const c = centers.get(key)!;
        p.x += (c.x - p.x) * 0.012;
        p.y += (c.y - p.y) * 0.012;
      }
      p.x = Math.min(W * (1 - MARGIN_X), Math.max(W * MARGIN_X, p.x));
      p.y = Math.min(1 - MARGIN_Y, Math.max(MARGIN_Y, p.y));
    }
  }

  const stars: SkyStar[] = ids.map((uid) => ({ uid, x: pos.get(uid)!.x / W, y: pos.get(uid)!.y, works: worksOf.get(uid)! }));

  // Everyone else shines alone, away from the figures.
  const placed = stars.map((s) => ({ x: s.x * W, y: s.y }));
  const lone = people.filter((p) => !worksOf.has(p.uid)).sort((a, b) => hashString(a.uid) - hashString(b.uid)).slice(0, SKY_MAX_LONE);
  for (const person of lone) {
    const rand = seeded(hashString(`lone:${person.uid}`));
    let best = { x: 0, y: 0 };
    let bestD = -1;
    for (let k = 0; k < 14; k += 1) {
      const c = { x: W * (MARGIN_X + rand() * (1 - 2 * MARGIN_X)), y: MARGIN_Y + rand() * (1 - 2 * MARGIN_Y) };
      const d = placed.reduce((m, p) => Math.min(m, Math.hypot(p.x - c.x, p.y - c.y)), Infinity);
      if (d > bestD) {
        bestD = d;
        best = c;
      }
    }
    placed.push(best);
    stars.push({ uid: person.uid, x: best.x / W, y: best.y, works: [] });
  }

  const constellations: SkyConstellation[] = chosen.map((crew) => {
    const points = crew.members.map((uid) => ({ id: uid, x: pos.get(uid)!.x, y: pos.get(uid)!.y }));
    const top = Math.min(...points.map((p) => p.y));
    const xs = points.map((p) => p.x);
    return {
      work: crew.work,
      members: crew.members.filter((uid) => byUid.has(uid)),
      lines: spanningLines(points),
      labelX: (Math.min(...xs) + Math.max(...xs)) / 2 / W,
      labelY: Math.max(0.02, top - 0.07),
    };
  });

  // Keep the works' names off each other (widths are a rough guess from length).
  const halfWidth = (c: SkyConstellation) => (c.work.title.length * 0.0075) / aspect + 0.01;
  for (let step = 0; step < 30; step += 1) {
    let moved = false;
    for (let i = 0; i < constellations.length; i += 1) {
      for (let j = i + 1; j < constellations.length; j += 1) {
        const a = constellations[i]!;
        const b = constellations[j]!;
        if (Math.abs(a.labelX - b.labelX) < halfWidth(a) + halfWidth(b) && Math.abs(a.labelY - b.labelY) < 0.06) {
          const lower = a.labelY > b.labelY ? a : b;
          lower.labelY = Math.min(0.98, lower.labelY + 0.03);
          const upper = lower === a ? b : a;
          upper.labelY = Math.max(0.02, upper.labelY - 0.03);
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  return { stars, constellations };
}
