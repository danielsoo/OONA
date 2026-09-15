"use client";

import { useEffect, useState } from "react";
import { catalogFeedCacheKey, loadCatalogFeed } from "@/lib/clientFeedLoaders";
import { getCached, setCache } from "@/lib/feedCache";
import type { CatalogFeedItem, WorkSection } from "@/types/work";

export function useCatalogFeed(
  section: WorkSection,
  limit = 8,
  initialItems?: CatalogFeedItem[]
) {
  const cacheKey = catalogFeedCacheKey(section, limit);
  // Browser cache must not influence the first render or the server/client
  // trees can disagree during hydration.
  const [items, setItems] = useState<CatalogFeedItem[]>(initialItems ?? []);
  const [loading, setLoading] = useState(initialItems === undefined);

  useEffect(() => {
    if (initialItems !== undefined) {
      setCache(cacheKey, initialItems);
      setItems(initialItems);
      setLoading(false);
      return;
    }

    const cached = getCached<CatalogFeedItem[]>(cacheKey);
    if (cached !== undefined) {
      setItems(cached.slice(0, limit));
      setLoading(false);
    } else {
      setLoading(true);
    }

    let cancelled = false;
    (async () => {
      try {
        const fetched = await loadCatalogFeed(section, limit);
        if (!cancelled) setItems(fetched.slice(0, limit));
      } catch {
        if (!cancelled && getCached<CatalogFeedItem[]>(cacheKey) === undefined) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [section, limit, cacheKey, initialItems]);

  return { items: items.slice(0, limit), loading };
}
