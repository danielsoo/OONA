"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppPageShell from "@/components/layout/AppPageShell";
import PageHeader from "@/components/ui/PageHeader";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import SectionLabel from "@/components/layout/SectionLabel";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { useCatalogFeed } from "@/hooks/useCatalogFeed";
import { useSchoolsFeed } from "@/hooks/useSchoolsFeed";
import { schoolPosterGradient } from "@/lib/school-brand";
import { peopleProfileHref } from "@/lib/dm/peopleProfileHref";
import { gradientForTitle, watchHref } from "@/lib/works/catalog-ui";
import type { CatalogFeedItem } from "@/types/work";

type PersonResult = {
  uid: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  headline?: string;
  roleTags: string[];
};

const RECENT_SEARCHES_KEY = "xiio:recentSearches";
const MAX_RECENT_SEARCHES = 8;

function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  if (typeof window === "undefined") return;
  const trimmed = term.trim();
  if (!trimmed) return;
  const existing = loadRecentSearches().filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...existing].slice(0, MAX_RECENT_SEARCHES);
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

export default function SearchPage({ initialQuery = "" }: { initialQuery?: string }) {
  const { t } = useTranslations();
  const { user } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setQuery(initialQuery);
    setDebouncedQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

  // Debounce: 300ms after the user stops typing before filtering/searching.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      saveRecentSearch(debouncedQuery);
      setRecentSearches(loadRecentSearches());
    }
  }, [debouncedQuery]);

  const { items: movies } = useCatalogFeed("movies", 30);
  const { items: series } = useCatalogFeed("series", 30);
  const { items: entertainment } = useCatalogFeed("entertainment", 30);

  const allWorks = useMemo<CatalogFeedItem[]>(
    () => [...movies, ...series, ...entertainment],
    [movies, series, entertainment]
  );

  const q = debouncedQuery.trim().toLowerCase();

  const { items: schools } = useSchoolsFeed(50);
  const schoolResults = useMemo(() => {
    if (!q) return [];
    return schools
      .filter((s) => s.name.toLowerCase().includes(q) || (s.shortName ?? "").toLowerCase().includes(q))
      .slice(0, 10);
  }, [schools, q]);

  const titleResults = useMemo(() => {
    if (!q) return [];
    return allWorks.filter((w) => w.title.toLowerCase().includes(q)).slice(0, 20);
  }, [allWorks, q]);

  useEffect(() => {
    if (!q || !user) {
      setPeople([]);
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
        const data = (await res.json().catch(() => ({}))) as { people?: PersonResult[] };
        if (!cancelled && res.ok) setPeople(data.people ?? []);
      } finally {
        if (!cancelled) setPeopleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, user]);

  return (
    <AppPageShell>
      <PageHeader title={t("search.title")} className="!pt-4 lg:!pt-8">
        <label className="relative block max-w-xl">
          <span className="sr-only">{t("search.title")}</span>
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            aria-hidden
          >
            <circle cx="11" cy="11" r="6.5" />
            <path strokeLinecap="round" d="M16.5 16.5L20 20" />
          </svg>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("topBar.searchPlaceholder")}
            className="h-12 w-full rounded-full border border-line-strong bg-white/[0.04] pl-12 pr-5 text-body text-ink placeholder:text-ink-4 focus:border-xiio-accent/60 focus:outline-none"
          />
        </label>
      </PageHeader>

      {!q ? (
        recentSearches.length > 0 ? (
          <section>
            <div className="mb-3">
              <SectionLabel>{t("search.recentLabel")}</SectionLabel>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setQuery(term);
                    setDebouncedQuery(term);
                  }}
                  className="rounded-full border border-line bg-white/[0.03] px-4 py-2 text-small text-ink-2 hover:text-ink hover:border-line-strong transition"
                >
                  {term}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <p className="text-ink-3 text-body">{t("search.prompt")}</p>
        )
      ) : (
        <div className="flex flex-col gap-8">
          <section>
            <div className="mb-3">
              <SectionLabel>{t("search.titlesLabel")}</SectionLabel>
            </div>
            {titleResults.length === 0 ? (
              <p className="text-ink-3 text-body">{t("search.noResults")}</p>
            ) : (
              <div className="flex flex-col">
                {titleResults.map((w) => (
                  <Link
                    key={w.id}
                    href={watchHref(w.ownerUid, w.workId)}
                    className="flex items-center gap-3.5 py-2.5 border-b border-line last:border-b-0 hover:bg-white/[0.02] transition"
                  >
                    <div className={`relative w-20 aspect-video rounded-control overflow-hidden shrink-0 ${gradientForTitle(w.title)}`}>
                      {w.thumbnailUrl ? (
                        <Image src={w.thumbnailUrl} alt="" fill sizes="80px" className="object-cover" unoptimized />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-body font-medium text-ink truncate">{w.title}</p>
                      <p className="text-small text-ink-3 mt-0.5">{w.approvedCategory ?? w.section}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {user ? (
            <section>
              <div className="mb-3">
                <SectionLabel>{t("search.peopleLabel")}</SectionLabel>
              </div>
              {peopleLoading ? (
                <p className="text-ink-3 text-body">{t("common.loading")}</p>
              ) : people.length === 0 ? (
                <p className="text-ink-3 text-body">{t("search.noResults")}</p>
              ) : (
                <div className="flex flex-col">
                  {people.map((p) => {
                    const href = peopleProfileHref(p.handle, p.uid);
                    return (
                      <Link
                        key={p.uid}
                        href={href ?? "#"}
                        className="flex items-center gap-3 py-2.5 border-b border-line last:border-b-0 hover:bg-white/[0.02] transition"
                      >
                        <ProfileAvatar
                          displayName={p.displayName}
                          avatarUrl={p.avatarUrl}
                          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-body font-medium text-ink truncate">{p.displayName}</p>
                          <p className="text-small text-ink-3 mt-0.5 truncate">
                            {p.headline || p.roleTags[0] || `@${p.handle}`}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          {schoolResults.length > 0 ? (
            <section>
              <div className="mb-3">
                <SectionLabel>{t("ui.search.schools")}</SectionLabel>
              </div>
              <div className="flex flex-col">
                {schoolResults.map((s) => (
                  <Link
                    key={s.id}
                    href={`/school/${s.id}`}
                    className="flex items-center gap-3 py-2.5 border-b border-line last:border-b-0 hover:bg-white/[0.02] transition"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-[11px] font-bold text-ink"
                      style={{ background: schoolPosterGradient(s.colorPrimary, s.colorSecondary) }}
                    >
                      {s.initials}
                    </span>
                    <p className="min-w-0 truncate text-body font-medium text-ink">{s.name}</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </AppPageShell>
  );
}
