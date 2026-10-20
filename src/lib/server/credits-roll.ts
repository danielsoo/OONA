import type { Firestore } from "firebase-admin/firestore";
import {
  appendPlaybackBandwidthHint,
  getPlaybackUrl,
  getStreamThumbnailUrl,
  STREAM_TEASER_BANDWIDTH_HINT_MBPS,
} from "@/lib/cloudflare/stream";
import { resolveWorkCreditDisplayName } from "@/lib/credit-display-name";
import { peopleProfileHref } from "@/lib/dm/peopleProfileHref";
import { listWorkCredits } from "@/lib/server/credits";
import { fetchCatalogWorksFeed, getOrLoadFeed } from "@/lib/server/home-feeds";
import { parsePromoDoc, parseWorkDoc, promoRef, worksCol } from "@/lib/server/works";
import { parseUserProfileDoc } from "@/lib/userAccess";
import { WORK_SECTIONS } from "@/types/work";
import type { CreditsRollPerson, CreditsRollWork } from "@/types/creditsRoll";

/** Works per roll. Newest first; the client deals their credits out in turns. */
export const CREDITS_ROLL_WORK_LIMIT = 24;

async function loadCreditsRoll(db: Firestore): Promise<CreditsRollWork[]> {
  // The section catalogs are already indexed and cached; merge them, newest first.
  const perSection = await Promise.all(
    WORK_SECTIONS.map((section) => fetchCatalogWorksFeed(db, section, CREDITS_ROLL_WORK_LIMIT))
  );
  const publishedMs = (value: unknown) => (typeof value === "string" ? Date.parse(value) || 0 : 0);
  const picked = perSection
    .flat()
    .sort((a, b) => publishedMs(b.publishedAt) - publishedMs(a.publishedAt) || a.title.localeCompare(b.title))
    .slice(0, CREDITS_ROLL_WORK_LIMIT);
  if (picked.length === 0) return [];

  const [workSnaps, promoSnaps, creditLists] = await Promise.all([
    db.getAll(...picked.map((item) => worksCol(db, item.ownerUid).doc(item.workId))),
    db.getAll(...picked.map((item) => promoRef(db, item.ownerUid, item.workId))),
    Promise.all(picked.map((item) => listWorkCredits(db, item.ownerUid, item.workId))),
  ]);

  // Only confirmed credits are shown, same as the watch page.
  const accepted = creditLists.map((list) => list.filter((c) => c.status === "accepted"));
  const userIds = [...new Set(accepted.flat().map((c) => c.userId))];
  const userSnaps = userIds.length > 0 ? await db.getAll(...userIds.map((uid) => db.collection("users").doc(uid))) : [];
  const profiles = new Map(
    userSnaps
      .filter((snap) => snap.exists)
      .map((snap) => [snap.id, parseUserProfileDoc(snap.data() as Record<string, unknown>)])
  );

  return picked.flatMap((item, index): CreditsRollWork[] => {
    const workSnap = workSnaps[index];
    if (!workSnap?.exists) return [];
    const work = parseWorkDoc(item.workId, workSnap.data() as Record<string, unknown>);
    if (work.platformStatus !== "published" || work.streamStatus !== "ready" || !work.streamUid) return [];

    const credits = accepted[index].flatMap((c): CreditsRollPerson[] => {
      const profile = profiles.get(c.userId);
      if (!profile) return [];
      const displayName = resolveWorkCreditDisplayName(
        { displayName: profile.displayName, defaultDirectorName: profile.defaultDirectorName, handle: profile.handle },
        c.role
      );
      if (!displayName) return [];
      return [{
        userId: c.userId,
        role: c.role,
        displayName,
        ...(c.characterName ? { characterName: c.characterName } : {}),
        profileHref: peopleProfileHref(profile.handle, c.userId),
      }];
    });
    if (credits.length === 0) return [];

    const promoSnap = promoSnaps[index];
    const promo = promoSnap?.exists ? parsePromoDoc(promoSnap.data() as Record<string, unknown>) : null;
    const previewUrl =
      promo?.platformStatus === "published" && promo.streamStatus === "ready" && promo.streamUid
        ? appendPlaybackBandwidthHint(getPlaybackUrl(promo.streamUid), STREAM_TEASER_BANDWIDTH_HINT_MBPS)
        : null;

    return [{
      workId: item.workId,
      ownerUid: item.ownerUid,
      title: work.title,
      section: work.section,
      ...(work.approvedCategory ? { category: work.approvedCategory } : {}),
      ...(work.approvedSchoolName ? { schoolName: work.approvedSchoolName } : {}),
      ...(typeof item.publishedAt === "string" ? { publishedAt: item.publishedAt } : {}),
      // Side screens render up to ~700px wide on 2x screens.
      stillUrl: getStreamThumbnailUrl(work.streamUid, { width: 1280, height: 720, fit: "crop" }),
      previewUrl,
      playbackUrl: getPlaybackUrl(work.streamUid),
      credits,
    }];
  });
}

export function fetchCreditsRoll(db: Firestore): Promise<CreditsRollWork[]> {
  return getOrLoadFeed("credits-roll", () => loadCreditsRoll(db));
}
