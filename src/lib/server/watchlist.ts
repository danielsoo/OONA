import { FieldValue, type Firestore, type Timestamp } from "firebase-admin/firestore";
import { getStreamThumbnailUrl } from "@/lib/cloudflare/stream";
import {
  parsePromoDoc,
  parseWorkDoc,
  promoRef,
  worksCol,
} from "@/lib/server/works";
import type { CatalogFeedItem } from "@/types/work";

const MAX_ITEMS = 50;

function privateCol(db: Firestore, uid: string) {
  return db.collection("users").doc(uid).collection("private");
}

function saveRef(db: Firestore, uid: string, ownerUid: string, workId: string) {
  const safe = `${ownerUid}_${workId}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
  return privateCol(db, uid).doc(`save_${safe}`);
}

function timestampMs(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as Timestamp).toMillis();
  }
  if (value instanceof Date) return value.getTime();
  return 0;
}

export async function assertPublishedWork(db: Firestore, ownerUid: string, workId: string) {
  const workSnap = await worksCol(db, ownerUid).doc(workId).get();
  if (!workSnap.exists) return { ok: false as const, error: "not_found" };
  const work = parseWorkDoc(workId, workSnap.data() as Record<string, unknown>);
  if (work.platformStatus !== "published") return { ok: false as const, error: "not_published" };
  if (work.streamStatus !== "ready" || !work.streamUid) {
    return { ok: false as const, error: "not_published" };
  }
  return { ok: true as const, work };
}

export async function isInWatchlist(
  db: Firestore,
  uid: string,
  ownerUid: string,
  workId: string
): Promise<boolean> {
  const snap = await saveRef(db, uid, ownerUid, workId).get();
  return snap.exists;
}

export async function setWatchlistItem(
  db: Firestore,
  uid: string,
  ownerUid: string,
  workId: string,
  saved: boolean
): Promise<{ ok: true; saved: boolean } | { ok: false; error: string }> {
  const published = await assertPublishedWork(db, ownerUid, workId);
  if (!published.ok) return { ok: false, error: published.error };

  const ref = saveRef(db, uid, ownerUid, workId);
  const snap = await ref.get();
  const currentlySaved = snap.exists;

  if (saved && currentlySaved) return { ok: true, saved: true };
  if (!saved && !currentlySaved) return { ok: true, saved: false };

  if (saved) {
    await ref.set({
      ownerUid,
      workId,
      savedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, saved: true };
  }

  await ref.delete();
  return { ok: true, saved: false };
}

export async function toCatalogFeedItem(
  db: Firestore,
  ownerUid: string,
  workId: string
): Promise<CatalogFeedItem | null> {
  return (await toCatalogFeedItems(db, [{ ownerUid, workId }]))[0] ?? null;
}

export async function toCatalogFeedItems(
  db: Firestore,
  rows: { ownerUid: string; workId: string }[]
): Promise<CatalogFeedItem[]> {
  if (rows.length === 0) return [];
  const workRefs = rows.map((row) => worksCol(db, row.ownerUid).doc(row.workId));
  const workSnaps = await db.getAll(...workRefs);

  const published = rows.flatMap((row, index) => {
    const snap = workSnaps[index];
    if (!snap?.exists) return [];
    const work = parseWorkDoc(row.workId, snap.data() as Record<string, unknown>);
    if (work.platformStatus !== "published" || work.streamStatus !== "ready" || !work.streamUid) {
      return [];
    }
    return [{ ...row, work }];
  });
  if (published.length === 0) return [];

  const promoSnaps = await db.getAll(
    ...published.map((row) => promoRef(db, row.ownerUid, row.workId))
  );

  return published.map((row, index) => {
    const promoSnap = promoSnaps[index];
    const promo = promoSnap?.exists
      ? parsePromoDoc(promoSnap.data() as Record<string, unknown>)
      : null;
    const thumbnailUrl =
      promo?.thumbnailUrl ??
      row.work.promoDraft?.thumbnailUrl ??
      getStreamThumbnailUrl(row.work.streamUid!) ??
      undefined;
    const thumbnailCrop = promo?.thumbnailCrop ?? row.work.promoDraft?.thumbnailCrop;

    return {
      id: `${row.ownerUid}_${row.workId}`,
      workId: row.workId,
      ownerUid: row.ownerUid,
      title: row.work.title,
      director: row.work.director,
      section: row.work.section,
      approvedCategory: row.work.approvedCategory,
      approvedTags: row.work.approvedTags ?? [],
      approvedSchoolId: row.work.approvedSchoolId,
      approvedSchoolName: row.work.approvedSchoolName,
      thumbnailUrl,
      ...(thumbnailCrop ? { thumbnailCrop } : {}),
      viewCount: row.work.viewCount ?? 0,
      likeCount: row.work.likeCount ?? 0,
    } satisfies CatalogFeedItem;
  });
}

export async function listWatchlistItems(db: Firestore, uid: string): Promise<CatalogFeedItem[]> {
  const snap = await privateCol(db, uid).get();
  const rows: { ownerUid: string; workId: string; sortMs: number }[] = [];

  for (const doc of snap.docs) {
    if (!doc.id.startsWith("save_")) continue;
    const data = doc.data();
    const ownerUid = String(data.ownerUid ?? "");
    const workId = String(data.workId ?? "");
    if (!ownerUid || !workId) continue;
    rows.push({ ownerUid, workId, sortMs: timestampMs(data.savedAt) });
  }

  rows.sort((a, b) => b.sortMs - a.sortMs);
  const slice = rows.slice(0, MAX_ITEMS);

  return toCatalogFeedItems(db, slice);
}
