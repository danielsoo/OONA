"use client";

import { useEffect, useState } from "react";
import { loadSchoolsFeed, schoolsFeedCacheKey } from "@/lib/clientFeedLoaders";
import { getCached } from "@/lib/feedCache";
import type { SchoolListItem } from "@/types/school";

export function useSchoolsFeed(limit = 50, initialItems?: SchoolListItem[]) {
  const cacheKey = schoolsFeedCacheKey(limit);
  // Browser cache is applied after hydration so SSR and the first client tree
  // cannot disagree when a previous page visit has already warmed the feed.
  const [items, setItems] = useState<SchoolListItem[]>(initialItems ?? []);
  const [loading, setLoading] = useState(initialItems === undefined);

  useEffect(() => {
    if (initialItems !== undefined) {
      setItems(initialItems);
      setLoading(false);
      return;
    }

    const cached = getCached<SchoolListItem[]>(cacheKey);
    if (cached !== undefined) {
      setItems(cached.slice(0, limit));
      setLoading(false);
    } else {
      setLoading(true);
    }

    let cancelled = false;
    void loadSchoolsFeed(limit)
      .then((schools) => {
        if (!cancelled) setItems(schools);
      })
      .catch(() => {
        if (!cancelled && getCached<SchoolListItem[]>(cacheKey) === undefined) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, initialItems, limit]);

  return { items, loading };
}
