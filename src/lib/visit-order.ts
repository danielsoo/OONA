/**
 * A per-visit order that stays put while data arrives in pieces: sort by
 * `visitRank(seed, id)` with one seed per visit. A fixed order would always
 * put the same works and people first, where everyone sees them.
 */
export function newVisitSeed(): string {
  return Math.random().toString(36).slice(2);
}

/** FNV-1a of `${seed}:${id}`: stable for one seed, scrambled across seeds. */
export function visitRank(seed: string, id: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${seed}:${id}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
