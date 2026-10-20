import type { PeopleProfilePayload } from "@/components/profile/PeopleProfileView";
import { DEMO_HANDLE_PREFIX, DEMO_OWNER, watchHref } from "@/lib/demo-flags";
import { hashString } from "@/lib/society-sky";
import type { SocietyPerson } from "@/lib/societyTypes";
import type { CreditsRollWork } from "@/types/creditsRoll";
import type { PublicPortfolioPayload } from "@/types/portfolio";
import { DEMO_NOTES as NOTES, DEMO_PEOPLE as PEOPLE, DEMO_SYNOPSES as SYNOPSES, DEMO_WORKS as WORKS } from "@/lib/demo-world";

/**
 * Made-up people and works for Society's demo (/society?demo=1), from the
 * made-up world in demo-world.ts: a hundred people over forty works, so the
 * sky has crews of every size, the grid has more than one page, each filter
 * has something in it, and most people are in two or three works for the
 * neurons' twigs to follow. A few have no role
 * and no work at all, which is what the grid's star is for.
 *
 * Names and schools are invented; nothing here is saved anywhere. This file
 * is only fetched on a demo visit (useSocietyDirectory imports it then), so
 * its size costs an ordinary visitor nothing.
 */

const uidOf = (id: string) => `${DEMO_HANDLE_PREFIX}${id}`;
const byId = new Map(PEOPLE.map((p) => [p.id, p]));

export function demoSociety(): { people: SocietyPerson[]; works: CreditsRollWork[] } {
  const people: SocietyPerson[] = PEOPLE.map((p) => ({
    uid: uidOf(p.id),
    handle: uidOf(p.id),
    displayName: p.name,
    avatarUrl: null,
    headline: p.headline,
    bio: p.bio,
    roleTags: p.tags,
    openToCollaborate: !!p.open,
    followerCount: hashString(p.id) % 140,
  }));
  const works: CreditsRollWork[] = WORKS.map((w) => ({
    workId: w.id,
    ownerUid: DEMO_OWNER,
    title: w.title,
    section: w.section,
    schoolName: w.school,
    publishedAt: `${w.date}T09:00:00.000Z`,
    stillUrl: w.still,
    previewUrl: null,
    playbackUrl: "",
    credits: w.crew.map(([id, role, character]) => ({
      userId: uidOf(id),
      role,
      displayName: byId.get(id)?.name ?? id,
      ...(character ? { characterName: character } : {}),
      profileHref: `/people/${uidOf(id)}`,
    })),
  }));
  return { people, works };
}

/** A demo person's profile, as /api/people/<handle> would answer for a real one. */
export function demoProfile(handle: string): PeopleProfilePayload | null {
  const id = decodeURIComponent(handle).slice(DEMO_HANDLE_PREFIX.length);
  const person = byId.get(id);
  if (!person) return null;
  const mine = WORKS.flatMap((w) => w.crew.filter(([cid]) => cid === id).map(([, role, character]) => ({ w, role, character })));
  const card = ({ w, role, character }: (typeof mine)[number]) => ({
    workId: w.id,
    ownerUid: DEMO_OWNER,
    title: w.title,
    role,
    ...(character ? { characterName: character } : {}),
    thumbnailUrl: w.still,
    watchPath: watchHref({ ownerUid: DEMO_OWNER, workId: w.id }),
    collaborators: w.crew
      .filter(([cid]) => cid !== id)
      .map(([cid, crole, ccharacter]) => ({
        uid: uidOf(cid),
        displayName: byId.get(cid)?.name ?? cid,
        role: crole,
        ...(ccharacter ? { characterName: ccharacter } : {}),
        avatarUrl: null,
        profileHref: `/people/${uidOf(cid)}`,
      })),
  });
  const directed = mine.filter((m) => m.role === "director").map(card);
  const credited = mine.filter((m) => m.role !== "director").map(card);
  const h = hashString(id);
  return {
    profile: {
      uid: uidOf(id),
      handle: uidOf(id),
      displayName: person.name,
      avatarUrl: null,
      headline: person.headline,
      bio: person.bio,
      openToCollaborate: !!person.open,
      followerCount: h % 140,
      followingCount: (h >> 8) % 60,
      schoolName: mine[0]?.w.school ?? null,
    },
    stats: { stories: directed.length, totalViews: (h >> 4) % 4000 },
    isOnline: h % 5 === 0,
    viewer: null,
    directed,
    credited,
  };
}

/** A made-up person's shared portfolio (/p/demo-<id>), built from their works in the demo. */
export function demoPortfolio(token: string): PublicPortfolioPayload | null {
  const profile = demoProfile(token);
  if (!profile) return null;
  const id = profile.profile.uid.slice(DEMO_HANDLE_PREFIX.length);
  return {
    profile: {
      displayName: profile.profile.displayName,
      handle: profile.profile.handle,
      avatarUrl: null,
      schoolName: profile.profile.schoolName ?? null,
      headline: profile.profile.headline,
      bio: profile.profile.bio,
      openToCollaborate: profile.profile.openToCollaborate,
      followerCount: profile.profile.followerCount,
      followingCount: profile.profile.followingCount,
    },
    shareTitle: `${profile.profile.displayName} — selected work`,
    works: [...profile.directed, ...profile.credited].map((w) => ({
      workId: w.workId,
      ownerUid: w.ownerUid,
      title: w.title,
      role: w.role,
      ...(w.characterName ? { characterName: w.characterName } : {}),
      ...(w.thumbnailUrl ? { thumbnailUrl: w.thumbnailUrl } : {}),
      ...(SYNOPSES[w.workId] ? { description: SYNOPSES[w.workId] } : {}),
      ...(NOTES[`${id}:${w.workId}`] ? { profileNote: NOTES[`${id}:${w.workId}`] } : {}),
      collaborators: w.collaborators ?? [],
    })),
  };
}
