"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCatalogFeed } from "@/hooks/useCatalogFeed";
import { useSchoolsFeed } from "@/hooks/useSchoolsFeed";
import type { SchoolListItem } from "@/types/school";
import type { CatalogFeedItem } from "@/types/work";

export type QuickPersonResult = {
  uid: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  headline?: string;
  roleTags: string[];
};

/**
 * Works (title match over the cached catalog feeds), schools (name match) and
 * people (server search, signed-in only) for one query. Used by the top-bar
 * dropdown; `limit` caps each group.
 */
export function useQuickSearch(rawQuery: string, limit = 3) {
  const { user } = useAuth();
  const q = rawQuery.trim().toLowerCase();

  const { items: movies } = useCatalogFeed("movies", 30);
  const { items: series } = useCatalogFeed("series", 30);
  const { items: entertainment } = useCatalogFeed("entertainment", 30);
  const { items: schools } = useSchoolsFeed(50);

  const works = useMemo<CatalogFeedItem[]>(() => {
    if (!q) return [];
    const seen = new Set<string>();
    return [...movies, ...series, ...entertainment]
      .filter((w) => {
        if (seen.has(w.id)) return false;
        seen.add(w.id);
        return w.title.toLowerCase().includes(q) || (w.director ?? "").toLowerCase().includes(q);
      })
      .slice(0, limit);
  }, [movies, series, entertainment, q, limit]);

  const schoolResults = useMemo<SchoolListItem[]>(() => {
    if (!q) return [];
    return schools
      .filter((s) => s.name.toLowerCase().includes(q) || (s.shortName ?? "").toLowerCase().includes(q))
      .slice(0, limit);
  }, [schools, q, limit]);

  const [people, setPeople] = useState<QuickPersonResult[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  useEffect(() => {
    if (!q || !user) {
      setPeople([]);
      setPeopleLoading(false);
      return;
    }
    let cancelled = false;
    setPeopleLoading(true);
    void (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/discover/people?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json().catch(() => ({}))) as { people?: QuickPersonResult[] };
        if (!cancelled && res.ok) setPeople((data.people ?? []).slice(0, limit));
      } catch {
        if (!cancelled) setPeople([]);
      } finally {
        if (!cancelled) setPeopleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, user, limit]);

  return { works, people, schools: schoolResults, peopleLoading, signedIn: Boolean(user) };
}
