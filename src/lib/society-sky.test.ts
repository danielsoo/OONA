import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSky, spanningLines, SKY_MAX_CONSTELLATIONS } from "./society-sky.ts";

const work = (key: string) => ({ key, ownerUid: "o", workId: key, title: key, stillUrl: "", schoolName: null });
const person = (uid: string, works: string[]) => ({
  uid,
  name: uid,
  handle: uid,
  avatarUrl: null,
  headline: null,
  bio: null,
  available: false,
  roleTags: [],
  groups: [],
  schools: [],
  collaborators: [],
  credits: works.map((key) => ({ work: work(key), role: "actor", character: null })),
});

describe("spanningLines", () => {
  it("joins every point with one line fewer than points, nearest first", () => {
    const lines = spanningLines([
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 1, y: 0 },
      { id: "c", x: 0.1, y: 0 },
    ]);
    assert.equal(lines.length, 2);
    assert.deepEqual(lines[0], ["a", "c"]);
  });
});

describe("buildSky", () => {
  const people = [
    person("a", ["w1", "w2"]),
    person("b", ["w1"]),
    person("c", ["w1"]),
    person("d", ["w2"]),
    person("e", ["w3"]),
    person("f", []),
  ];

  it("makes a constellation of each work with two or more people, and lone stars of the rest", () => {
    // @ts-expect-error test doubles carry only the fields used
    const sky = buildSky(people);
    assert.deepEqual(sky.constellations.map((c) => c.work.key).sort(), ["w1", "w2"]);
    const w1 = sky.constellations.find((c) => c.work.key === "w1")!;
    assert.equal(w1.lines.length, w1.members.length - 1);
    // Someone in two works is one star that belongs to both.
    assert.deepEqual(sky.stars.find((s) => s.uid === "a")!.works.sort(), ["w1", "w2"]);
    // e's work has nobody else here; e and f shine alone.
    assert.deepEqual(sky.stars.filter((s) => s.works.length === 0).map((s) => s.uid).sort(), ["e", "f"]);
  });

  it("keeps every star inside the box, and the same sky every time", () => {
    // @ts-expect-error test doubles
    const a = buildSky(people, { aspect: 1.8 });
    // @ts-expect-error test doubles
    const b = buildSky([...people].reverse(), { aspect: 1.8 });
    for (const s of a.stars) {
      assert.ok(s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1, `${s.uid} inside`);
    }
    const at = (sky: typeof a, uid: string) => sky.stars.find((s) => s.uid === uid)!;
    for (const uid of ["a", "b", "c", "d"]) {
      assert.ok(Math.abs(at(a, uid).x - at(b, uid).x) < 1e-9 && Math.abs(at(a, uid).y - at(b, uid).y) < 1e-9, `${uid} stays put`);
    }
  });

  it("caps the number of constellations", () => {
    const many = Array.from({ length: 30 }, (_, i) => [person(`p${i}a`, [`w${i}`]), person(`p${i}b`, [`w${i}`])]).flat();
    // @ts-expect-error test doubles
    assert.equal(buildSky(many).constellations.length, SKY_MAX_CONSTELLATIONS);
  });
});
