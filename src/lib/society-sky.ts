import type { DirPerson, DirWork } from "@/lib/society-directory";

/**
 * Society's sky: each person sits on a real star of the sky photograph, and
 * works that two or more of them made together are constellations joining
 * their stars, each a small figure of its own with open sky around it. The
 * sky (and its stars) is fixed; who sits where comes from the people and
 * works alone, so it's the same on every visit.
 *
 * Everything is in pixels of the area the sky is drawn in.
 */

/** A real star in the photograph: where it is, and how bright (0–1). */
export type Seat = { x: number; y: number; b: number };

export type SkyStar = {
  uid: string;
  x: number;
  y: number;
  /** The figure it belongs to in this sky (at most one); none for a lone star. */
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

export const SKY_MAX_CONSTELLATIONS = 7;
export const SKY_MAX_MEMBERS = 60;
export const SKY_MAX_LONE = 28;

export type SkyOptions = {
  maxConstellations?: number;
  /** Least distance between two people's stars (room for a name). */
  spacing?: number;
  /** How far a figure's stars sit from its middle. */
  reach?: number;
};

/** FNV-1a: a stable number for a string. */
export function hashString(value: string): number {
  let h = 0x811c9dc5;
  for (const ch of value) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

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

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

type Node = { id: string; x: number; y: number; dx: number; dy: number; work: number };

/**
 * Where everyone in a figure would ideally be: a small force layout. Each
 * work is a hidden point its people are tied to, so its figure stays small;
 * works push each other apart and people keep out of figures they're not in,
 * so every figure has open sky around it.
 */
function layOut(crews: { members: string[] }[], seats: readonly Seat[], spacing: number, reach: number) {
  const xs = seats.map((s) => s.x);
  const ys = seats.map((s) => s.y);
  const box = { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  const cx = (box.left + box.right) / 2;
  const cy = (box.top + box.bottom) / 2;
  const unit = (seed: string) => (hashString(seed) % 1000) / 1000 - 0.5;

  // A bigger crew gets a slightly bigger figure; all of them shrink together
  // when they wouldn't fit the area.
  const grow = crews.map((c) => 0.8 + 0.2 * Math.sqrt(c.members.length));
  const need = grow.reduce((sum, g) => sum + Math.PI * (1.3 * g) ** 2, 0);
  const fit = Math.sqrt((0.6 * (box.right - box.left) * (box.bottom - box.top)) / need);
  const tie = grow.map((g) => Math.max(spacing * 0.75, Math.min(reach, fit)) * g);

  // Each figure starts in the emptiest part of the area left.
  const hubs: Node[] = [];
  crews.forEach((_, i) => {
    let best = { x: cx, y: cy };
    let bestRoom = -Infinity;
    for (let gx = 0; gx <= 12; gx += 1) {
      for (let gy = 0; gy <= 8; gy += 1) {
        const x = box.left + ((box.right - box.left) * gx) / 12;
        const y = box.top + ((box.bottom - box.top) * gy) / 8;
        const edge = Math.min(x - box.left, box.right - x, y - box.top, box.bottom - y) * 2;
        const room = Math.min(edge, ...hubs.map((h) => Math.hypot(h.x - x, h.y - y) - tie[h.work]!)) - Math.hypot(x - cx, y - cy) * 0.05;
        if (room > bestRoom) {
          bestRoom = room;
          best = { x, y };
        }
      }
    }
    hubs.push({ id: `#${i}`, ...best, dx: 0, dy: 0, work: i });
  });
  const people: Node[] = crews.flatMap((c, i) =>
    c.members.map((uid) => ({ id: uid, x: hubs[i]!.x + unit(`${uid}x`) * tie[i]!, y: hubs[i]!.y + unit(`${uid}y`) * tie[i]!, dx: 0, dy: 0, work: i }))
  );
  const nodes = [...hubs, ...people];
  const isHub = (n: Node) => n.id.startsWith("#");

  const STEPS = 300;
  for (let step = 0; step < STEPS; step += 1) {
    for (const n of nodes) {
      n.dx = (cx - n.x) * 0.006;
      n.dy = (cy - n.y) * 0.006;
    }
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        // How much room the two want between them.
        let room: number;
        if (isHub(a) && isHub(b)) room = (tie[a.work]! + tie[b.work]!) * 1.5;
        else if (isHub(a) || isHub(b)) {
          if (a.work === b.work) continue;
          room = tie[(isHub(a) ? a : b).work]! * 1.7;
        } else room = a.work === b.work ? spacing * 1.4 : spacing * 2.2;
        let ddx = a.x - b.x;
        let ddy = a.y - b.y;
        let d = Math.hypot(ddx, ddy);
        if (d >= room) continue;
        if (d < 0.01) {
          ddx = unit(a.id + b.id);
          ddy = unit(b.id + a.id);
          d = Math.hypot(ddx, ddy) || 1;
        }
        const push = (room - d) * 0.5;
        a.dx += (ddx / d) * push;
        a.dy += (ddy / d) * push;
        b.dx -= (ddx / d) * push;
        b.dy -= (ddy / d) * push;
      }
    }
    for (const person of people) {
      const hub = hubs[person.work]!;
      const ddx = hub.x - person.x;
      const ddy = hub.y - person.y;
      const d = Math.hypot(ddx, ddy) || 1;
      const pull = (d - tie[person.work]!) * 0.3;
      person.dx += (ddx / d) * pull;
      person.dy += (ddy / d) * pull;
      hub.dx -= (ddx / d) * pull * 0.6;
      hub.dy -= (ddy / d) * pull * 0.6;
    }
    const cap = spacing * 0.6 * (1 - step / STEPS) + 1;
    for (const n of nodes) {
      const len = Math.hypot(n.dx, n.dy);
      const k = len > cap ? cap / len : 1;
      n.x = Math.min(box.right, Math.max(box.left, n.x + n.dx * k));
      n.y = Math.min(box.bottom, Math.max(box.top, n.y + n.dy * k));
    }
  }
  return people;
}

export function buildSky(people: readonly DirPerson[], seats: readonly Seat[], options: SkyOptions = {}): Sky {
  const { maxConstellations = SKY_MAX_CONSTELLATIONS, spacing = 64, reach = spacing * 1.5 } = options;

  // Works with two or more people here, biggest first.
  const crews = new Map<string, { work: DirWork; members: string[] }>();
  for (const person of people) {
    for (const credit of person.credits) {
      const crew = crews.get(credit.work.key) ?? { work: credit.work, members: [] };
      if (!crew.members.includes(person.uid)) crew.members.push(person.uid);
      crews.set(credit.work.key, crew);
    }
  }
  const candidates = [...crews.values()]
    .filter((c) => c.members.length >= 2)
    .sort((a, b) => b.members.length - a.members.length || hashString(a.work.key) - hashString(b.work.key));
  // As in the real sky, a star belongs to one figure: a work that shares
  // someone with a bigger one already up there isn't drawn, so figures stay
  // apart instead of joining into one web.
  let chosen: { work: DirWork; members: string[] }[] = [];
  const members = new Set<string>();
  for (const crew of candidates) {
    if (chosen.length >= maxConstellations) break;
    if (crew.members.some((uid) => members.has(uid))) continue;
    // No more people in figures than the sky has stars for (each needs room).
    if (members.size + crew.members.length > Math.min(SKY_MAX_MEMBERS, seats.length * 0.5)) continue;
    chosen.push({ work: crew.work, members: [...crew.members].sort((a, b) => hashString(a) - hashString(b)) });
    for (const uid of crew.members) members.add(uid);
  }

  // Everyone in a figure takes the real star nearest where the layout wants
  // them, brighter stars preferred.
  const pool = [...seats].sort((a, b) => b.b - a.b);
  const taken: Seat[] = [];
  const seatOf = new Map<string, Seat>();
  const isFree = (s: Seat, gap: number) => taken.every((t) => t !== s && dist(t, s) >= gap);
  if (chosen.length && pool.length) {
    for (const node of layOut(chosen, pool, spacing, reach)) {
      let best: Seat | null = null;
      let bestCost = Infinity;
      for (const s of pool) {
        if (!isFree(s, spacing)) continue;
        const cost = dist(s, node) / spacing - 0.5 * s.b;
        if (cost < bestCost) {
          bestCost = cost;
          best = s;
        }
      }
      if (!best) continue;
      taken.push(best);
      seatOf.set(node.id, best);
    }
    // A figure that lost people to a full sky keeps those who got a star.
    chosen = chosen
      .map((crew) => ({ ...crew, members: crew.members.filter((uid) => seatOf.has(uid)) }))
      .filter((crew) => crew.members.length >= 2);
  }

  const worksOf = new Map<string, string[]>();
  for (const crew of chosen) for (const uid of crew.members) worksOf.set(uid, [...(worksOf.get(uid) ?? []), crew.work.key]);
  const stars: SkyStar[] = [...seatOf].map(([uid, seat]) => ({ uid, x: seat.x, y: seat.y, works: worksOf.get(uid) ?? [] }));

  // Everyone else shines alone on a bright star, clear of the figures.
  const lone = people
    .filter((p) => !seatOf.has(p.uid))
    .sort((a, b) => hashString(a.uid) - hashString(b.uid))
    .slice(0, SKY_MAX_LONE);
  let li = 0;
  for (const s of pool) {
    if (li >= lone.length) break;
    if (!isFree(s, spacing * 1.3)) continue;
    const uid = lone[li++]!.uid;
    taken.push(s);
    seatOf.set(uid, s);
    stars.push({ uid, x: s.x, y: s.y, works: [] });
  }

  const constellations: SkyConstellation[] = chosen.map((crew) => {
    const points = crew.members.map((uid) => ({ id: uid, x: seatOf.get(uid)!.x, y: seatOf.get(uid)!.y }));
    return { work: crew.work, members: crew.members, lines: spanningLines(points), labelX: 0, labelY: 0 };
  });
  placeTitles(constellations, stars, pool);

  return { stars, constellations };
}

type Box = { left: number; right: number; top: number; bottom: number };

/**
 * Each work's name goes where it covers the fewest stars, lines and other
 * names: above its figure if that's clear, else below, beside or inside it.
 * Widths are a rough guess from the title's length.
 */
function placeTitles(constellations: SkyConstellation[], stars: SkyStar[], seats: readonly Seat[]) {
  if (!constellations.length) return;
  const at = new Map(stars.map((s) => [s.uid, s]));
  const xs = seats.map((s) => s.x);
  const ys = seats.map((s) => s.y);
  const bounds = { left: Math.min(...xs) - 20, right: Math.max(...xs) + 20, top: Math.min(...ys) - 30, bottom: Math.max(...ys) + 30 };
  const segments = constellations.flatMap((c) => c.lines.map(([a, b]) => [at.get(a)!, at.get(b)!] as const));
  const placed: Box[] = [];
  const overlap = (a: Box, b: Box) =>
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

  for (const c of constellations) {
    const points = c.members.map((uid) => at.get(uid)!);
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));
    const midX = (minX + maxX) / 2;
    const midY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    const halfW = c.work.title.length * 4.1 + 10;
    const halfH = 12;
    // Candidates, in order of preference.
    const spots: [number, number][] = [
      [midX, minY - 30],
      [midX, maxY + 30],
      [minX - halfW - 14, midY],
      [maxX + halfW + 14, midY],
      [points.reduce((sum, p) => sum + p.x, 0) / points.length, midY],
      [midX, minY - 54],
      [midX, maxY + 54],
    ];
    let best = spots[0]!;
    let bestCost = Infinity;
    spots.forEach(([x, y], rank) => {
      const box = { left: x - halfW, right: x + halfW, top: y - halfH, bottom: y + halfH };
      let cost = rank * 0.6;
      const inside = (p: { x: number; y: number }, pad = 0) =>
        p.x > box.left - pad && p.x < box.right + pad && p.y > box.top - pad && p.y < box.bottom + pad;
      for (const s of stars) if (inside(s, 8)) cost += 6;
      for (const [a, b] of segments) {
        for (let k = 1; k < 12; k += 1) if (inside({ x: a.x + ((b.x - a.x) * k) / 12, y: a.y + ((b.y - a.y) * k) / 12 })) cost += 1;
      }
      for (const other of placed) cost += overlap(box, other) / 60;
      cost += (overlap(box, bounds) < (box.right - box.left) * (box.bottom - box.top) - 1 ? 20 : 0);
      if (cost < bestCost) {
        bestCost = cost;
        best = [x, y];
      }
    });
    c.labelX = best[0];
    c.labelY = best[1];
    placed.push({ left: best[0] - halfW, right: best[0] + halfW, top: best[1] - halfH, bottom: best[1] + halfH });
  }
}
