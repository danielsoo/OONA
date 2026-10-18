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
// A field of real-looking stars: a jittered grid, brightness varying.
const seats = Array.from({ length: 400 }, (_, i) => ({
  x: (i % 25) * 40 + ((i * 7) % 13),
  y: Math.floor(i / 25) * 40 + ((i * 11) % 17),
  b: ((i * 37) % 100) / 100,
}));
const onASeat = (s: { x: number; y: number }) => seats.some((t) => t.x === s.x && t.y === s.y);

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

  it("seats everyone on a real star, a figure for each work that doesn't share a star", () => {
    // @ts-expect-error test doubles carry only the fields used
    const sky = buildSky(people, seats);
    // w2 shares a with the bigger w1, so it isn't drawn: figures never join.
    assert.deepEqual(sky.constellations.map((c) => c.work.key), ["w1"]);
    const w1 = sky.constellations[0]!;
    assert.equal(w1.lines.length, w1.members.length - 1);
    for (const s of sky.stars) assert.ok(onASeat(s), `${s.uid} sits on a star`);
    assert.deepEqual(sky.stars.find((s) => s.uid === "a")!.works, ["w1"]);
    // Everyone else shines alone.
    assert.deepEqual(sky.stars.filter((s) => s.works.length === 0).map((s) => s.uid).sort(), ["d", "e", "f"]);
  });

  it("keeps figures small and apart", () => {
    const crews = Array.from({ length: 4 }, (_, i) => ["a", "b", "c"].map((m) => person(`${m}${i}`, [`w${i}`]))).flat();
    // @ts-expect-error test doubles
    const sky = buildSky(crews, seats);
    assert.equal(sky.constellations.length, 4);
    const at = new Map(sky.stars.map((s) => [s.uid, s]));
    const middle = (members: string[]) => ({
      x: members.reduce((sum, uid) => sum + at.get(uid)!.x, 0) / members.length,
      y: members.reduce((sum, uid) => sum + at.get(uid)!.y, 0) / members.length,
    });
    for (const c of sky.constellations) {
      for (const [a, b] of c.lines) {
        const d = Math.hypot(at.get(a)!.x - at.get(b)!.x, at.get(a)!.y - at.get(b)!.y);
        assert.ok(d < 64 * 4, `${c.work.key}: ${a}–${b} is a short line`);
      }
    }
    for (let i = 0; i < sky.constellations.length; i += 1) {
      for (let j = i + 1; j < sky.constellations.length; j += 1) {
        const a = middle(sky.constellations[i]!.members);
        const b = middle(sky.constellations[j]!.members);
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 64 * 2, "figures apart");
      }
    }
  });

  it("keeps people's stars apart, and the same sky every time", () => {
    // @ts-expect-error test doubles
    const a = buildSky(people, seats, { spacing: 60 });
    // @ts-expect-error test doubles
    const b = buildSky([...people].reverse(), seats, { spacing: 60 });
    for (let i = 0; i < a.stars.length; i += 1) {
      for (let j = i + 1; j < a.stars.length; j += 1) {
        const d = Math.hypot(a.stars[i]!.x - a.stars[j]!.x, a.stars[i]!.y - a.stars[j]!.y);
        assert.ok(d >= 60, `${a.stars[i]!.uid} and ${a.stars[j]!.uid} apart`);
      }
    }
    const at = (sky: typeof a, uid: string) => sky.stars.find((s) => s.uid === uid)!;
    for (const uid of ["a", "b", "c", "d"]) assert.deepEqual([at(a, uid).x, at(a, uid).y], [at(b, uid).x, at(b, uid).y]);
  });

  it("shows your newest work first, then the newest works, then others that change each visit", () => {
    const crowd = Array.from({ length: 8 }, (_, i) => [person(`x${i}`, [`w${i}`]), person(`y${i}`, [`w${i}`])]).flat();
    const you = person("you", ["w5", "w0"]);
    const newest = ["w7", "w6", "w5", "w4", "w3", "w2", "w1", "w0"];
    const visit = (rankOf: (key: string) => number) =>
      // @ts-expect-error test doubles
      buildSky([...crowd, you], seats, { maxConstellations: 5, me: "you", newest, rankOf }).constellations.map((c) => c.work.key);
    // w5 is yours and newer than w0 (your star sits in one figure only); then
    // the two newest; then this visit's order.
    assert.deepEqual(visit((key) => Number(key.slice(1))), ["w5", "w7", "w6", "w1", "w2"]);
    assert.deepEqual(visit((key) => -Number(key.slice(1))), ["w5", "w7", "w6", "w4", "w3"]);
  });

  it("always puts you up there, even before you've made anything", () => {
    // @ts-expect-error test doubles
    const sky = buildSky([...people, person("you", [])], seats.slice(0, 40), { me: "you" });
    assert.ok(sky.stars.some((s) => s.uid === "you"));
  });

  it("caps the constellations, and seats no more people than the sky has room for", () => {
    const many = Array.from({ length: 30 }, (_, i) => [person(`p${i}a`, [`w${i}`]), person(`p${i}b`, [`w${i}`])]).flat();
    // @ts-expect-error test doubles
    assert.equal(buildSky(many, seats).constellations.length, SKY_MAX_CONSTELLATIONS);
    // @ts-expect-error test doubles
    const cramped = buildSky(many, seats.slice(0, 6), { spacing: 10 });
    assert.ok(cramped.stars.length <= 6);
  });
});
