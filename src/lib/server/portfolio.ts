import { randomBytes } from "crypto";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { resolvePlaybackUrl } from "@/lib/cloudflare/stream";
import { getUidByHandle } from "@/lib/server/handles";
import { parseUserProfileDoc } from "@/lib/userAccess";
import { parseWorkDoc, resolveWorkListThumbnailUrl, worksCol } from "@/lib/server/works";
import { listWorkCollaborators } from "@/lib/server/work-collaborators";
import { workIncludedInShare } from "@/lib/portfolio-share";
import { listWorkProfileNotes, workProfileNoteDocId } from "@/lib/server/work-profile-notes";
import {
  PORTFOLIO_SHARE_VISIBILITY,
  type PortfolioShareDoc,
  type PortfolioShareVisibility,
  type PortfolioWorkItem,
  type PublicPortfolioPayload,
} from "@/types/portfolio";
import type { WorkCreditRole } from "@/types/credits";

export function portfolioSharesCol(db: Firestore, uid: string) {
  return db.collection("users").doc(uid).collection("portfolioShares");
}

export function generatePortfolioToken(): string {
  return randomBytes(24).toString("base64url");
}

export function parsePortfolioShare(data: Record<string, unknown>): PortfolioShareDoc | null {
  const token = String(data.token ?? "");
  if (!token) return null;
  const visibilityRaw = String(data.visibility ?? "active");
  const visibility: PortfolioShareVisibility = (
    PORTFOLIO_SHARE_VISIBILITY as readonly string[]
  ).includes(visibilityRaw)
    ? (visibilityRaw as PortfolioShareVisibility)
    : "active";
  return {
    token,
    title: String(data.title ?? "").slice(0, 200),
    includedWorkIds: Array.isArray(data.includedWorkIds)
      ? data.includedWorkIds.map((x) => String(x))
      : [],
    excludedWorkIds: Array.isArray(data.excludedWorkIds)
      ? data.excludedWorkIds.map((x) => String(x))
      : [],
    visibility,
    expiresAt: data.expiresAt,
    viewCount: typeof data.viewCount === "number" ? data.viewCount : 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function findPortfolioShareByToken(
  db: Firestore,
  token: string
): Promise<{ uid: string; shareId: string; share: PortfolioShareDoc } | null> {
  const snap = await db.collectionGroup("portfolioShares").where("token", "==", token).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const share = parsePortfolioShare(doc.data() as Record<string, unknown>);
  if (!share) return null;
  const uid = doc.ref.parent.parent?.id;
  if (!uid) return null;
  return { uid, shareId: doc.id, share };
}

type EligibleWork = {
  workId: string;
  ownerUid: string;
  role: WorkCreditRole | "owner";
  characterName?: string;
};

export async function listEligibleWorksForUser(
  db: Firestore,
  uid: string
): Promise<EligibleWork[]> {
  const eligible: EligibleWork[] = [];
  const seen = new Set<string>();

  const ownedSnap = await worksCol(db, uid).get();
  for (const doc of ownedSnap.docs) {
    const work = parseWorkDoc(doc.id, doc.data() as Record<string, unknown>);
    if (work.platformStatus !== "published") continue;
    const key = `${uid}:${doc.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    eligible.push({ workId: doc.id, ownerUid: uid, role: "owner" });
  }

  const indexSnap = await db
    .collection("users")
    .doc(uid)
    .collection("creditIndex")
    .where("platformStatus", "==", "published")
    .get();

  for (const doc of indexSnap.docs) {
    const data = doc.data();
    const ownerUid = String(data.ownerUid ?? "");
    const workId = String(data.workId ?? "");
    if (!ownerUid || !workId) continue;
    const key = `${ownerUid}:${workId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const role = String(data.role ?? "other") as WorkCreditRole;
    eligible.push({
      workId,
      ownerUid,
      role,
      characterName: data.characterName ? String(data.characterName) : undefined,
    });
  }

  return eligible;
}

export async function buildPublicPortfolio(
  db: Firestore,
  uid: string,
  share: PortfolioShareDoc
): Promise<PublicPortfolioPayload | null> {
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) return null;
  const profile = parseUserProfileDoc(userSnap.data() as Record<string, unknown>);
  const handle = profile.handle ?? uid.slice(0, 8);

  const [eligible, noteByKey] = await Promise.all([
    listEligibleWorksForUser(db, uid),
    listWorkProfileNotes(db, uid),
  ]);
  const works: PortfolioWorkItem[] = [];

  for (const item of eligible) {
    const workSnap = await worksCol(db, item.ownerUid).doc(item.workId).get();
    if (!workSnap.exists) continue;
    const work = parseWorkDoc(item.workId, workSnap.data() as Record<string, unknown>);
    if (!workIncludedInShare(item.workId, work, share, item.ownerUid === uid)) continue;

    const thumbnailUrl = await resolveWorkListThumbnailUrl(db, item.ownerUid, item.workId, work);
    let playbackUrl: string | undefined;
    if (work.streamUid && work.streamStatus === "ready") {
      playbackUrl = (await resolvePlaybackUrl(work.streamUid)) ?? undefined;
    }

    works.push({
      workId: item.workId,
      ownerUid: item.ownerUid,
      title: work.title,
      description: work.description,
      section: work.section,
      director: work.director,
      role: item.role === "owner" ? "director" : item.role,
      characterName: item.characterName,
      streamUid: work.streamUid,
      playbackUrl,
      thumbnailUrl,
      ...(noteByKey[workProfileNoteDocId(item.ownerUid, item.workId)]
        ? { profileNote: noteByKey[workProfileNoteDocId(item.ownerUid, item.workId)] }
        : {}),
    });
  }

  // Who they made each one with: the credits a portfolio is proof of.
  const collaborators = await listWorkCollaborators(db, uid, works);
  works.forEach((work, i) => {
    work.collaborators = collaborators[i];
  });

  return {
    profile: {
      displayName: profile.displayName,
      handle,
      avatarUrl: profile.avatarUrl ?? null,
      schoolName: profile.schoolName?.trim() || null,
      headline: profile.headline,
      bio: profile.bio,
      openToCollaborate: profile.openToCollaborate === true,
      collaborationNote: profile.collaborationNote,
      followerCount: profile.followerCount ?? 0,
      followingCount: profile.followingCount ?? 0,
      defaultDirectorName: profile.defaultDirectorName,
    },
    shareTitle: share.title,
    works,
  };
}
