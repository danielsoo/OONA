/**
 * The documents and sign-in accounts scripts/demo-seed.mjs writes, built from
 * the made-up world in src/lib/demo-world.ts, in the shapes the app reads
 * (src/lib/server/*: users, handles, works and their credits, creditIndex,
 * schools, follows, notifications, dmThreads, rooms, businessInvites,
 * portfolioShares, workProfileNotes).
 *
 * Pure: plain objects and Dates (Firestore stores Dates as timestamps), no
 * Firebase, so it can be checked on its own (demo-seed-data.test.mjs).
 *
 * Who's who:
 * - The world's 101 people are seed-<id>, with their id as their handle.
 *   (Not demo-<id>: the app reads demo- handles as Society's in-app demo.)
 * - Each work belongs to its director (or the first of its crew), and its
 *   whole crew is credited on it, owner included, as real uploads leave it.
 * - The sign-in accounts are advisors: each is a filmmaker in the world too,
 *   with two works of their own, credits on three of the world's, people who
 *   follow them, messages waiting, a crew room, an offer, and a portfolio link.
 */
import { randomBytes } from "node:crypto";
import { DEMO_NOTES, DEMO_PEOPLE, DEMO_STILLS, DEMO_SYNOPSES, DEMO_WORKS } from "../../src/lib/demo-world.ts";

/** Demo sign-in accounts' email domain (reserved .test, so never deliverable); --reset finds old ones by it. */
export const DEMO_ACCOUNT_DOMAIN = "oona-demo.test";
/** The advisors' (made-up) school email domain: Riverside's, as its school doc lists it. */
const SCHOOL_EMAIL_DOMAIN = `riverside-film-academy.${DEMO_ACCOUNT_DOMAIN}`;
export const SEED_VERSION = 1;
export const ADVISOR_COUNT = 5;

const HANDLE = /^[a-z0-9_.]{3,30}$/;
const DAY = 86_400_000;

/** A steady pseudo-random number per key, so a reseed tells the same story. */
function hash(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const pick = (key, list) => list[hash(key) % list.length];

export function slugifySchoolName(raw) {
  // Same as src/lib/server/schools.ts, so school pages find their works.
  return raw.trim().toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

/** The language a made-up person would pick, from the script of their name. */
function localeOf(name) {
  if (/[가-힣]/.test(name)) return "ko";
  if (/[぀-ヿ一-鿿]/.test(name)) return "ja";
  return "en";
}

const ADVISOR_WORKS = [
  ["night-bus", "Night Bus", "movies", "The last bus home, and the four strangers who never got off.", "portalNight"],
  ["paper-walls", "Paper Walls", "movies", "Two neighbours who only know each other through the wall.", "livingRoom"],
  ["slow-tide", "Slow Tide", "movies", "A fisherman teaches his granddaughter to wait.", "shoreline"],
  ["open-mic", "Open Mic", "entertainment", "One night, eleven acts, one broken microphone.", "stage"],
  ["after-school", "After School", "series", "Three friends, one empty classroom, every Friday.", "rooftopCity"],
  ["blue-hour", "Blue Hour", "movies", "A wedding photographer misses the only shot that mattered.", "waveNight"],
  ["kitchen-table", "Kitchen Table", "entertainment", "A family argues its way through one dinner.", "kitchen"],
  ["salt-lines", "Salt Lines", "movies", "A swimmer trains for a race she isn't sure she wants.", "underwaterRays"],
  ["signal", "Signal", "movies", "A radio operator hears a voice she knows.", "starfield"],
  ["lighthouse-keeper", "The Lighthouse Keeper", "movies", "The last keeper on the coast, on his last night.", "lighthouse"],
];
const ADVISOR_ROLES = ["edit", "cinematography", "writer", "sound", "actor"];
/** Made-up names for the advisors' accounts (a profile sets a name's last word on a line of its own, so no "Advisor 1"). */
const ADVISOR_NAMES = ["Alex Morgan", "Jamie Cho", "Riley Sato", "Sam Ortiz", "Taylor Kwon"];
const DM_LINES = [
  ["Saw your cut of Night Bus. The ending stayed with me all day.", "Thank you! We reshot it twice to get the light right."],
  ["Are you still looking for a sound recordist for the next one?", "I am. Shooting in March, three nights. Interested?"],
  ["다음 작품 촬영 일정 나오면 알려주세요!", "네, 2월 말쯤 확정될 것 같아요. 꼭 연락드릴게요."],
];
const ROOM_LINES = [
  "Call time tomorrow is 5:30 at the pier.",
  "Bringing the second lav mic, the first one died.",
  "Weather says clear until 9. We get one take at golden hour.",
  "I'll have the rough cut by Sunday.",
];

/**
 * Everything to write. Options: password for the advisor accounts (else one
 * is made up and printed), sampleVideos (https URLs dealt to the works as
 * their sample clip), now (the moment the seed treats as today).
 */
export function buildDemoSeed({ password, sampleVideos = [], now = new Date() } = {}) {
  const docs = [];
  const put = (path, data) => docs.push({ path, data });
  const ago = (days, key = "") => new Date(now.getTime() - days * DAY - (hash(key) % 3_600_000));
  const accountPassword = password || `oona-${randomBytes(4).toString("hex")}`;

  // ---- People ----
  const people = DEMO_PEOPLE.map((p) => {
    const handle = HANDLE.test(p.id) ? p.id : `${p.id.replace(/[^a-z0-9_.]/g, "").slice(0, 24)}_film`.padEnd(3, "_");
    return { id: p.id, uid: `seed-${p.id}`, handle, name: p.name, tags: p.tags, open: !!p.open, headline: p.headline, bio: p.bio };
  });
  const advisors = Array.from({ length: ADVISOR_COUNT }, (_, i) => {
    const n = i + 1;
    return {
      id: `advisor${n}`,
      uid: `seed-advisor-${n}`,
      handle: `advisor${n}`,
      name: ADVISOR_NAMES[i % ADVISOR_NAMES.length],
      email: `advisor${n}@${DEMO_ACCOUNT_DOMAIN}`,
      tags: ["director", "crew"],
      open: true,
      headline: "Director & editor · demo account",
      bio: "This is your demo account. Upload, follow, message, share a portfolio: nothing you do here touches the real OONA.",
      advisor: true,
    };
  });
  const everyone = [...people, ...advisors];
  const byId = new Map(everyone.map((p) => [p.id, p]));

  // ---- Works: the world's, then two of each advisor's ----
  const works = DEMO_WORKS.map((w) => ({ ...w, synopsis: DEMO_SYNOPSES[w.id] }));
  advisors.forEach((a, ai) => {
    for (let k = 0; k < 2; k += 1) {
      const [slug, title, section, synopsis, still] = ADVISOR_WORKS[(ai * 2 + k) % ADVISOR_WORKS.length];
      const crewIds = [0, 1, 2].map((j) => people[(hash(`${a.id}:${slug}:${j}`) % people.length)].id);
      const crew = [[a.id, "director"], [crewIds[0], "cinematography"], [crewIds[1], "actor", "Sam"], [crewIds[2], "sound"]]
        .filter((c, i, list) => list.findIndex((o) => o[0] === c[0]) === i);
      works.push({ id: `${slug}-${a.id}`, title, still: DEMO_STILLS[still], school: "Riverside Film Academy", date: ago(20 + ai * 9 + k * 4).toISOString().slice(0, 10), section, crew, synopsis });
    }
    // …and credits on three of the world's works.
    for (let k = 0; k < 3; k += 1) {
      const w = works[(hash(`${a.id}:credit:${k}`) + k * 7) % DEMO_WORKS.length];
      if (!w.crew.some(([id]) => id === a.id)) w.crew = [...w.crew, [a.id, ADVISOR_ROLES[(ai + k) % ADVISOR_ROLES.length]]];
    }
  });

  const schools = new Map();
  const ownedCount = new Map();
  const firstSchool = new Map();
  works.forEach((w, wi) => {
    const owner = byId.get((w.crew.find(([, role]) => role === "director") ?? w.crew[0])[0]);
    w.ownerUid = owner.uid;
    w.ownerName = owner.name;
    w.schoolId = slugifySchoolName(w.school);
    schools.set(w.schoolId, { name: w.school, count: (schools.get(w.schoolId)?.count ?? 0) + 1 });
    ownedCount.set(owner.uid, (ownedCount.get(owner.uid) ?? 0) + 1);
    for (const [id] of w.crew) if (!firstSchool.has(id)) firstSchool.set(id, w.school);
    const published = new Date(`${w.date}T09:00:00.000Z`);
    w.views = 40 + (hash(`views:${w.id}`) % 2400);
    w.likes = 3 + (hash(`likes:${w.id}`) % 180);
    const base = `users/${owner.uid}/works/${w.id}`;
    put(base, {
      kind: "full",
      title: w.title,
      ...(w.synopsis ? { description: w.synopsis } : {}),
      director: owner.name,
      section: w.section,
      platformStatus: "published",
      // Ready, with no Stream video: lists and the watch page take the poster
      // (demo-media.ts), and "Manage works" has nothing to ask Cloudflare.
      streamStatus: "ready",
      approvedSchoolId: w.schoolId,
      approvedSchoolName: w.school,
      proposedSchoolId: w.schoolId,
      proposedSchoolName: w.school,
      approvedTags: [],
      proposedTags: [],
      approvedAspectRatio: "16:9",
      proposedAspectRatio: "16:9",
      // The poster everything shows (src/lib/server/demo-media.ts on the demo site).
      promoDraft: { title: w.title, description: w.synopsis ?? null, thumbnailUrl: w.still },
      ...(sampleVideos.length ? { demoPlaybackUrl: sampleVideos[wi % sampleVideos.length] } : {}),
      sortOrder: ownedCount.get(owner.uid),
      viewCount: w.views,
      likeCount: w.likes,
      publishedAt: published,
      reviewedAt: published,
      createdAt: new Date(published.getTime() - 3 * DAY),
      updatedAt: published,
    });
    w.crew.forEach(([id, role, character], ci) => {
      const person = byId.get(id);
      const creditId = `c${ci + 1}`;
      put(`${base}/credits/${creditId}`, {
        userId: person.uid,
        role,
        displayName: person.name,
        ...(character ? { characterName: character } : {}),
        sortOrder: ci,
        status: "accepted",
        createdAt: published,
        updatedAt: published,
      });
      put(`users/${person.uid}/creditIndex/${owner.uid}_${w.id}_${creditId}`, {
        ownerUid: owner.uid,
        workId: w.id,
        role,
        characterName: character ?? null,
        workTitle: w.title,
        workSection: w.section,
        platformStatus: "published",
        creditedAt: published,
      });
    });
  });

  for (const [id, { name, count }] of schools) {
    put(`schools/${id}`, { name, slug: id, status: "active", aliases: [], workCount: count, emailDomains: [`${id}.${DEMO_ACCOUNT_DOMAIN}`], colorPrimary: pick(`color:${id}`, ["#0ea5e9", "#6366f1", "#14b8a6", "#f59e0b", "#ec4899"]), colorSecondary: "#ffffff", createdAt: ago(400, id), updatedAt: ago(30, id) });
  }

  // ---- Follows: each person follows a handful; everyone follows some advisors ----
  const follows = new Set();
  const follow = (a, b) => a.uid !== b.uid && follows.add(`${a.uid}|${b.uid}`);
  people.forEach((p, i) => {
    const n = 3 + (hash(`n:${p.id}`) % 6);
    for (let k = 0; k < n; k += 1) follow(p, people[(i + 1 + (hash(`${p.id}:${k}`) % (people.length - 1))) % people.length]);
  });
  advisors.forEach((a, ai) => {
    for (let k = 0; k < 18; k += 1) follow(people[(ai * 11 + k * 5) % people.length], a);
    for (let k = 0; k < 12; k += 1) follow(a, people[(ai * 7 + k * 3) % people.length]);
  });
  const followers = new Map();
  const following = new Map();
  for (const pair of follows) {
    const [a, b] = pair.split("|");
    following.set(a, (following.get(a) ?? 0) + 1);
    followers.set(b, (followers.get(b) ?? 0) + 1);
    put(`follows/${a}_${b}`, { followerUid: a, followingUid: b, createdAt: ago(5 + (hash(pair) % 200), pair) });
  }

  // ---- Users and handles ----
  everyone.forEach((p, i) => {
    const director = p.tags.includes("director");
    put(`users/${p.uid}`, {
      displayName: p.name,
      ...(director ? { defaultDirectorName: p.name } : {}),
      locale: p.advisor ? "en" : localeOf(p.name),
      birthDate: `${1994 + (hash(`y:${p.id}`) % 9)}-${String(1 + (hash(`m:${p.id}`) % 12)).padStart(2, "0")}-${String(1 + (hash(`d:${p.id}`) % 27)).padStart(2, "0")}`,
      gender: "undisclosed",
      age: null,
      isStudent: true,
      schoolName: p.advisor ? "Riverside Film Academy" : firstSchool.get(p.id) ?? null,
      platformPurpose: p.advisor ? "both" : director ? "upload" : "collaborate",
      email: p.email ?? null,
      emailVerified: true,
      role: "member",
      handle: p.handle,
      headline: p.headline,
      bio: p.bio,
      roleTags: p.tags,
      isDiscoverable: true,
      openToCollaborate: p.open,
      ...(p.open ? { collaborationNote: "Open to new projects this season." } : {}),
      followerCount: followers.get(p.uid) ?? 0,
      followingCount: following.get(p.uid) ?? 0,
      createdAt: ago(300 + (hash(`c:${p.id}`) % 300), p.id),
      // Society lists people by this, newest first: spread so the order looks lived in.
      updatedAt: p.advisor ? ago(0, p.id) : ago(1 + (i % 60), p.id),
    });
    put(`handles/${p.handle}`, { uid: p.uid, updatedAt: ago(300, p.id) });
  });

  // ---- What each person wrote about their part in a work ----
  for (const [key, text] of Object.entries(DEMO_NOTES)) {
    const [personId, workId] = key.split(":");
    const work = works.find((w) => w.id === workId);
    const person = byId.get(personId);
    if (work && person) put(`users/${person.uid}/workProfileNotes/${work.ownerUid}_${work.id}`, { text, updatedAt: ago(10, key) });
  }

  // ---- Each owner's totals (profile "Views", uploader analytics), spread over the last month ----
  const totals = new Map();
  for (const w of works) {
    const t = totals.get(w.ownerUid) ?? { views: 0, likes: 0 };
    t.views += w.views;
    t.likes += w.likes;
    totals.set(w.ownerUid, t);
  }
  for (const [uid, t] of totals) {
    const viewsByDay = {};
    const likesByDay = {};
    for (let d = 0; d < 30; d += 1) {
      const day = new Date(now.getTime() - d * DAY).toISOString().slice(0, 10);
      viewsByDay[day] = Math.round((t.views / 60) * (1 + ((hash(`${uid}:v:${d}`) % 100) / 100)));
      likesByDay[day] = Math.round((t.likes / 60) * (1 + ((hash(`${uid}:l:${d}`) % 100) / 100)));
    }
    put(`users/${uid}/private/analytics`, { totalViews: t.views, totalLikes: t.likes, viewsByDay, likesByDay, updatedAt: now });
  }

  // ---- Advisors are verified students of Riverside (school-only features open) ----
  const riverside = slugifySchoolName("Riverside Film Academy");
  advisors.forEach((a) => {
    put(`users/${a.uid}/private/schoolVerification`, {
      membership: {
        schoolId: riverside,
        schoolName: "Riverside Film Academy",
        email: `${a.id}@${SCHOOL_EMAIL_DOMAIN}`,
        enrolled: true,
        graduationMonth: `${now.getUTCFullYear() + 1}-06`,
        verifiedAt: now.getTime(),
      },
    });
  });

  // ---- Each advisor's inbox: messages, a crew room, an offer, notifications, a portfolio link ----
  advisors.forEach((a, ai) => {
    const contacts = [0, 1, 2].map((k) => people[(ai * 13 + k * 17 + 3) % people.length]);
    contacts.forEach((c, k) => {
      const ids = [a.uid, c.uid].sort();
      const threadId = ids.join("_");
      const [first, reply] = DM_LINES[k % DM_LINES.length];
      // The last one waits unread: it's their reply.
      const unread = k === 0;
      const t1 = ago(2 + k * 3, `${threadId}:1`);
      const t2 = new Date(t1.getTime() + 40 * 60_000);
      put(`dmThreads/${threadId}/messages/m1`, { senderUid: unread ? a.uid : c.uid, text: first, createdAt: t1 });
      put(`dmThreads/${threadId}/messages/m2`, { senderUid: unread ? c.uid : a.uid, text: reply, createdAt: t2 });
      put(`dmThreads/${threadId}`, {
        participantIds: ids,
        lastMessageAt: t2,
        lastMessagePreview: reply.slice(0, 200),
        lastSenderUid: unread ? c.uid : a.uid,
        lastReadAt: { [a.uid]: unread ? t1 : t2, [c.uid]: t2 },
        createdAt: t1,
        updatedAt: t2,
      });
      if (unread) put(`notifications/dm-${a.id}-${k}`, { recipientUid: a.uid, type: "new_dm_message", actorUid: c.uid, threadId, messagePreview: reply.slice(0, 120), read: false, createdAt: t2 });
    });

    const ownWork = works.find((w) => w.id.endsWith(`-${a.id}`));
    const crew = ownWork.crew.map(([id]) => byId.get(id).uid);
    const roomId = `room-${a.id}`;
    const roomTimes = ROOM_LINES.map((_, k) => ago(1, `${roomId}:${k}`).getTime() + k * 600_000);
    ROOM_LINES.forEach((text, k) => put(`rooms/${roomId}/messages/m${k + 1}`, { senderUid: crew[(k + 1) % crew.length], text, createdAt: new Date(roomTimes[k]) }));
    put(`rooms/${roomId}`, {
      name: `${ownWork.title} crew`,
      memberIds: crew,
      createdBy: a.uid,
      lastMessageAt: new Date(roomTimes.at(-1)),
      lastMessagePreview: ROOM_LINES.at(-1),
      lastSenderUid: crew[ROOM_LINES.length % crew.length],
      lastReadAt: { [a.uid]: new Date(roomTimes[1]) },
      createdAt: ago(9, roomId),
      updatedAt: new Date(roomTimes.at(-1)),
    });

    const sender = people[(ai * 19 + 5) % people.length];
    const inviteId = `offer-${a.id}`;
    put(`businessInvites/${inviteId}`, {
      senderUid: sender.uid,
      recipientUid: a.uid,
      direction: "offer",
      message: `Hi ${a.name}, I loved your work on ${ownWork.title}. Would you edit my next short? Four shooting days in April.`,
      status: "pending",
      attachedWorkIds: [],
      excludedWorkIds: [],
      role: "Editor",
      permissions: "view_comment",
      availability: "April",
      location: "Seoul",
      compensation: "paid",
      createdAt: ago(1, inviteId),
      updatedAt: ago(1, inviteId),
    });
    put(`notifications/offer-${a.id}`, { recipientUid: a.uid, type: "business_invite_received", actorUid: sender.uid, inviteId, read: false, createdAt: ago(1, inviteId) });
    [0, 1, 2].forEach((k) => {
      const fan = people[(ai * 11 + k * 5) % people.length];
      put(`notifications/follow-${a.id}-${k}`, { recipientUid: a.uid, type: "new_follower", actorUid: fan.uid, read: k > 0, createdAt: ago(k * 2 + 0.5, `${a.id}:${k}`) });
    });
    put(`notifications/approve-${a.id}`, { recipientUid: a.uid, type: "work_approve", workId: ownWork.id, workTitle: ownWork.title, read: true, createdAt: ago(18, ownWork.id) });

    const mine = works.filter((w) => w.crew.some(([id]) => id === a.id));
    put(`users/${a.uid}/portfolioShares/share-${a.id}`, {
      token: randomBytes(24).toString("base64url"),
      title: `${a.name} — selected work`,
      includedWorkIds: mine.slice(0, 4).map((w) => w.id),
      excludedWorkIds: [],
      visibility: "active",
      viewCount: 3 + (hash(`share:${a.id}`) % 40),
      createdAt: ago(6, a.id),
      updatedAt: ago(6, a.id),
    });
  });

  return {
    version: SEED_VERSION,
    docs,
    accounts: advisors.map((a) => ({ uid: a.uid, email: a.email, password: accountPassword, displayName: a.name })),
  };
}
