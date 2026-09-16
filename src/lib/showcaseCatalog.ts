import type { CatalogFeedItem } from "@/types/work";

export function uniqueCatalogItems(items: CatalogFeedItem[]): CatalogFeedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.ownerUid}:${item.workId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Early-stage catalog presentation: keep real works and repeat them only when
 * a page needs more cards for an honest layout preview. Repeated cards retain
 * the original watch destination while receiving stable, unique React keys.
 */
export function fillCatalogItems(
  items: CatalogFeedItem[],
  targetCount: number
): CatalogFeedItem[] {
  if (items.length === 0 || targetCount <= 0) return [];

  const base = uniqueCatalogItems(items);
  const result = base.slice(0, targetCount);
  for (let index = result.length; index < targetCount; index += 1) {
    const source = base[index % base.length]!;
    result.push({
      ...source,
      id: `${source.id}-showcase-${index}`,
    });
  }
  return result;
}
