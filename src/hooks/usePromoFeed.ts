"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getCached, getOrLoadCached, setCache } from "@/lib/feedCache";
import { preloadFeedThumbnails } from "@/lib/clientFeedLoaders";
import { HOME_PROMO_SHORTS } from "@/data/promoShorts";
import type { PromoShort } from "@/types/promoShort";
import type { PromoFeedItem } from "@/types/work";

function toPromoShort(item: PromoFeedItem): PromoShort {
  return {
    id: item.id,
    videoUrl: item.videoUrl,
    aspectRatio: item.aspectRatio,
    frameCrop: item.frameCrop,
    title: item.title,
    director: item.director,
    description: item.description,
    likeCount: item.likeCount,
    viewCount: item.viewCount,
    ownerUid: item.ownerUid,
    workId: item.workId,
    streamUid: item.streamUid,
    thumbnailUrl: item.thumbnailUrl,
    likedByMe: item.likedByMe,
  };
}

type Options = {
  fallbackToDemo?: boolean;
  initialItems?: PromoFeedItem[];
};

export function usePromoFeed(fallbackToDemoOrOptions: boolean | Options = true) {
  const options =
    typeof fallbackToDemoOrOptions === "boolean"
      ? { fallbackToDemo: fallbackToDemoOrOptions }
      : fallbackToDemoOrOptions;
  const { fallbackToDemo = true, initialItems } = options;

  const { user, loading: authLoading } = useAuth();
  const publicCacheKey = "promo:v3:public";
  const cacheKey = user ? `promo:v3:${user.uid}` : publicCacheKey;

  // Keep the server and browser's first render identical. The in-memory feed
  // cache is browser-only, so reading it while initializing state can insert a
  // section before hydration has completed.
  const [items, setItems] = useState<PromoShort[]>(() => {
    if (initialItems !== undefined) return initialItems.map(toPromoShort);
    return fallbackToDemo ? HOME_PROMO_SHORTS : [];
  });
  const [loading, setLoading] = useState(initialItems === undefined);
  const [fromApi, setFromApi] = useState(
    () => initialItems !== undefined && initialItems.length > 0
  );

  useEffect(() => {
    if (authLoading) return;

    if (initialItems !== undefined) {
      const seeded = initialItems.map(toPromoShort);
      setCache(publicCacheKey, seeded);
      if (user) setCache(cacheKey, seeded);
      setItems(seeded);
      setFromApi(seeded.length > 0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const existing =
      getCached<PromoShort[]>(cacheKey) ?? getCached<PromoShort[]>(publicCacheKey);
    if (existing !== undefined) {
      setItems(existing.length > 0 || !fallbackToDemo ? existing : HOME_PROMO_SHORTS);
      setFromApi(existing.length > 0);
      setLoading(false);
    } else {
      setLoading(true);
    }

    (async () => {
      try {
        // Public metadata and thumbnails are the critical path. Personal likes
        // are merged only after the visible cards have already appeared.
        const publicItems = await getOrLoadCached(publicCacheKey, async () => {
          const res = await fetch("/api/feed/promo-shorts");
          if (!res.ok) throw new Error("promo_feed_failed");
          const data = (await res.json()) as { items?: PromoFeedItem[] };
          return preloadFeedThumbnails((data.items ?? []).map(toPromoShort));
        });
        if (cancelled) return;
        if (publicItems.length > 0) {
          setItems(publicItems);
          setFromApi(true);
        } else if (!fallbackToDemo) {
          setItems([]);
          setFromApi(false);
        } else {
          setItems(HOME_PROMO_SHORTS);
          setFromApi(false);
        }

        if (user) {
          const personalizedItems = await getOrLoadCached(cacheKey, async () => {
            const token = await user.getIdToken();
            const res = await fetch("/api/feed/promo-shorts", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("promo_feed_personalization_failed");
            const data = (await res.json()) as { items?: PromoFeedItem[] };
            return preloadFeedThumbnails((data.items ?? []).map(toPromoShort));
          });
          if (!cancelled && personalizedItems.length > 0) {
            setItems(personalizedItems);
            setFromApi(true);
          }
        }
      } catch {
        if (!fallbackToDemo && !cancelled && existing === undefined) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, fallbackToDemo, user, cacheKey, publicCacheKey, initialItems]);

  return { items, loading, fromApi };
}
