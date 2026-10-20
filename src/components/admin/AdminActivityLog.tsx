"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { pageName } from "@/components/admin/insights/names";
import type { ActivityCategory, ActivityEventView } from "@/lib/activity/events";

type People = "everyone" | "members" | "visitors";
type Focus = { uid: string; name?: string } | { visitorId: string } | null;

const CATEGORIES: { id: ActivityCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pages", label: "Pages" },
  { id: "clicks", label: "Clicks" },
  { id: "watching", label: "Watching" },
  { id: "search", label: "Searches" },
  { id: "account", label: "Sign-ins" },
];

const PEOPLE: { id: People; label: string }[] = [
  { id: "everyone", label: "Everyone" },
  { id: "members", label: "Signed in" },
  { id: "visitors", label: "Not signed in" },
];

const CATEGORY_COLOR: Record<ActivityCategory, string> = {
  pages: "text-sky-300/90",
  clicks: "text-white/85",
  watching: "text-emerald-300/90",
  search: "text-amber-300/90",
  account: "text-violet-300/90",
};

/** 0:42, 12:05, 1:02:09 */
function clock(seconds: unknown): string {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${m}:${rest}`;
}

const shortId = (id: string) => id.replace(/-/g, "").slice(0, 6);


/**
 * The admin console's activity log (lib/activity): every page people open,
 * button and link they click, video they play and search they make, newest
 * first. With `uid` it's one person's, including what they did on this
 * browser before signing in; otherwise everyone's, narrowed by who, signed
 * in or not, and kind.
 */
export default function AdminActivityLog({ uid, initialWho }: { uid?: string; initialWho?: string }) {
  const { user } = useAuth();
  const { formatDateTime } = useTranslations();
  const copy = useUiCopy();

  const [category, setCategory] = useState<ActivityCategory | "all">("all");
  const [people, setPeople] = useState<People>("everyone");
  const [whoInput, setWhoInput] = useState(initialWho ?? "");
  const [who, setWho] = useState(initialWho ?? "");
  const [focus, setFocus] = useState<Focus>(uid ? { uid } : null);
  const [events, setEvents] = useState<ActivityEventView[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(
    async (cursor: string | null) => {
      if (!user) return;
      if (cursor) setLoadingMore(true);
      else setLoading(true);
      setNotice(null);
      try {
        const params = new URLSearchParams({ limit: "50" });
        if (focus && "uid" in focus) params.set("uid", focus.uid);
        else if (focus && "visitorId" in focus) params.set("visitor", focus.visitorId);
        else if (who) params.set("who", who);
        else if (people !== "everyone") params.set("people", people);
        if (category !== "all") params.set("category", category);
        if (cursor) params.set("cursor", cursor);
        const res = await fetch(`/api/admin/activity?${params}`, {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        });
        const body = (await res.json().catch(() => ({}))) as {
          events?: ActivityEventView[];
          nextCursor?: string | null;
          notFound?: boolean;
          notConfigured?: boolean;
          resolved?: { uid?: string; visitorId?: string; name?: string } | null;
          message?: string;
        };
        if (!res.ok) {
          setNotice(body.message ?? copy("Couldn't load the activity log."));
          if (!cursor) setEvents([]);
          return;
        }
        if (body.notFound) setNotice(copy("Nobody found for “{who}”.", { who }));
        else if (body.notConfigured) setNotice(copy("The activity log isn't connected to its database yet: set MONGODB_URI on the server."));
        setEvents((list) => (cursor ? [...list, ...(body.events ?? [])] : body.events ?? []));
        setNextCursor(body.nextCursor ?? null);
      } catch {
        setNotice(copy("Couldn't load the activity log."));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, focus, who, people, category, copy]
  );

  useEffect(() => {
    void load(null);
  }, [load]);

  const describe = (event: ActivityEventView): string => {
    const d = event.data;
    const title = String(d.title ?? "");
    switch (event.type) {
      case "page_view": {
        const name = pageName(event.path);
        const heading = String(d.heading ?? "");
        if (!name) return copy("Opened {path}", { path: event.path });
        return heading && heading !== copy(name) ? copy("Opened {page}: “{heading}”", { page: copy(name), heading }) : copy("Opened {page}", { page: copy(name) });
      }
      case "click":
        return d.label ? copy("Clicked “{label}”", { label: String(d.label) }) : copy("Clicked a link to {href}", { href: String(d.href ?? "") });
      case "search":
        return copy("Searched “{query}”", { query: String(d.query ?? "") });
      case "video_play":
        return copy("Played “{title}” from {position}", { title, position: clock(d.position) });
      case "video_pause":
        if (d.reason === "page") return copy("Left “{title}” at {position} ({watched} watched)", { title, position: clock(d.position), watched: clock(d.watched) });
        if (d.reason === "site") return copy("Left the site during “{title}” at {position} ({watched} watched)", { title, position: clock(d.position), watched: clock(d.watched) });
        return copy("Paused “{title}” at {position} ({watched} watched)", { title, position: clock(d.position), watched: clock(d.watched) });
      case "video_progress":
        return copy("Reached {percent}% of “{title}”", { title, percent: Number(d.percent) || 0 });
      case "video_complete":
        return copy("Finished “{title}” ({watched} watched)", { title, watched: clock(d.watched) });
      case "sign_in":
        return copy("Signed in with {method}", { method: String(d.method ?? "") });
      case "sign_up":
        return copy("Signed up with {method}", { method: String(d.method ?? "") });
      case "sign_out":
        return copy("Signed out");
    }
  };

  const detail = (event: ActivityEventView): string | null => {
    const d = event.data;
    if (event.type === "click" && d.href && d.label) return `→ ${d.href}`;
    if (event.type === "search" && d.box) return copy("in “{box}”", { box: String(d.box) });
    if (event.type === "page_view" && d.referrer) return copy("from {site}", { site: String(d.referrer) });
    return null;
  };

  const focusLabel =
    focus && "uid" in focus && !uid
      ? copy("Showing {name}", { name: focus.name ?? focus.uid })
      : focus && "visitorId" in focus
        ? copy("Showing visitor {id}", { id: shortId(focus.visitorId) })
        : who
          ? copy("Showing {name}", { name: who })
          : null;

  return (
    <section className={uid ? "mt-10 pt-8 border-t border-white/10" : ""}>
      {uid ? (
        <>
          <h2 className="text-lg font-semibold text-white mb-1"><UiText text="Activity log" /></h2>
          <p className="text-xiio-muted text-sm mb-4"><UiText text="Everything this person did on OONA, newest first, including on this browser before they signed in." /></p>
        </>
      ) : null}

      {!uid ? (
        <form
          className="mb-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setFocus(null);
            setWho(whoInput.trim());
          }}
        >
          <input
            value={whoInput}
            onChange={(e) => setWhoInput(e.target.value)}
            placeholder={copy("Find a person: uid, @handle, email or visitor id")}
            aria-label={copy("Find a person: uid, @handle, email or visitor id")}
            className="h-10 min-w-[260px] flex-1 rounded-lg border border-white/15 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/35 focus:border-xiio-accent/60 focus:outline-none"
          />
          <button type="submit" className="h-10 rounded-lg bg-xiio-accent px-4 text-sm font-medium text-white hover:bg-xiio-accent-hover">
            <UiText text="Find" />
          </button>
        </form>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {focusLabel ? (
          <button
            type="button"
            onClick={() => {
              setFocus(uid ? { uid } : null);
              setWho("");
              setWhoInput("");
            }}
            className="rounded-lg border border-xiio-accent/50 bg-xiio-accent/10 px-3 py-1.5 text-sm text-white"
          >
            {focusLabel} <span aria-hidden>✕</span>
          </button>
        ) : !uid ? (
          PEOPLE.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeople(p.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${people === p.id ? "bg-white text-black" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
            >
              {copy(p.label)}
            </button>
          ))
        ) : null}
        <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${category === c.id ? "bg-xiio-accent text-white" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
          >
            {copy(c.label)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load(null)}
          className="ml-auto rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5"
        >
          <UiText text="Refresh" />
        </button>
      </div>

      {notice ? <p className="mb-4 text-sm text-amber-300/90">{notice}</p> : null}
      {loading ? <p className="text-sm text-xiio-muted"><UiText text="Loading…" /></p> : null}
      {!loading && events.length === 0 && !notice ? (
        <p className="text-sm text-xiio-muted"><UiText text="Nothing recorded yet." /></p>
      ) : null}

      {!loading && events.length > 0 ? (
        <ol className="divide-y divide-white/[0.06] rounded-xl border border-white/10 bg-white/[0.02]">
          {events.map((event) => {
            const extra = detail(event);
            const where = [event.device, event.browser, event.os, [event.city, event.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
            return (
              <li key={event.id} className="grid gap-x-4 gap-y-1 px-4 py-3 text-sm sm:grid-cols-[150px_minmax(0,220px)_minmax(0,1fr)]">
                <time className="text-xs text-white/45 sm:pt-0.5" dateTime={event.at}>{formatDateTime(event.at)}</time>
                <div className="min-w-0 truncate">
                  {event.uid ? (
                    uid ? (
                      <span className="text-white/80">{event.actor?.name ?? event.uid}</span>
                    ) : (
                      <Link href={`/admin/users/${event.uid}`} className="text-xiio-accent hover:underline" title={event.actor?.email ?? event.uid}>
                        {event.actor?.name ?? event.uid}
                      </Link>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFocus({ visitorId: event.visitorId })}
                      className="text-white/60 hover:text-white hover:underline"
                      title={event.visitorId}
                    >
                      {copy("Visitor {id}", { id: shortId(event.visitorId) })}
                    </button>
                  )}
                  {event.data.beforeSignIn ? (
                    <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/55"><UiText text="before sign-in" /></span>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className={`break-words font-medium ${CATEGORY_COLOR[event.category] ?? "text-white"}`}>{describe(event)}</p>
                  <p className="mt-0.5 break-all text-xs text-white/40">
                    {extra ? <span className="mr-2 text-white/55">{extra}</span> : null}
                    <a href={event.path} target="_blank" rel="noreferrer" className="hover:text-white/70 hover:underline">{event.path}</a>
                    {where ? <span className="ml-2">· {where}</span> : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      {nextCursor && !loading ? (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => void load(nextCursor)}
          className="mt-4 rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-40"
        >
          {loadingMore ? copy("Loading…") : copy("Load more")}
        </button>
      ) : null}
    </section>
  );
}
