import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDirectory, handleFromProfileHref, primaryRole } from "./society-directory.ts";

const person = (uid: string, extra: Record<string, unknown> = {}) => ({
  uid,
  handle: uid,
  displayName: uid.toUpperCase(),
  roleTags: [],
  openToCollaborate: false,
  followerCount: 0,
  ...extra,
});
const credit = (userId: string, role: string, profileHref: string | null = `/people/${userId}`) => ({ userId, role, displayName: userId.toUpperCase(), profileHref });
const work = (workId: string, credits: ReturnType<typeof credit>[], schoolName?: string) => ({
  workId,
  ownerUid: "owner",
  title: workId,
  section: "movies",
  schoolName,
  stillUrl: `/${workId}.jpg`,
  previewUrl: null,
  playbackUrl: "",
  credits,
});
const byName = (uid: string) => uid.charCodeAt(0);

describe("buildDirectory", () => {
  it("joins Discover people with their credits, schools and collaborators", () => {
    const dir = buildDirectory(
      // @ts-expect-error test doubles carry only the fields used
      [person("a", { roleTags: ["director"], openToCollaborate: true }), person("b")],
      // @ts-expect-error test doubles
      [work("w1", [credit("a", "director"), credit("b", "actor")], "Penn State"), work("w2", [credit("a", "director")])],
      { rankOf: byName }
    );
    const a = dir.people.find((p) => p.uid === "a")!;
    const b = dir.people.find((p) => p.uid === "b")!;
    assert.deepEqual(a.credits.map((c) => c.work.workId), ["w1", "w2"]);
    assert.deepEqual(a.schools, ["Penn State"]);
    assert.deepEqual(a.collaborators, ["b"]);
    assert.deepEqual(b.collaborators, ["a"]);
    assert.deepEqual(a.groups, ["director"]);
    assert.deepEqual(b.groups, ["cast"]);
    assert.equal(a.available, true);
    assert.equal(dir.works.length, 2);
  });

  it("adds credited people with a public profile, skips those without, and leaves you out", () => {
    const dir = buildDirectory(
      // @ts-expect-error test doubles
      [person("me")],
      // @ts-expect-error test doubles
      [work("w1", [credit("me", "director"), credit("c", "sound"), credit("d", "edit", null)])],
      { excludeUid: "me", rankOf: byName }
    );
    assert.deepEqual(dir.people.map((p) => p.uid), ["c"]);
    assert.equal(dir.people[0]!.handle, "c");
    assert.deepEqual(dir.people[0]!.groups, ["crew"]);
  });

  it("orders people by the given rank", () => {
    // @ts-expect-error test doubles
    const dir = buildDirectory([person("b"), person("c"), person("a")], [], { rankOf: byName });
    assert.deepEqual(dir.people.map((p) => p.uid), ["a", "b", "c"]);
  });
});

describe("helpers", () => {
  it("reads the handle from a profile link", () => {
    assert.equal(handleFromProfileHref("/people/xiio"), "xiio");
    assert.equal(handleFromProfileHref("/people/%EB%B0%95?x=1"), "박");
    assert.equal(handleFromProfileHref(null), null);
    assert.equal(handleFromProfileHref("/watch/a/b"), null);
  });

  it("names the role a person is best known for", () => {
    const w = { key: "k", ownerUid: "o", workId: "w", title: "t", stillUrl: "", schoolName: null };
    assert.equal(primaryRole({ roleTags: [], credits: [{ work: w, role: "sound", character: null }, { work: w, role: "edit", character: null }, { work: w, role: "edit", character: null }] }), "edit");
    assert.equal(primaryRole({ roleTags: ["actor"], credits: [] }), "actor");
    assert.equal(primaryRole({ roleTags: [], credits: [] }), "crew");
  });
});
