import type { Firestore } from "firebase-admin/firestore";
import { getStreamThumbnailUrl } from "@/lib/cloudflare/stream";
import {
  getDbOrNull,
  parsePromoDoc,
  parseWorkDoc,
  promoRef,
} from "@/lib/server/works";
import { collectSchoolsForSuggestions, parseSchoolDoc, schoolsCol } from "@/lib/server/schools";
import type { CatalogFeedItem } from "@/types/work";
import type { SchoolListItem, SchoolStats } from "@/types/school";

/** 학교 페이지 작품 — 학교와 공개 상태를 인덱스로 직접 조회하고 부가 문서는 한 번에 읽는다. */
export async function fetchSchoolWorksFeed(
  db: Firestore,
  schoolId: string,
  limit = 24
): Promise<CatalogFeedItem[]> {
  const cappedLimit = Math.min(60, Math.max(1, limit));

  const snap = await db
    .collectionGroup("works")
    .where("approvedSchoolId", "==", schoolId)
    .limit(Math.min(180, cappedLimit * 3))
    .get();

  const candidates = snap.docs.flatMap((doc) => {
    const ownerUid = doc.ref.parent.parent?.id;
    if (!ownerUid) return [];
    const work = parseWorkDoc(doc.id, doc.data() as Record<string, unknown>);
    if (work.platformStatus !== "published" || work.streamStatus !== "ready" || !work.streamUid) return [];
    return [{ doc, ownerUid, work }];
  }).slice(0, cappedLimit);

  if (candidates.length === 0) return [];
  const promoSnaps = await db.getAll(
    ...candidates.map((item) => promoRef(db, item.ownerUid, item.doc.id))
  );

  return candidates.map((item, index) => {
    const promoSnap = promoSnaps[index];
    const promo = promoSnap?.exists
      ? parsePromoDoc(promoSnap.data() as Record<string, unknown>)
      : null;
    const thumbnailUrl =
      promo?.thumbnailUrl ??
      item.work.promoDraft?.thumbnailUrl ??
      getStreamThumbnailUrl(item.work.streamUid!) ??
      undefined;
    const thumbnailCrop = promo?.thumbnailCrop ?? item.work.promoDraft?.thumbnailCrop;

    return {
      id: `${item.ownerUid}_${item.doc.id}`,
      workId: item.doc.id,
      ownerUid: item.ownerUid,
      title: item.work.title,
      director: item.work.director,
      section: item.work.section,
      approvedCategory: item.work.approvedCategory,
      approvedTags: item.work.approvedTags ?? [],
      approvedSchoolId: item.work.approvedSchoolId,
      approvedSchoolName: item.work.approvedSchoolName,
      thumbnailUrl,
      ...(thumbnailCrop ? { thumbnailCrop } : {}),
      viewCount: item.work.viewCount ?? 0,
      likeCount: item.work.likeCount ?? 0,
      publishedAt: item.work.publishedAt,
    } satisfies CatalogFeedItem;
  });
}

export function computeSchoolStats(items: CatalogFeedItem[]): SchoolStats {
  return {
    workCount: items.length,
    movieCount: items.filter((i) => i.section === "movies").length,
    seriesCount: items.filter((i) => i.section === "series").length,
    entertainmentCount: items.filter((i) => i.section === "entertainment").length,
  };
}

function timestampMillis(value: unknown): number {
  const maybe = value as { toMillis?: () => number };
  return typeof maybe?.toMillis === "function" ? maybe.toMillis() : 0;
}

export function sortByPublishedAtDesc(items: CatalogFeedItem[]): CatalogFeedItem[] {
  return [...items].sort((a, b) => timestampMillis(b.publishedAt) - timestampMillis(a.publishedAt));
}

export function sortByViewCountDesc(items: CatalogFeedItem[]): CatalogFeedItem[] {
  return [...items].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
}

export async function fetchSchool(db: Firestore, schoolId: string): Promise<SchoolListItem | null> {
  const snap = await schoolsCol(db).doc(schoolId).get();
  if (!snap.exists) return null;
  return parseSchoolDoc(snap.id, snap.data() as Record<string, unknown>);
}

/** /schools 랭킹 — 발행 작품 수 기준 (denormalized workCount 카운터 사용) */
export async function fetchSchoolsRanking(db: Firestore, limit = 50): Promise<SchoolListItem[]> {
  const all = await collectSchoolsForSuggestions(db);
  return all
    .filter((s) => s.status !== "merged")
    .sort((a, b) => (b.workCount ?? 0) - (a.workCount ?? 0))
    .slice(0, limit);
}

/** Firestore Timestamp(클래스 인스턴스)는 Server→Client Component 경계를 못 건넘 — 화면에 안 쓰는 필드라 제거 */
export function toClientSafeSchool(school: SchoolListItem): SchoolListItem {
  const { createdAt, updatedAt, ...rest } = school;
  return rest;
}

export function toClientSafeCatalogItem(item: CatalogFeedItem): CatalogFeedItem {
  const { publishedAt, ...rest } = item;
  return rest;
}

export async function getServerSchoolFeed(schoolId: string) {
  const db = await getDbOrNull();
  if (!db) return { school: null, items: [] as CatalogFeedItem[], stats: computeSchoolStats([]) };

  const [school, items] = await Promise.all([
    fetchSchool(db, schoolId),
    fetchSchoolWorksFeed(db, schoolId),
  ]);

  return { school, items, stats: computeSchoolStats(items) };
}
