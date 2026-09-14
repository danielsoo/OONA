import type { HomeStoryItem } from "@/lib/homeMockData";
import { watchHref } from "@/lib/works/catalog-ui";
import { promoCropToVideoStyle } from "@/lib/works/promo-crop-interaction";
import type { PromoShort } from "@/types/promoShort";
import type { CatalogFeedItem, PromoFeedItem, WatchProgressItem } from "@/types/work";

export function catalogItemToHomeStory(item: CatalogFeedItem): HomeStoryItem {
  return {
    id: item.id,
    title: item.title,
    category: item.approvedCategory ?? item.section,
    // Card meta reads "Category · Creator"; the creator says more than a tag.
    duration: item.director?.trim() || item.approvedTags[0] || "",
    imageUrl: item.thumbnailUrl ?? "",
    href: watchHref(item.ownerUid, item.workId),
    imageStyle: item.thumbnailCrop ? promoCropToVideoStyle(item.thumbnailCrop) : undefined,
  };
}

export function catalogItemsToHomeStories(items: CatalogFeedItem[]): HomeStoryItem[] {
  return items.map(catalogItemToHomeStory);
}

export function watchProgressItemToHomeStory(item: WatchProgressItem): HomeStoryItem {
  return { ...catalogItemToHomeStory(item), progressPercent: item.progressPercent };
}

export function watchProgressItemsToHomeStories(items: WatchProgressItem[]): HomeStoryItem[] {
  return items.map(watchProgressItemToHomeStory);
}

function promoFeedLikeToHomeStory(item: Pick<
  PromoShort,
  "id" | "title" | "director" | "thumbnailUrl" | "videoUrl" | "ownerUid" | "workId" | "frameCrop"
>): HomeStoryItem {
  return {
    id: item.id,
    title: item.title,
    category: "Promo",
    duration: item.director,
    imageUrl: item.thumbnailUrl ?? "",
    videoUrl: item.videoUrl,
    href:
      item.ownerUid && item.workId ? watchHref(item.ownerUid, item.workId) : undefined,
    imageStyle: item.frameCrop ? promoCropToVideoStyle(item.frameCrop) : undefined,
  };
}

export function promoToHomeStory(item: PromoShort | PromoFeedItem): HomeStoryItem {
  return promoFeedLikeToHomeStory(item);
}
