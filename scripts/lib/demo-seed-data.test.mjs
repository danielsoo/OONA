import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEMO_STILLS } from "../../src/lib/demo-world.ts";
import { buildDemoSeed, DEMO_ACCOUNT_DOMAIN } from "./demo-seed-data.mjs";

// As the script hands them in: each still's uploaded video.
const streams = Object.fromEntries(Object.values(DEMO_STILLS).map((path, i) => [path, `uid${i}`]));
const seed = buildDemoSeed({ password: "test-pass", streams, now: new Date("2026-10-20T00:00:00Z") });
const byPath = new Map(seed.docs.map((d) => [d.path, d.data]));
const under = (re) => seed.docs.filter((d) => re.test(d.path));

describe("demo seed", () => {
  it("writes each path once", () => {
    assert.equal(byPath.size, seed.docs.length);
  });

  it("gives every person a valid, unique handle that maps back to them", () => {
    const users = under(/^users\/[^/]+$/);
    assert.ok(users.length >= 100);
    const handles = new Set();
    for (const { path, data } of users) {
      assert.match(data.handle, /^[a-z0-9_.]{3,30}$/);
      // demo- handles are Society's in-app demo; the seeded world must not use them.
      assert.ok(!data.handle.startsWith("demo-"));
      assert.ok(!handles.has(data.handle), data.handle);
      handles.add(data.handle);
      assert.equal(byPath.get(`handles/${data.handle}`)?.uid, path.split("/")[1]);
      assert.equal(data.isDiscoverable, true);
      // Advisors open every page (made-up data); everyone else is a member.
      assert.equal(data.role, data.email?.endsWith(`@${DEMO_ACCOUNT_DOMAIN}`) ? "super_admin" : "member");
      assert.ok(data.updatedAt instanceof Date);
    }
  });

  it("makes every profile complete, so nobody is sent back to sign-up", () => {
    for (const { data } of under(/^users\/[^/]+$/)) {
      assert.ok(data.displayName && data.platformPurpose);
      assert.match(data.birthDate, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(["en", "ko", "ja"].includes(data.locale));
      assert.equal(data.gender, "undisclosed");
    }
  });

  it("publishes each work under its owner, with its video ready and accepted credits that index back", () => {
    const works = under(/^users\/[^/]+\/works\/[^/]+$/);
    assert.ok(works.length >= 40);
    for (const { path, data } of works) {
      const owner = path.split("/")[1];
      assert.ok(byPath.has(`users/${owner}`), owner);
      assert.ok(!owner.startsWith("demo-"));
      assert.equal(data.platformStatus, "published");
      assert.equal(data.streamStatus, "ready");
      assert.match(data.streamUid, /^uid\d+$/);
      assert.ok(byPath.has(`schools/${data.approvedSchoolId}`));
      assert.equal(typeof data.sortOrder, "number");
      const credits = under(new RegExp(`^${path}/credits/[^/]+$`));
      assert.ok(credits.length > 0);
      assert.ok(credits.some((c) => c.data.userId === owner), "the owner is credited");
      for (const c of credits) {
        assert.ok(byPath.has(`users/${c.data.userId}`), c.data.userId);
        assert.equal(c.data.status, "accepted");
        const index = byPath.get(`users/${c.data.userId}/creditIndex/${owner}_${path.split("/")[3]}_${c.path.split("/").at(-1)}`);
        assert.equal(index?.platformStatus, "published");
      }
    }
  });

  it("keeps follower counts true to the follow documents", () => {
    const followers = new Map();
    const following = new Map();
    for (const { path, data } of under(/^follows\//)) {
      assert.equal(path, `follows/${data.followerUid}_${data.followingUid}`);
      assert.notEqual(data.followerUid, data.followingUid);
      followers.set(data.followingUid, (followers.get(data.followingUid) ?? 0) + 1);
      following.set(data.followerUid, (following.get(data.followerUid) ?? 0) + 1);
    }
    for (const { path, data } of under(/^users\/[^/]+$/)) {
      const uid = path.split("/")[1];
      assert.equal(data.followerCount, followers.get(uid) ?? 0, uid);
      assert.equal(data.followingCount, following.get(uid) ?? 0, uid);
    }
  });

  it("gives each advisor a sign-in, works of their own, messages, a room, an offer and a portfolio link", () => {
    assert.equal(seed.accounts.length, 5);
    for (const account of seed.accounts) {
      assert.ok(account.email.endsWith(`@${DEMO_ACCOUNT_DOMAIN}`));
      assert.equal(account.password, "test-pass");
      const uid = account.uid;
      assert.ok(under(new RegExp(`^users/${uid}/works/[^/]+$`)).length >= 2);
      const threads = under(/^dmThreads\/[^/]+$/).filter((d) => d.data.participantIds.includes(uid));
      assert.equal(threads.length, 3);
      for (const t of threads) assert.deepEqual([...t.data.participantIds].sort(), t.data.participantIds);
      assert.ok(under(/^rooms\/[^/]+$/).some((d) => d.data.memberIds.includes(uid) && d.data.memberIds.length >= 2));
      assert.ok(under(/^businessInvites\//).some((d) => d.data.recipientUid === uid && d.data.status === "pending"));
      const share = under(new RegExp(`^users/${uid}/portfolioShares/`))[0];
      assert.ok(share && share.data.token.length >= 32 && share.data.includedWorkIds.length > 0);
      const membership = byPath.get(`users/${uid}/private/schoolVerification`)?.membership;
      const school = byPath.get(`schools/${membership.schoolId}`);
      assert.ok(school.emailDomains.includes(membership.email.split("@")[1]));
    }
  });

  it("only uses notification types the app knows", () => {
    const types = new Set(["work_approve", "work_reject", "new_follower", "new_dm_message", "new_room_message", "business_invite_received", "business_invite_accepted", "business_invite_declined"]);
    for (const { data } of under(/^notifications\//)) {
      assert.ok(types.has(data.type), data.type);
      assert.ok(byPath.has(`users/${data.recipientUid}`));
      assert.ok(data.createdAt instanceof Date);
    }
  });

  it("gives the newest works a published preview of their video", () => {
    const promos = under(/\/works\/[^/]+\/promoShort\/promo$/);
    assert.equal(promos.length, 12);
    for (const { path, data } of promos) {
      const work = byPath.get(path.replace(/\/promoShort\/promo$/, ""));
      assert.equal(data.platformStatus, "published");
      assert.equal(data.streamStatus, "ready");
      assert.equal(data.streamUid, work.streamUid);
    }
  });

  it("seeds a work with no video as still processing, so it stays out of lists", () => {
    const bare = buildDemoSeed({ password: "x" });
    const works = bare.docs.filter((d) => /\/works\/[^/]+$/.test(d.path));
    assert.ok(works.every((d) => d.data.streamStatus === "processing" && !d.data.streamUid));
    assert.equal(bare.docs.filter((d) => d.path.endsWith("/promoShort/promo")).length, 0);
  });
});
