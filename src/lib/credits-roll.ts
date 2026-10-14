/**
 * The credits home's roll order. Credits are dealt out one line per work in
 * turn, with the first work of each pass rotating, so no single work (a
 * feature with 160 crew next to a short with 6) owns the roll, and the same
 * name never shows twice in a row.
 */
export type RollSourceWork<C> = { workId: string; credits: readonly C[] };
export type RollLine<C> = { workId: string; credit: C; creditIndex: number };

export function buildRollLines<C extends { userId: string }>(
  works: readonly RollSourceWork<C>[],
  count: number
): RollLine<C>[] {
  const sources = works.filter((w) => w.credits.length > 0);
  if (sources.length === 0 || count <= 0) return [];
  const next = sources.map(() => 0);
  const out: RollLine<C>[] = [];
  let lastUser: string | null = null;
  for (let pass = 0; out.length < count; pass += 1) {
    for (let k = 0; k < sources.length && out.length < count; k += 1) {
      const wi = (pass + k) % sources.length;
      const work = sources[wi]!;
      let ci = next[wi]! % work.credits.length;
      // Skip one ahead when this work would repeat the name just shown.
      if (work.credits[ci]!.userId === lastUser && work.credits.length > 1) {
        next[wi]! += 1;
        ci = next[wi]! % work.credits.length;
      }
      next[wi]! += 1;
      const credit = work.credits[ci]!;
      out.push({ workId: work.workId, credit, creditIndex: ci });
      lastUser = credit.userId;
    }
  }
  return out;
}

/** Enough lines that every credit shows at least once, within sane bounds. */
export function rollLength(works: readonly RollSourceWork<unknown>[]): number {
  const total = works.reduce((sum, w) => sum + w.credits.length, 0);
  const longest = works.reduce((max, w) => Math.max(max, w.credits.length), 0);
  // Round robin needs `longest` passes to reach a long work's last credit.
  return Math.min(240, Math.max(48, total, longest * works.length));
}
