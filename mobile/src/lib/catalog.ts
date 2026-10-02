import type { CatalogFeedItem } from "@/types/work";
import type { RailItem } from "~/components/WorkRail";

/** Same meta line as the website's BrowseCatalogPage itemMeta. */
export function itemMeta(item: CatalogFeedItem): string {
  return [item.approvedCategory, item.director, item.approvedSchoolName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" · ");
}

export function toRailItem(item: CatalogFeedItem): RailItem {
  return {
    key: `${item.ownerUid}:${item.workId}`,
    ownerUid: item.ownerUid,
    workId: item.workId,
    title: item.title,
    subtitle: item.director,
    thumbnailUrl: item.thumbnailUrl,
  };
}
