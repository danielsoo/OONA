"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/context/LocaleContext";
import { useQuickSearch } from "@/hooks/useQuickSearch";
import { peopleProfileHref } from "@/lib/dm/peopleProfileHref";
import { schoolPosterGradient } from "@/lib/school-brand";
import { gradientForTitle, watchHref } from "@/lib/works/catalog-ui";

type Props = { className?: string };

function GroupLabel({ children }: { children: string }) {
  return <p className="px-4 pb-1 pt-3 text-micro font-semibold uppercase text-ink-4">{children}</p>;
}

const ROW =
  "flex items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none";

function QuickResults({ query, onPick }: { query: string; onPick: () => void }) {
  const { t } = useTranslations();
  const { works, people, schools, peopleLoading, signedIn } = useQuickSearch(query, 3);
  const empty = works.length === 0 && people.length === 0 && schools.length === 0 && !peopleLoading;

  return (
    <div className="max-h-[70vh] overflow-y-auto py-1">
      {works.length > 0 ? (
        <div>
          <GroupLabel>{t("ui.search.works")}</GroupLabel>
          {works.map((w) => (
            <Link key={w.id} href={watchHref(w.ownerUid, w.workId)} onClick={onPick} className={ROW}>
              <span className={`relative aspect-video w-14 shrink-0 overflow-hidden rounded-md ${gradientForTitle(w.title)}`}>
                {w.thumbnailUrl ? (
                  <Image src={w.thumbnailUrl} alt="" fill sizes="56px" unoptimized className="object-cover" />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-small font-semibold text-ink">{w.title}</span>
                <span className="block truncate text-small text-ink-3">
                  {[w.approvedCategory, w.director].filter(Boolean).join(" · ")}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {people.length > 0 ? (
        <div>
          <GroupLabel>{t("ui.search.people")}</GroupLabel>
          {people.map((p) => (
            <Link
              key={p.uid}
              href={peopleProfileHref(p.handle, p.uid) ?? "/society"}
              onClick={onPick}
              className={ROW}
            >
              <span
                className={`relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-small font-semibold text-ink ${gradientForTitle(p.displayName)}`}
              >
                {p.avatarUrl ? (
                  <Image src={p.avatarUrl} alt="" fill sizes="32px" unoptimized className="object-cover" />
                ) : (
                  p.displayName.slice(0, 1).toUpperCase()
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-small font-semibold text-ink">{p.displayName}</span>
                {p.headline ? <span className="block truncate text-small text-ink-3">{p.headline}</span> : null}
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {schools.length > 0 ? (
        <div>
          <GroupLabel>{t("ui.search.schools")}</GroupLabel>
          {schools.map((s) => (
            <Link key={s.id} href={`/school/${s.id}`} onClick={onPick} className={ROW}>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-ink"
                style={{ background: schoolPosterGradient(s.colorPrimary, s.colorSecondary) }}
              >
                {s.initials}
              </span>
              <span className="truncate text-small font-semibold text-ink">{s.name}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {empty ? <p className="px-4 py-3 text-small text-ink-3">{t("ui.search.noResults")}</p> : null}
      {!signedIn ? <p className="px-4 pb-2 text-small text-ink-4">{t("ui.search.signInForPeople")}</p> : null}

      <div className="mt-1 border-t border-line">
        <Link
          href={`/search?q=${encodeURIComponent(query.trim())}`}
          onClick={onPick}
          className="block px-4 py-3 text-small font-medium text-xiio-accent transition-colors hover:bg-white/[0.06]"
        >
          {t("ui.search.seeAll", { q: query.trim() })}
        </Link>
      </div>
    </div>
  );
}

/** The single search entry point: instant grouped results, Enter for the full results page. */
export default function TopBarSearch({ className = "" }: Props) {
  const { t } = useTranslations();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), 200);
    return () => window.clearTimeout(id);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setValue("");
  };

  return (
    <form
      ref={rootRef}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        setOpen(false);
        router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
      className={`relative ${className}`.trim()}
    >
      <label className="block h-full">
        <span className="sr-only">{t("topBar.searchLabel")}</span>
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4"
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
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("topBar.searchPlaceholder")}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && debounced.trim().length > 0}
          aria-controls="topbar-search-results"
          autoComplete="off"
          className="h-full w-full rounded-full border border-line bg-white/[0.04] py-2 pl-11 pr-4 text-small text-ink placeholder:text-ink-4 focus:border-xiio-accent/50 focus:outline-none"
        />
      </label>
      {open && debounced.trim() ? (
        <div
          id="topbar-search-results"
          className="animate-dropdown-in absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-card border border-line-strong bg-xiio-card shadow-2xl shadow-black/50"
        >
          <QuickResults query={debounced} onPick={close} />
        </div>
      ) : null}
    </form>
  );
}
