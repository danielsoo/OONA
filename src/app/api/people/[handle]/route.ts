import { NextResponse } from "next/server";
import { isFollowing } from "@/lib/server/follows";
import { verifyBearerIdToken } from "@/lib/server/firebase-admin";
import { getUidByHandle } from "@/lib/server/handles";
import { listEligibleWorksForUser } from "@/lib/server/portfolio";
import {
  getDbOrNull,
  parseWorkDoc,
  resolveWorkListThumbnailUrl,
  worksCol,
} from "@/lib/server/works";
import { getPeopleProfileHeroMeta } from "@/lib/server/people-profile";
import {
  listWorkProfileNotes,
  workProfileNoteDocId,
} from "@/lib/server/work-profile-notes";
import { isAccountDeleted, parseUserProfileDoc } from "@/lib/userAccess";
import { resolveWorkCreditDisplayName } from "@/lib/credit-display-name";
import { peopleProfileHref } from "@/lib/dm/peopleProfileHref";
import { listWorkCredits } from "@/lib/server/credits";
import type { WorkCreditRole } from "@/types/credits";

/** Works whose collaborators come with a profile (the constellation shows fewer). */
const COLLABORATOR_WORKS = 12;

type Params = { params: Promise<{ handle: string }> };

export async function GET(request: Request, { params }: Params) {
  const { handle } = await params;
  const db = await getDbOrNull();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const uid = await getUidByHandle(db, handle);
  if (!uid) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const session = await verifyBearerIdToken(request.headers.get("authorization"));
  const viewerUid = session?.uid ?? null;
  const isSelf = viewerUid === uid;

  const profile = parseUserProfileDoc(userSnap.data() as Record<string, unknown>);
  if (isAccountDeleted(profile)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (profile.isDiscoverable === false && !isSelf) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  let following = false;
  if (viewerUid && !isSelf) {
    following = await isFollowing(db, viewerUid, uid);
  }

  const [eligible, noteByKey] = await Promise.all([
    listEligibleWorksForUser(db, uid),
    listWorkProfileNotes(db, uid),
  ]);
  const directed: Record<string, unknown>[] = [];
  const credited: Record<string, unknown>[] = [];
  const seenDirected = new Set<string>();

  for (const item of eligible) {
    const workSnap = await worksCol(db, item.ownerUid).doc(item.workId).get();
    if (!workSnap.exists) continue;
    const work = parseWorkDoc(item.workId, workSnap.data() as Record<string, unknown>);
    const thumb = await resolveWorkListThumbnailUrl(db, item.ownerUid, item.workId, work);
    const key = `${item.ownerUid}:${item.workId}`;
    const entry = {
      workId: item.workId,
      ownerUid: item.ownerUid,
      title: work.title,
      section: work.section,
      director: work.director,
      role: item.role === "owner" ? "director" : item.role,
      characterName: item.characterName,
      thumbnailUrl: thumb,
      watchPath: `/watch/${item.ownerUid}/${item.workId}`,
      profileNote: noteByKey[workProfileNoteDocId(item.ownerUid, item.workId)] ?? null,
    };
    if (item.role === "owner") {
      if (!seenDirected.has(key)) {
        seenDirected.add(key);
        directed.push(entry);
      }
    } else {
      if (!seenDirected.has(key)) credited.push(entry);
    }
  }

  // Who they made each work with, for the profile's constellation: the work's
  // other confirmed credits (as its watch page shows them) and its owner.
  const shown = [...directed, ...credited].slice(0, COLLABORATOR_WORKS) as { ownerUid: string; workId: string; collaborators?: unknown[] }[];
  const creditLists = await Promise.all(shown.map((w) => listWorkCredits(db, w.ownerUid, w.workId).catch(() => [])));
  const others = shown.map((w, i) => {
    const people: { userId: string; role: WorkCreditRole; characterName?: string }[] = [];
    for (const c of creditLists[i] ?? []) {
      if (c.status !== "accepted" || c.userId === uid || people.some((p) => p.userId === c.userId)) continue;
      people.push({ userId: c.userId, role: c.role, ...(c.characterName ? { characterName: c.characterName } : {}) });
    }
    if (w.ownerUid !== uid && !people.some((p) => p.userId === w.ownerUid)) people.unshift({ userId: w.ownerUid, role: "director" });
    return people;
  });
  const otherIds = [...new Set(others.flat().map((p) => p.userId))];
  const otherSnaps = otherIds.length > 0 ? await db.getAll(...otherIds.map((id) => db.collection("users").doc(id))) : [];
  const otherProfiles = new Map(
    otherSnaps.filter((snap) => snap.exists).map((snap) => [snap.id, parseUserProfileDoc(snap.data() as Record<string, unknown>)])
  );
  shown.forEach((w, i) => {
    w.collaborators = others[i]!.flatMap((p) => {
      const other = otherProfiles.get(p.userId);
      if (!other || isAccountDeleted(other)) return [];
      const displayName = resolveWorkCreditDisplayName(
        { displayName: other.displayName, defaultDirectorName: other.defaultDirectorName, handle: other.handle },
        p.role
      );
      if (!displayName) return [];
      return [{
        uid: p.userId,
        displayName,
        role: p.role,
        ...(p.characterName ? { characterName: p.characterName } : {}),
        avatarUrl: other.avatarUrl ?? null,
        profileHref: peopleProfileHref(other.handle, p.userId),
      }];
    });
  });

  const heroMeta = await getPeopleProfileHeroMeta(db, uid, profile);

  return NextResponse.json({
    profile: {
      uid,
      handle: profile.handle ?? handle,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl ?? null,
      headline: profile.headline,
      bio: profile.bio,
      roleTags: profile.roleTags ?? [],
      crewRoles: profile.crewRoles ?? [],
      openToCollaborate: profile.openToCollaborate === true,
      collaborationNote: profile.collaborationNote,
      defaultDirectorName: profile.defaultDirectorName,
      followerCount: profile.followerCount ?? 0,
      followingCount: profile.followingCount ?? 0,
      profileLink: profile.profileLink ?? null,
      schoolName: heroMeta.schoolName,
      societyBannerBackgroundId: heroMeta.societyBannerBackgroundId,
    },
    stats: heroMeta.stats,
    isOnline: heroMeta.isOnline,
    lastSeenAt: heroMeta.lastSeenAt,
    viewer: viewerUid
      ? { uid: viewerUid, isSelf, isFollowing: following }
      : null,
  ...(isSelf
    ? {
        identity: {
          isDiscoverable: profile.isDiscoverable !== false,
          displayNameChangeRequest: profile.displayNameChangeRequest ?? null,
          handleChangeRequest: profile.handleChangeRequest ?? null,
        },
      }
    : {}),
    directed,
    credited,
  });
}
