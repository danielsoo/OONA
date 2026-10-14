import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRollLines, rollLength } from "./credits-roll.ts";

const crew = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({ userId: `${prefix}${i}` }));

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

  it("skips works with no credits and handles an empty catalog", () => {
    assert.deepEqual(buildRollLines([], 10), []);
    assert.deepEqual(buildRollLines([{ workId: "x", credits: [] }], 10), []);
  });
});
