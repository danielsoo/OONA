import type { Firestore } from "firebase-admin/firestore";
import {
  appendPlaybackBandwidthHint,
  getPlaybackUrl,
  getStreamThumbnailUrl,
  STREAM_TEASER_BANDWIDTH_HINT_MBPS,
} from "@/lib/cloudflare/stream";
import { promoLikeRef } from "@/lib/server/engagement";
import {
  getDbOrNull,
  parsePromoDoc,
  parseWorkDoc,
  promoRef,
} from "@/lib/server/works";
import type { CatalogFeedItem, PromoFeedItem, WorkSection } from "@/types/work";
import { isWorkSection } from "@/lib/works/constants";

export const FEED_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=30, s-maxage=120, stale-while-revalidate=600",
} as const;

export const PERSONALIZED_FEED_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
  Vary: "Authorization",
} as const;

const DEFAULT_PROMO_ASPECT_RATIO = 16 / 9;
const SERVER_FEED_TTL_MS = 60_000;

type FeedCacheEntry<T> = { data: T; expiresAt: number };

const resultCache = new Map<string, FeedCacheEntry<unknown>>();
const inFlightLoads = new Map<string, Promise<unknown>>();

function timestampMillis(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (!value || typeof value !== "object") return 0;

  const candidate = value as {
    toMillis?: () => number;
    seconds?: number;
    _seconds?: number;
  };
  if (typeof candidate.toMillis === "function") return candidate.toMillis();
  const seconds = candidate.seconds ?? candidate._seconds;
  return typeof seconds === "number" ? seconds * 1_000 : 0;
}

function timestampIso(value: unknown): string | undefined {
  const millis = timestampMillis(value);
  return millis > 0 ? new Date(millis).toISOString() : undefined;
}

async function getOrLoadFeed<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const cached = resultCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data as T;
  if (cached) resultCache.delete(key);

  const active = inFlightLoads.get(key);
  if (active) return active as Promise<T>;

  const promise = loader()
    .then((data) => {
      resultCache.set(key, { data, expiresAt: Date.now() + SERVER_FEED_TTL_MS });
      return data;
    })
    .finally(() => {
      inFlightLoads.delete(key);
    });
  inFlightLoads.set(key, promise);
  return promise;
}

async function loadPromoShortsFeed(db: Firestore): Promise<PromoFeedItem[]> {
  const promoSnap = await db
    .collectionGroup("promoShort")
    .where("platformStatus", "==", "published")
    .limit(36)
    .get();

  const candidates = promoSnap.docs.flatMap((promoDoc) => {
    const promo = parsePromoDoc(promoDoc.data() as Record<string, unknown>);
    if (promo.streamStatus !== "ready" || !promo.streamUid) return [];

    const workRef = promoDoc.ref.parent.parent;
    const ownerUid = workRef?.parent.parent?.id;
    if (!workRef || !ownerUid) return [];
    return [{ promo, workRef, workId: workRef.id, ownerUid }];
  });

  if (candidates.length === 0) return [];
  const workSnaps = await db.getAll(...candidates.map((item) => item.workRef));

  const items = candidates.flatMap((item, index) => {
    const workSnap = workSnaps[index];
    if (!workSnap?.exists) return [];
    const work = parseWorkDoc(item.workId, workSnap.data() as Record<string, unknown>);
    const rawPlayback = getPlaybackUrl(item.promo.streamUid!, {
      clientBandwidthHintMbps: STREAM_TEASER_BANDWIDTH_HINT_MBPS,
    });
    const videoUrl = rawPlayback
      ? appendPlaybackBandwidthHint(rawPlayback, STREAM_TEASER_BANDWIDTH_HINT_MBPS)
      : null;
    if (!videoUrl) return [];

    // Story cards render at most ~180px wide; 360x640 covers 2x screens.
    const thumbnailUrl = getStreamThumbnailUrl(item.promo.streamUid!, {
      width: 360,
      height: 640,
      fit: "crop",
    });

    return [{
      id: `${item.ownerUid}_${item.workId}`,
      workId: item.workId,
      ownerUid: item.ownerUid,
      title: item.promo.title ?? work.title,
      director: work.director ?? "—",
      description: item.promo.description ?? work.description ?? "",
      videoUrl,
      streamUid: item.promo.streamUid!,
      thumbnailUrl,
      aspectRatio: DEFAULT_PROMO_ASPECT_RATIO,
      frameCrop: item.promo.frameCrop,
      likeCount: item.promo.likeCount ?? 0,
      viewCount: item.promo.viewCount ?? 0,
      likedByMe: false,
    } satisfies PromoFeedItem];
  });

  items.sort((a, b) => a.title.localeCompare(b.title));
  return items;
}

export async function fetchPromoShortsFeed(
  db: Firestore,
  viewerUid: string | null = null
): Promise<PromoFeedItem[]> {
  const items = await getOrLoadFeed("promo:public", () => loadPromoShortsFeed(db));
  if (!viewerUid || items.length === 0) return items;

  const likeSnaps = await db.getAll(
    ...items.map((item) => promoLikeRef(db, viewerUid, item.ownerUid, item.workId))
  );
  return items.map((item, index) => ({ ...item, likedByMe: Boolean(likeSnaps[index]?.exists) }));
}

async function loadCatalogWorksFeed(
  db: Firestore,
  section: WorkSection,
  cappedLimit: number
): Promise<CatalogFeedItem[]> {
  const snap = await db
    .collectionGroup("works")
    .where("platformStatus", "==", "published")
    .where("section", "==", section)
    .limit(Math.min(72, cappedLimit * 3))
    .get();

  const candidates = snap.docs.flatMap((doc) => {
    const ownerUid = doc.ref.parent.parent?.id;
    if (!ownerUid) return [];
    const work = parseWorkDoc(doc.id, doc.data() as Record<string, unknown>);
    if (work.streamStatus !== "ready" || !work.streamUid) return [];
    return [{ doc, ownerUid, work }];
  });

  candidates.sort(
    (a, b) =>
      timestampMillis(b.work.publishedAt) - timestampMillis(a.work.publishedAt) ||
      a.work.title.localeCompare(b.work.title)
  );
  const selectedCandidates = candidates.slice(0, cappedLimit);

  if (selectedCandidates.length === 0) return [];
  const promoSnaps = await db.getAll(
    ...selectedCandidates.map((item) => promoRef(db, item.ownerUid, item.doc.id))
  );

  const items = selectedCandidates.map((item, index) => {
    const promoSnap = promoSnaps[index];
    const promo = promoSnap?.exists
      ? parsePromoDoc(promoSnap.data() as Record<string, unknown>)
      : null;
    const thumbnailUrl = getStreamThumbnailUrl(
      promo?.streamUid ?? item.work.streamUid!,
      {
        // Catalog cards render at most ~300px wide; 640x360 covers 2x screens.
        width: 640,
        height: 360,
        fit: "crop",
      }
    );
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
      thumbnailUrl,
      ...(thumbnailCrop ? { thumbnailCrop } : {}),
      viewCount: item.work.viewCount ?? 0,
      likeCount: item.work.likeCount ?? 0,
      publishedAt: timestampIso(item.work.publishedAt),
    } satisfies CatalogFeedItem;
  });

  items.sort(
    (a, b) =>
      timestampMillis(b.publishedAt) - timestampMillis(a.publishedAt) ||
      a.title.localeCompare(b.title)
  );
  return items;
}

export async function fetchCatalogWorksFeed(
  db: Firestore,
  section: WorkSection,
  limit = 8
): Promise<CatalogFeedItem[]> {
  const cappedLimit = Math.min(24, Math.max(1, limit));
  return getOrLoadFeed(`catalog:${section}:${cappedLimit}`, () =>
    loadCatalogWorksFeed(db, section, cappedLimit)
  );
}

export type ServerHomeFeeds = {
  promoItems: PromoFeedItem[];
  movies: CatalogFeedItem[];
  series: CatalogFeedItem[];
};

export async function getServerHomeFeeds(): Promise<ServerHomeFeeds> {
  const db = await getDbOrNull();
  if (!db) {
    return { promoItems: [], movies: [], series: [] };
  }

  try {
    const [promoItems, movies, series] = await Promise.all([
      fetchPromoShortsFeed(db),
      fetchCatalogWorksFeed(db, "movies", 8),
      fetchCatalogWorksFeed(db, "series", 4),
    ]);

    return { promoItems, movies, series };
  } catch (error) {
    // The catalog is live data, but a temporary Firestore/network failure must
    // not make the cinematic shell or a production build unavailable.
    console.warn("Home feeds are temporarily unavailable.", error);
    return { promoItems: [], movies: [], series: [] };
  }
}

export function parseCatalogSection(
  sectionParam: string | null
): WorkSection | null {
  if (!sectionParam || !isWorkSection(sectionParam)) return null;
  return sectionParam;
}
