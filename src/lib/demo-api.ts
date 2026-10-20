import type { PeopleProfilePayload } from "@/components/profile/PeopleProfileView";
import { DEMO_HANDLE_PREFIX, DEMO_OWNER } from "@/lib/demo-flags";
import { DEMO_SCHOOLS, DEMO_STILLS, DEMO_SYNOPSES, DEMO_WORKS, type DemoWork } from "@/lib/demo-world";
import { demoPortfolio, demoProfile, demoSociety } from "@/lib/society-demo";
import { hashString } from "@/lib/society-sky";
import type { SchoolListItem } from "@/types/school";
import type { PublicWorkWatch } from "@/types/watch";
import type { CatalogFeedItem, PromoFeedItem } from "@/types/work";

/**
 * The demo's answers to the site's own API (lib/demo-fetch.ts routes /api/*
 * here while the demo is on): the made-up world of demo-world.ts in the
 * shapes the real endpoints return, so every browse page renders as it does
 * on the real site. Signed in as one of the world's people (DEMO_ME); what
 * a visitor does (follow, save, like) is answered as done and kept nowhere.
 * Loaded only in the demo.
 */

/** Who the demo is signed in as: one of the world's people, with works and a sky of her own. */
export const DEMO_ME = { id: "lena", uid: `${DEMO_HANDLE_PREFIX}lena`, handle: `${DEMO_HANDLE_PREFIX}lena`, name: "Lena Brandt", email: "lena@demo.oona" } as const;

const uidOf = (id: string) => `${DEMO_HANDLE_PREFIX}${id}`;
const stillKey = new Map<string, string>(Object.entries(DEMO_STILLS).map(([key, path]) => [path, key]));
/** A work's clip: a slow 6-second move over its still (public/videos/demo). */
const clipOf = (w: DemoWork) => `/videos/demo/${stillKey.get(w.still)}.mp4`;
const schoolId = (name: string) => name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const views = (w: DemoWork) => 40 + (hashString(`views:${w.id}`) % 2400);
const likes = (w: DemoWork) => 3 + (hashString(`likes:${w.id}`) % 180);
const directorOf = (w: DemoWork) => {
  const id = (w.crew.find(([, role]) => role === "director") ?? w.crew[0])?.[0];
  return demoSociety().people.find((p) => p.uid === uidOf(id ?? ""))?.displayName;
};
const newestFirst = [...DEMO_WORKS].sort((a, b) => b.date.localeCompare(a.date));

function catalogItem(w: DemoWork): CatalogFeedItem {
  return {
    id: `${DEMO_OWNER}_${w.id}`,
    workId: w.id,
    ownerUid: DEMO_OWNER,
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
  const people = new Map(demoSociety().people.map((p) => [p.uid, p.displayName]));
  return {
    workId: w.id,
    ownerUid: DEMO_OWNER,
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
      displayName: people.get(uidOf(id)) ?? id,
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

/** A demo person's profile, seen by the demo's own signed-in member. */
function profileFor(handle: string): PeopleProfilePayload | null {
  const payload = demoProfile(handle);
  if (!payload) return null;
  const isSelf = payload.profile.uid === DEMO_ME.uid;
  return { ...payload, viewer: { uid: DEMO_ME.uid, isSelf, isFollowing: !isSelf && hashString(`f:${handle}`) % 3 === 0 } };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/**
 * The demo's answer for an /api/* request, or null to let it through to the
 * real site (public reads it doesn't need to fake, like the home theme).
 * Requests about the signed-in member never leave: anything not answered
 * here comes back as a plain success.
 */
export function answerDemoApi(url: URL, method: string): Response | null {
  const path = url.pathname.replace(/\/+$/, "");
  const parts = path.split("/").slice(2).map(decodeURIComponent); // after /api
  const get = method === "GET";

  if (get && path === "/api/feed/works") {
    const section = url.searchParams.get("section") ?? url.searchParams.get("category");
    const limit = Math.min(24, Math.max(1, Number(url.searchParams.get("limit")) || 8));
    return json({ items: newestFirst.filter((w) => w.section === section).slice(0, limit).map(catalogItem) });
  }
  if (get && path === "/api/feed/credits-roll") {
    const byId = new Map(DEMO_WORKS.map((w) => [w.id, w]));
    return json({ works: demoSociety().works.map((w) => ({ ...w, previewUrl: clipOf(byId.get(w.workId)!), playbackUrl: clipOf(byId.get(w.workId)!) })) });
  }
  if (get && path === "/api/feed/promo-shorts") {
    const items: PromoFeedItem[] = newestFirst.slice(0, 12).map((w) => ({
      id: `${DEMO_OWNER}_${w.id}`,
      workId: w.id,
      ownerUid: DEMO_OWNER,
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
    const work = parts[1] === DEMO_OWNER ? DEMO_WORKS.find((w) => w.id === parts[2]) : undefined;
    return work ? json(watchPayload(work)) : json({ error: "not_found" }, 404);
  }
  if (get && path === "/api/schools") return json({ schools: schools() });
  if (get && path === "/api/discover/people") {
    const people = demoSociety().people.map((p) => ({ ...p, crewRoles: [], isOnline: hashString(`on:${p.uid}`) % 6 === 0, lastSeenAt: null }));
    return json({ people });
  }
  if (get && parts[0] === "people" && parts.length === 2) {
    const payload = profileFor(parts[1]!);
    return payload ? json(payload) : json({ error: "not_found" }, 404);
  }
  if (get && parts[0] === "portfolio" && parts.length === 2) {
    const payload = demoPortfolio(parts[1]!);
    return payload ? json(payload) : json({ error: "not_found" }, 404);
  }

  // The signed-in member's own requests, and anything that would change data: done, kept nowhere.
  if (parts[0] === "me" || !get) return json({ ok: true });
  return null;
}
