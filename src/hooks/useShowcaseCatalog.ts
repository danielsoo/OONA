"use client";

import { useMemo } from "react";
import { useCatalogFeed } from "@/hooks/useCatalogFeed";
import { fillCatalogItems } from "@/lib/showcaseCatalog";
import type { WorkSection } from "@/types/work";

type ShowcaseSection = Extract<WorkSection, "movies" | "series" | "entertainment">;

export function useShowcaseCatalog(section: ShowcaseSection, targetCount = 20) {
  const movies = useCatalogFeed("movies", 24);
  const series = useCatalogFeed("series", 24);
  const entertainment = useCatalogFeed("entertainment", 24);

  const items = useMemo(() => {
    const pools = { movies: movies.items, series: series.items, entertainment: entertainment.items };
    const fallbackOrder: Record<ShowcaseSection, ShowcaseSection[]> = {
      movies: ["movies", "series", "entertainment"],
      series: ["series", "movies", "entertainment"],
      entertainment: ["entertainment", "series", "movies"],
    };
    return fillCatalogItems(
      fallbackOrder[section].flatMap((key) => pools[key]),
      targetCount
    );
  }, [entertainment.items, movies.items, section, series.items, targetCount]);

  return {
    items,
    loading: movies.loading || series.loading || entertainment.loading,
  };
}
