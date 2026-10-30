import { FieldValue, type Firestore, type Timestamp } from "firebase-admin/firestore";
import type { AccountActivityItem } from "@/types/account-activity";
import type { EngagementTarget } from "@/types/engagement";
import { parsePromoDoc, parseWorkDoc, promoRef, worksCol } from "@/lib/server/works";

const MAX_ITEMS = 50;

function privateCol(db: Firestore, uid: string) {
  return db.collection("users").doc(uid).collection("private");
}

export function historyRef(
  db: Firestore,
  viewerUid: string,
  target: EngagementTarget,
  ownerUid: string,
  workId: string
) {
  const safe = `${target}_${ownerUid}_${workId}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
  return privateCol(db, viewerUid).doc(`history_${safe}`);
}

export function isLoggedInViewerKey(viewerKey: string): boolean {
  return !viewerKey.startsWith("anon_");
}

export async function upsertWatchHistory(
  db: Firestore,
  viewerUid: string,
  ownerUid: string,
  workId: string,
  target: EngagementTarget
): Promise<void> {
  await historyRef(db, viewerUid, target, ownerUid, workId).set(
    {
      ownerUid,
      workId,
      target,
      lastViewedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

function timestampMs(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as Timestamp).toMillis();
  }
  if (value instanceof Date) return value.getTime();
  return 0;
}

async function resolvePublishedActivity(
  db: Firestore,
  ownerUid: string,
  workId: string,
  target?: EngagementTarget,
  at?: unknown
): Promise<AccountActivityItem | null> {
  const workSnap = await worksCol(db, ownerUid).doc(workId).get();
  if (!workSnap.exists) return null;
  const work = parseWorkDoc(workId, workSnap.data() as Record<string, unknown>);
  if (work.platformStatus !== "published") return null;

  let title = work.title;

  // The promo carries the work's picture, so it is read for the full film too.
  const pSnap = await promoRef(db, ownerUid, workId).get();
  const promo = pSnap.exists ? parsePromoDoc(pSnap.data() as Record<string, unknown>) : null;
  const promoPublished = promo?.platformStatus === "published";
  if (target === "promo") {
    if (!promoPublished) return null;
    title = promo.title?.trim() || title;
  }

  return {
    ownerUid,
    workId,
    title,
    section: work.section,
    director: work.director,
    target,
    at,
    thumbnailUrl: promoPublished ? promo.thumbnailUrl ?? null : null,
  };
}

export async function listLikedPromos(db: Firestore, uid: string): Promise<AccountActivityItem[]> {
  const snap = await privateCol(db, uid).get();
  const rows: { ownerUid: string; workId: string; at: unknown; sortMs: number }[] = [];

  for (const doc of snap.docs) {
    if (!doc.id.startsWith("like_promo_")) continue;
    const data = doc.data();
    const ownerUid = String(data.ownerUid ?? "");
    const workId = String(data.workId ?? "");
    if (!ownerUid || !workId) continue;
    const at = data.createdAt;
    rows.push({ ownerUid, workId, at, sortMs: timestampMs(at) });
  }

  rows.sort((a, b) => b.sortMs - a.sortMs);
  const slice = rows.slice(0, MAX_ITEMS);

  const items: AccountActivityItem[] = [];
  for (const row of slice) {
    const item = await resolvePublishedActivity(db, row.ownerUid, row.workId, "promo", row.at);
    if (item) items.push(item);
  }
  return items;
}

export async function listWatchHistory(db: Firestore, uid: string): Promise<AccountActivityItem[]> {
  const snap = await privateCol(db, uid).get();
  const rows: {
    ownerUid: string;
    workId: string;
    target: EngagementTarget;
    at: unknown;
    sortMs: number;
  }[] = [];

  for (const doc of snap.docs) {
    if (!doc.id.startsWith("history_")) continue;
    const data = doc.data();
    const ownerUid = String(data.ownerUid ?? "");
    const workId = String(data.workId ?? "");
    const target = data.target === "full" ? "full" : "promo";
    if (!ownerUid || !workId) continue;
    const at = data.lastViewedAt;
    rows.push({ ownerUid, workId, target, at, sortMs: timestampMs(at) });
  }

  rows.sort((a, b) => b.sortMs - a.sortMs);
  const slice = rows.slice(0, MAX_ITEMS);

  const items: AccountActivityItem[] = [];
  for (const row of slice) {
    const item = await resolvePublishedActivity(db, row.ownerUid, row.workId, row.target, row.at);
    if (item) items.push(item);
  }
  return items;
}
