import { getOrLoadCached } from "@/lib/feedCache";
import type { SchoolListItem } from "@/types/school";
import type { CatalogFeedItem, WorkSection } from "@/types/work";

/** The feed API caps every catalog request at 24, so fetch that once per section. */
export const CATALOG_FETCH_LIMIT = 24;

/**
 * Every caller (home 12, browse 24, search 30, prefetcher) shares one request
 * and one cache entry per section; useCatalogFeed slices to what it shows.
 */
export function normalizedCatalogLimit(_limit: number): number {
  return CATALOG_FETCH_LIMIT;
}

export function catalogFeedCacheKey(section: WorkSection, limit: number): string {
  // v4 includes publication timestamps and preserves newest-first catalog ordering.
  return `catalog:v5:${section}:${normalizedCatalogLimit(limit)}`;
}

type ThumbnailItem = { thumbnailUrl?: string };

function preloadImage(url: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

/**
 * Warm the browser cache for feed thumbnails without holding the feed back.
 * Cards render immediately with their gradient fallback and the image fades in
 * when it arrives. (Previously the list waited up to 3.5s for every image.)
 */
export async function preloadFeedThumbnails<T extends ThumbnailItem>(items: T[]): Promise<T[]> {
  if (typeof window === "undefined") return items;
  const urls = Array.from(
    new Set(items.map((item) => item.thumbnailUrl).filter((url): url is string => Boolean(url)))
  );
  // Fire and forget: only the first screenful, the rest load lazily with the cards.
  urls.slice(0, 8).forEach((url) => void preloadImage(url));
  return items;
}

export function loadCatalogFeed(section: WorkSection, limit: number) {
  const fetchLimit = normalizedCatalogLimit(limit);
  const cacheKey = catalogFeedCacheKey(section, limit);
  return getOrLoadCached(cacheKey, async () => {
    const response = await fetch(`/api/feed/works?section=${section}&limit=${fetchLimit}`);
    if (!response.ok) throw new Error("catalog_feed_failed");
    const data = (await response.json()) as { items?: CatalogFeedItem[] };
    return preloadFeedThumbnails(data.items ?? []);
  });
}

export function schoolsFeedCacheKey(limit: number): string {
  return `schools:${limit}`;
}

export function loadSchoolsFeed(limit: number) {
  const cacheKey = schoolsFeedCacheKey(limit);
  return getOrLoadCached(cacheKey, async () => {
    const response = await fetch(`/api/schools?limit=${limit}`);
    if (!response.ok) throw new Error("schools_feed_failed");
    const data = (await response.json()) as { schools?: SchoolListItem[] };
    return data.schools ?? [];
  });
}
