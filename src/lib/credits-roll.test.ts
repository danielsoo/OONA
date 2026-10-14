import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRollLines, rollLength, shuffleForVisit } from "./credits-roll.ts";

const crew = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({ userId: `${prefix}${i}` }));

/** A small seeded generator, so the shuffle tests are repeatable. */
const lcg = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
};

describe("credits roll", () => {
  it("deals one line per work in turn, so a big crew does not own the roll", () => {
    const works = [
      { workId: "feature", credits: crew("f", 160) },
      { workId: "short", credits: crew("s", 6) },
      { workId: "doc", credits: crew("d", 8) },
    ];
    const lines = buildRollLines(works, 30);
    const counts = new Map<string, number>();
    for (const l of lines) counts.set(l.workId, (counts.get(l.workId) ?? 0) + 1);
    assert.deepEqual([...counts.values()], [10, 10, 10]);
  });

  it("rotates which work opens each pass", () => {
    const works = ["a", "b", "c"].map((id) => ({ workId: id, credits: crew(id, 3) }));
    const firsts = [0, 3, 6].map((i) => buildRollLines(works, 9)[i]!.workId);
    assert.deepEqual(firsts, ["a", "b", "c"]);
  });

  it("never shows the same person twice in a row", () => {
    const shared = { userId: "shared" };
    const works = [
      { workId: "a", credits: [shared, { userId: "a1" }] },
      { workId: "b", credits: [shared, { userId: "b1" }] },
    ];
    const lines = buildRollLines(works, 40);
    for (let i = 1; i < lines.length; i += 1) {
      assert.notEqual(lines[i]!.credit.userId, lines[i - 1]!.credit.userId, `line ${i}`);
    }
  });

  it("is long enough to reach every credit", () => {
    const works = [
      { workId: "big", credits: crew("b", 60) },
      { workId: "small", credits: crew("s", 2) },
    ];
    const lines = buildRollLines(works, rollLength(works));
    const seen = new Set(lines.map((l) => l.credit.userId));
    assert.equal(seen.size, 62);
  });

  it("shuffles the works and the people in each for a visit, without losing or changing anyone", () => {
    const works = [
      { workId: "a", credits: crew("a", 4) },
      { workId: "b", credits: crew("b", 3) },
      { workId: "c", credits: crew("c", 1) },
    ];
    const before = JSON.stringify(works);
    const out = shuffleForVisit(works, lcg(7));
    assert.equal(JSON.stringify(works), before);
    assert.deepEqual(out.map((w) => w.workId).sort(), ["a", "b", "c"]);
    for (const w of out) {
      const original = works.find((o) => o.workId === w.workId)!;
      assert.deepEqual(w.credits.map((c) => c.userId).sort(), original.credits.map((c) => c.userId).sort());
    }
  });

  it("gives every person the same chance to open the roll", () => {
    const works = [
      { workId: "a", credits: crew("a", 2) },
      { workId: "b", credits: crew("b", 1) },
      { workId: "c", credits: crew("c", 1) },
    ];
    const random = lcg(42);
    const firsts = new Map<string, number>();
    const runs = 6000;
    for (let i = 0; i < runs; i += 1) {
      const first = buildRollLines(shuffleForVisit(works, random), 1)[0]!.credit.userId;
      firsts.set(first, (firsts.get(first) ?? 0) + 1);
    }
    // Each work opens a third of the time; a0 and a1 split a's third.
    assert.ok(Math.abs(firsts.get("b0")! / runs - 1 / 3) < 0.03);
    assert.ok(Math.abs(firsts.get("c0")! / runs - 1 / 3) < 0.03);
    assert.ok(Math.abs(firsts.get("a0")! / runs - 1 / 6) < 0.03);
    assert.ok(Math.abs(firsts.get("a1")! / runs - 1 / 6) < 0.03);
  });

  it("skips works with no credits and handles an empty catalog", () => {
    assert.deepEqual(buildRollLines([], 10), []);
    assert.deepEqual(buildRollLines([{ workId: "x", credits: [] }], 10), []);
  });
});
