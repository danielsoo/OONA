import type { PeopleProfilePayload } from "@/components/profile/PeopleProfileView";
import { DEMO_HANDLE_PREFIX, DEMO_ME, DEMO_ME_PROFILE } from "@/lib/demo-flags";
import { DEMO_SCHOOLS, DEMO_STILLS, DEMO_SYNOPSES, DEMO_WORKS, type DemoWork } from "@/lib/demo-world";
import { demoOwnerOf as ownerOf, demoPortfolio, demoProfile, demoSociety } from "@/lib/society-demo";
import { hashString } from "@/lib/society-sky";
import type { NotificationListItem } from "@/types/notification";
import type { SchoolListItem } from "@/types/school";
import type { PublicWorkWatch } from "@/types/watch";
import type { CatalogFeedItem, PromoFeedItem, WatchProgressItem } from "@/types/work";

/**
 * The demo's answers to the site's own API (lib/demo-fetch.ts routes /api/*
 * here while the demo is on): the made-up world of demo-world.ts in the
 * shapes the real endpoints return, so every browse page renders as it does
 * on the real site. Signed in as one of the world's people (DEMO_ME); what
 * a visitor does (follow, save, like) is answered as done and kept nowhere
 * but this tab. Loaded only in the demo.
 */

const uidOf = (id: string) => `${DEMO_HANDLE_PREFIX}${id}`;
const society = demoSociety();
const names = new Map(society.people.map((p) => [p.uid, p.displayName]));
const byWorkId = new Map(DEMO_WORKS.map((w) => [w.id, w]));
const stillKey = new Map<string, string>(Object.entries(DEMO_STILLS).map(([key, path]) => [path, key]));
/** A work's clip: a slow 6-second move over its still (public/videos/demo). */
const clipOf = (w: DemoWork) => `/videos/demo/${stillKey.get(w.still)}.mp4`;
const schoolId = (name: string) => `${DEMO_HANDLE_PREFIX}${name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
const views = (w: DemoWork) => 40 + (hashString(`views:${w.id}`) % 2400);
const likes = (w: DemoWork) => 3 + (hashString(`likes:${w.id}`) % 180);
const directorOf = (w: DemoWork) => names.get(ownerOf(w));
const newestFirst = [...DEMO_WORKS].sort((a, b) => b.date.localeCompare(a.date));
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

function catalogItem(w: DemoWork): CatalogFeedItem {
  return {
    id: `${ownerOf(w)}_${w.id}`,
    workId: w.id,
    ownerUid: ownerOf(w),
    title: w.title,
    director: directorOf(w),
    section: w.section,
    approvedTags: [],
    approvedSchoolId: schoolId(w.school),
    approvedSchoolName: w.school,
    thumbnailUrl: w.still,
    viewCount: views(w),
    likeCount: likes(w),
    publishedAt: `${w.date}T09:00:00.000Z`,
  };
}

function watchPayload(w: DemoWork): PublicWorkWatch {
  return {
    workId: w.id,
    ownerUid: ownerOf(w),
    title: w.title,
    ...(DEMO_SYNOPSES[w.id] ? { description: DEMO_SYNOPSES[w.id] } : {}),
    director: directorOf(w),
    section: w.section,
    approvedTags: [],
    approvedAspectRatio: "16:9",
    playbackUrl: clipOf(w),
    embedUrl: "",
    thumbnailUrl: w.still,
    durationSec: 6,
    credits: w.crew.map(([id, role, character], i) => ({
      id: `c${i + 1}`,
      userId: uidOf(id),
      role,
      displayName: names.get(uidOf(id)) ?? id,
      ...(character ? { characterName: character } : {}),
      avatarUrl: null,
      profileHref: `/people/${uidOf(id)}`,
    })),
    approvedSchoolId: schoolId(w.school),
    approvedSchoolName: w.school,
  };
}

function schools(): SchoolListItem[] {
  return Object.values(DEMO_SCHOOLS)
    .map((name) => {
      const initials = name.split(/\s+/).filter((word) => /^[A-Z]/.test(word)).map((word) => word[0]).join("").slice(0, 3);
      return {
        id: schoolId(name),
        name,
        shortName: name,
        initials,
        slug: schoolId(name),
        colorPrimary: ["#0ea5e9", "#6366f1", "#14b8a6", "#f59e0b", "#ec4899"][hashString(name) % 5]!,
        colorSecondary: "#ffffff",
        logoUrl: null,
        status: "active" as const,
        aliases: [],
        workCount: DEMO_WORKS.filter((w) => w.school === name).length,
      };
    })
    .sort((a, b) => (b.workCount ?? 0) - (a.workCount ?? 0));
}

/** One school's page (what app/school/[schoolId] reads on the server for a real one). */
function schoolPage(id: string) {
  const school = schools().find((s) => s.id === id);
  if (!school) return null;
  const items = newestFirst.filter((w) => w.school === school.name).map(catalogItem);
  const mostViewed = [...items].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
  const score = (i: CatalogFeedItem) => (i.viewCount ?? 0) + (i.likeCount ?? 0) * 3;
  return {
    school,
    stats: {
      workCount: items.length,
      movieCount: items.filter((i) => i.section === "movies").length,
      seriesCount: items.filter((i) => i.section === "series").length,
      entertainmentCount: items.filter((i) => i.section === "entertainment").length,
    },
    latest: items.slice(0, 12),
    mostViewed: mostViewed.slice(0, 12),
    representative: [...items].sort((a, b) => score(b) - score(a))[0] ?? null,
  };
}

/** Whom the demo member follows: about a third of the world, the same on every page. */
const follows = (uid: string) => uid !== DEMO_ME.uid && hashString(`f:${uid}`) % 3 === 0;

/** A demo person's profile, seen by the demo's own signed-in member. */
function profileFor(handle: string): PeopleProfilePayload | null {
  const payload = demoProfile(handle);
  if (!payload) return null;
  const isSelf = payload.profile.uid === DEMO_ME.uid;
  return { ...payload, viewer: { uid: DEMO_ME.uid, isSelf, isFollowing: follows(payload.profile.uid) } };
}

function notifications(): NotificationListItem[] {
  const follower = (id: string, h: number, read: boolean): NotificationListItem => ({
    id: `n-follow-${id}`,
    recipientUid: DEMO_ME.uid,
    type: "new_follower",
    actorUid: uidOf(id),
    actorDisplayName: names.get(uidOf(id)),
    actorAvatarUrl: null,
    read,
    createdAt: hoursAgo(h),
    targetPath: `/people/${uidOf(id)}`,
  });
  return [
    follower("hannah", 2, false),
    { id: "n-approve-low-tide", recipientUid: DEMO_ME.uid, type: "work_approve", workId: "low-tide", workTitle: "Low Tide", read: false, createdAt: hoursAgo(20), targetPath: `/watch/${DEMO_ME.uid}/low-tide` },
    follower("ines", 30, true),
    follower("ryan", 52, true),
  ];
}

/** Where the demo member stopped in a few works (the home's Continue Watching). */
function watchProgress(): WatchProgressItem[] {
  return ["midnight-ferry", "glass-garden", "share-house"].flatMap((id, i) => {
    const w = byWorkId.get(id);
    if (!w) return [];
    const positionSec = [4, 2, 3][i]!;
    return [{ ...catalogItem(w), positionSec, durationSec: 6, progressPercent: Math.round((positionSec / 6) * 100) }];
  });
}

/** The professional profile the member edits in settings (its read shape). */
function professionalProfile() {
  const p = DEMO_ME_PROFILE;
  return {
    handle: DEMO_ME.handle,
    headline: p.headline ?? null,
    bio: p.bio ?? null,
    roleTags: p.roleTags ?? [],
    crewRoles: [],
    isDiscoverable: true,
    openToCollaborate: true,
    collaborationNote: null,
    displayName: DEMO_ME.displayName,
    avatarUrl: null,
    defaultDirectorName: DEMO_ME.displayName,
    displayNameChangeRequest: null,
    handleChangeRequest: null,
    followerCount: society.people.find((person) => person.uid === DEMO_ME.uid)?.followerCount ?? 0,
    followingCount: society.people.filter((person) => follows(person.uid)).length,
    societyBannerBackgroundId: null,
    profileLink: null,
  };
}

// What the visitor saves and shares is kept for this tab only, so it holds
// across pages and reloads and is gone when the tab closes.
function remembered<T>(key: string, fallback: T): T {
  try {
    const raw = window.sessionStorage.getItem(`oona-demo:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function remember(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(`oona-demo:${key}`, JSON.stringify(value));
  } catch {
    /* kept for this page only */
  }
}

type DemoShare = { id: string; token: string; title: string; visibility: string; viewCount: number; includedWorkIds: string[]; excludedWorkIds: string[] };

/** The member's own works a portfolio link can pick from (the share dialog's list). */
function eligibleWorks() {
  const me = demoProfile(DEMO_ME.handle);
  return me
    ? [...me.directed, ...me.credited].map((w) => ({ workId: w.workId, ownerUid: w.ownerUid, title: w.title, role: w.role, portfolioSubmissionHidden: false }))
    : [];
}

/** A link's token carries its picks (society-demo's demoPortfolio reads them back). */
const shareToken = (workIds: string[]) => `${DEMO_ME.handle}~${workIds.join(".")}`;

function parse(body: string | undefined): Record<string, unknown> {
  try {
    return body ? (JSON.parse(body) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function portfolioShares(method: string, id: string | undefined, body: Record<string, unknown>): Response {
  const shares = remembered<DemoShare[]>("shares", []);
  const workIds = Array.isArray(body.includedWorkIds) ? body.includedWorkIds.map(String) : [];
  const title = String(body.title ?? "Portfolio").trim().slice(0, 200) || "Portfolio";
  if (!id && method === "GET") return json({ shares, eligibleWorks: eligibleWorks() });
  if (!id && method === "POST") {
    const share: DemoShare = { id: `s${Date.now().toString(36)}`, token: shareToken(workIds), title, visibility: "active", viewCount: 0, includedWorkIds: workIds, excludedWorkIds: [] };
    remember("shares", [share, ...shares]);
    return json({ ...share, shareUrl: `${window.location.origin}/p/${share.token}` });
  }
  if (id && method === "PATCH") {
    remember("shares", shares.map((s) => (s.id === id ? { ...s, title, includedWorkIds: workIds, token: shareToken(workIds) } : s)));
    return json({ ok: true });
  }
  if (id && method === "DELETE") remember("shares", shares.filter((s) => s.id !== id));
  return json({ ok: true });
}

function watchlist(method: string, url: URL, body: Record<string, unknown>): Response {
  const saved = remembered<string[]>("watchlist", []);
  if (method === "POST") {
    const workId = String(body.workId ?? "");
    const next = body.saved === false ? saved.filter((id) => id !== workId) : [...new Set([workId, ...saved])];
    remember("watchlist", next);
    return json({ ok: true, saved: body.saved !== false });
  }
  const workId = url.searchParams.get("workId");
  if (workId) return json({ saved: saved.includes(workId) });
  return json({ items: saved.flatMap((id) => (byWorkId.has(id) ? [catalogItem(byWorkId.get(id)!)] : [])) });
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/**
 * The demo's answer for an /api/* request, or null to let it through to the
 * real site (public reads it doesn't need to fake, like the home theme).
 * Requests about the signed-in member never leave: anything not answered
 * here comes back as a plain success.
 */
export function answerDemoApi(url: URL, method: string, rawBody?: string): Response | null {
  const path = url.pathname.replace(/\/+$/, "");
  const parts = path.split("/").slice(2).map(decodeURIComponent); // after /api
  const get = method === "GET";

  if (get && path === "/api/feed/works") {
    const section = url.searchParams.get("section") ?? url.searchParams.get("category");
    const limit = Math.min(24, Math.max(1, Number(url.searchParams.get("limit")) || 8));
    return json({ items: newestFirst.filter((w) => w.section === section).slice(0, limit).map(catalogItem) });
  }
  if (get && path === "/api/feed/credits-roll") {
    return json({ works: society.works.map((w) => ({ ...w, previewUrl: clipOf(byWorkId.get(w.workId)!), playbackUrl: clipOf(byWorkId.get(w.workId)!) })) });
  }
  if (get && path === "/api/feed/promo-shorts") {
    const items: PromoFeedItem[] = newestFirst.slice(0, 12).map((w) => ({
      id: `${ownerOf(w)}_${w.id}`,
      workId: w.id,
      ownerUid: ownerOf(w),
      title: w.title,
      director: directorOf(w) ?? "—",
      description: DEMO_SYNOPSES[w.id] ?? "",
      videoUrl: clipOf(w),
      aspectRatio: 16 / 9,
      thumbnailUrl: w.still,
      likeCount: likes(w),
      viewCount: views(w),
      likedByMe: false,
    }));
    return json({ items });
  }
  if (get && parts[0] === "watch" && parts.length === 3) {
    const work = byWorkId.get(parts[2]!);
    return work ? json(watchPayload(work)) : json({ error: "not_found" }, 404);
  }
  if (get && path === "/api/schools") return json({ schools: schools() });
  if (get && parts[0] === "schools" && parts.length === 2) {
    const page = schoolPage(parts[1]!);
    return page ? json(page) : json({ error: "not_found" }, 404);
  }
  if (get && path === "/api/discover/people") {
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const role = url.searchParams.get("role");
    const followingOnly = url.searchParams.get("followingOnly") === "1";
    const people = society.people
      .filter((p) => !q || [p.displayName, p.handle, p.headline ?? ""].some((text) => text.toLowerCase().includes(q)))
      .filter((p) => (!role || (p.roleTags as string[]).includes(role)) && (!followingOnly || follows(p.uid)))
      .map((p) => ({ ...p, crewRoles: [], isOnline: hashString(`on:${p.uid}`) % 6 === 0, lastSeenAt: null }));
    return json({ people });
  }
  if (get && parts[0] === "people" && parts[1] === "by-uid" && parts.length === 3) {
    return names.has(parts[2]!) ? json({ uid: parts[2], handle: parts[2] }) : json({ error: "not_found" }, 404);
  }
  if (get && parts[0] === "people" && parts.length === 2) {
    const payload = profileFor(parts[1]!);
    return payload ? json(payload) : json({ error: "not_found" }, 404);
  }
  if (get && parts[0] === "portfolio" && parts.length === 2) {
    const payload = demoPortfolio(parts[1]!);
    return payload ? json(payload) : json({ error: "not_found" }, 404);
  }

  // The signed-in member's own requests.
  if (get && path === "/api/me/unread-counts") return json({ notifications: notifications().filter((n) => !n.read).length, messages: 0 });
  if (get && path === "/api/me/notifications") return json({ notifications: notifications() });
  if (get && path === "/api/me/watch-progress") return json({ items: watchProgress() });
  if (get && path === "/api/me/professional-profile") return json(professionalProfile());
  if (get && path === "/api/me/following") return json({ uids: society.people.filter((p) => follows(p.uid)).map((p) => p.uid) });
  if (path === "/api/me/watchlist") return watchlist(method, url, parse(rawBody));
  if (parts[0] === "me" && parts[1] === "portfolio-shares" && parts.length <= 3) return portfolioShares(method, parts[2], parse(rawBody));

  // Anything else about the member, and anything that would change data: done, kept nowhere.
  if (parts[0] === "me" || !get) return json({ ok: true });
  return null;
}
