"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { flushActivity, setActivityUser, trackActivity } from "@/lib/activity/client";
import { sanitizeActivityPath } from "@/lib/activity/events";
import { isDemoVisit } from "@/lib/demo-flags";

/**
 * Records what people do on the site for the admin console's activity log
 * (lib/activity): every page they open, every button and link they click
 * (by its label), every video they play, pause and finish, and every search
 * they make, signed in or not. Nothing typed is kept except search words.
 * Off in the demo, and in the admin console itself.
 */
export default function ActivityRecorder() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { user, loading } = useAuth();
  const on = useRef(false);

  // Whether to record at all, decided once in the browser.
  useEffect(() => {
    on.current = !isDemoVisit();
  }, []);

  // Pages, as they're opened: with the page's heading (a work's title, a
  // person's name) once it has loaded, or without it if they leave first.
  const firstPage = useRef(true);
  useEffect(() => {
    if (!on.current || isAdminPath(pathname)) return;
    const path = sanitizeActivityPath(`${pathname}${search ? `?${search}` : ""}`) ?? pathname;
    const referrer = firstPage.current ? externalReferrer() : null;
    firstPage.current = false;
    stopVideos("page");
    const openedAt = Date.now();
    let done = false;
    const record = (loaded: boolean) => {
      if (done) return;
      done = true;
      const heading = loaded ? pageHeading() : null;
      trackActivity("page_view", { ...(heading ? { heading } : {}), ...(referrer ? { referrer } : {}) }, path, openedAt);
    };
    pendingPage = () => record(false);
    const id = setTimeout(() => record(true), 1500);
    return () => {
      clearTimeout(id);
      record(false);
    };
  }, [pathname, search]);

  // Signing in, up and out, and the token that ties events to the account.
  const lastUid = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (loading || !on.current) return;
    const uid = user?.uid ?? null;
    const before = lastUid.current;
    lastUid.current = uid;
    if (user) setActivityUser(() => user.getIdToken());
    // The first answer is just who was already signed in.
    if (before === undefined || before === uid) return;
    if (uid && user) {
      const created = Date.parse(user.metadata.creationTime ?? "");
      const fresh = Number.isFinite(created) && Date.now() - created < 2 * 60 * 1000;
      trackActivity(fresh ? "sign_up" : "sign_in", { method: user.providerData[0]?.providerId ?? "password" });
      void flushActivity(false);
    } else {
      trackActivity("sign_out");
      void flushActivity(true).then(() => setActivityUser(null));
    }
  }, [user, loading]);

  // Clicks, videos, searches and leaving: listened for once, site-wide.
  useEffect(() => {
    if (!on.current) return;
    const skip = () => isAdminPath(window.location.pathname);

    const onClick = (event: MouseEvent) => {
      if (skip()) return;
      const target = event.target instanceof Element ? event.target.closest(CLICKABLE) : null;
      if (!target || target.closest("[data-activity-ignore]")) return;
      const label = labelOf(target);
      const href = target instanceof HTMLAnchorElement ? sanitizeActivityPath(sameSiteHref(target.href)) ?? externalHost(target.href) : null;
      if (!label && !href) return;
      const checked = target instanceof HTMLInputElement && (target.type === "checkbox" || target.type === "radio") ? target.checked : null;
      trackActivity("click", {
        ...(label ? { label } : {}),
        ...(href ? { href } : {}),
        element: target.getAttribute("role") ?? target.tagName.toLowerCase(),
        ...(checked !== null ? { checked } : {}),
      });
    };

    const onMedia = (event: Event) => {
      const video = event.target;
      if (!(video instanceof HTMLVideoElement) || skip()) return;
      // Muted, controlless videos are backdrops and previews, not watching.
      if (!video.controls && video.muted) return;
      watchEvent(video, event.type);
    };

    const onInput = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || !isSearchBox(input) || skip()) return;
      const pending = searchTimers.get(input);
      if (pending) clearTimeout(pending);
      searchTimers.set(input, setTimeout(() => recordSearch(input), 1200));
    };
    const onKey = (event: KeyboardEvent) => {
      const input = event.target;
      if (event.key !== "Enter" || !(input instanceof HTMLInputElement) || !isSearchBox(input) || skip()) return;
      const pending = searchTimers.get(input);
      if (pending) clearTimeout(pending);
      recordSearch(input);
    };

    // Leaving (another site, a reload, a closed tab) or just hiding the tab:
    // what's waiting goes now. On pagehide the tab can still read as visible.
    const onLeave = () => {
      pendingPage?.();
      stopVideos("site");
      void flushActivity(true);
    };
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      pendingPage?.();
      void flushActivity(true);
    };

    document.addEventListener("click", onClick, true);
    for (const type of MEDIA_EVENTS) document.addEventListener(type, onMedia, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onLeave);
    return () => {
      document.removeEventListener("click", onClick, true);
      for (const type of MEDIA_EVENTS) document.removeEventListener(type, onMedia, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onLeave);
    };
  }, []);

  return null;
}

// Not <label>: clicking one clicks its input too, which is what's recorded.
// Not <select>: its text is every option.
const CLICKABLE =
  "a[href],button,summary,[role=button],[role=tab],[role=link],[role=menuitem],[role=option],[role=switch],[role=checkbox],input[type=checkbox],input[type=radio],input[type=submit],input[type=button]";

const isAdminPath = (path: string) => path === "/admin" || path.startsWith("/admin/");

/** Records the open page's view now, if it's still waiting for its heading. */
let pendingPage: (() => void) | null = null;

/** The page's main heading: a work's title, a person's or school's name. */
function pageHeading(): string | null {
  const h1 = document.querySelector<HTMLElement>("main h1") ?? document.querySelector<HTMLElement>("h1");
  if (!h1) return null;
  // As it reads on screen: words on separate lines (<br>, block <span>s) stay apart.
  const parts = [...h1.children].map((child) => (child as HTMLElement).innerText?.trim()).filter(Boolean);
  const text = (parts.length > 1 ? parts.join(" ") : h1.innerText || h1.textContent || "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 100) : null;
}

/** What a clickable thing says: its accessible name, else its text, else its picture's alt. */
function labelOf(el: Element): string {
  const aria = el.getAttribute("aria-label");
  const text = aria
    ?? (el instanceof HTMLInputElement && el.labels?.[0] ? el.labels[0].innerText : null)
    ?? (el as HTMLElement).innerText
    ?? "";
  const label = text.replace(/\s+/g, " ").trim()
    || el.getAttribute("title")
    || el.querySelector("img[alt]")?.getAttribute("alt")
    || "";
  return label.slice(0, 100);
}

function sameSiteHref(href: string): string | null {
  try {
    const url = new URL(href, window.location.href);
    return url.origin === window.location.origin ? `${url.pathname}${url.search}` : null;
  } catch {
    return null;
  }
}

function externalHost(href: string): string | null {
  try {
    const url = new URL(href);
    return /^https?:$/.test(url.protocol) ? url.host : null;
  } catch {
    return null;
  }
}

function externalReferrer(): string | null {
  if (!document.referrer) return null;
  try {
    const url = new URL(document.referrer);
    return url.origin === window.location.origin ? null : url.host;
  } catch {
    return null;
  }
}

// Watching: plays, pauses, the 25/50/75% marks and the end, with the time
// actually watched since the last report (not counting jumps).
const MEDIA_EVENTS = ["play", "pause", "ended", "timeupdate"] as const;
type WatchState = { last: number; watched: number; marks: Set<number>; path: string };
const watching = new Map<HTMLVideoElement, WatchState>();

function videoTitle(video: HTMLVideoElement): string {
  return video.getAttribute("aria-label") || video.getAttribute("title") || document.title;
}

function watchEvent(video: HTMLVideoElement, type: string) {
  let state = watching.get(video);
  if (!state) {
    state = { last: video.currentTime, watched: 0, marks: new Set(), path: `${window.location.pathname}${window.location.search}` };
    watching.set(video, state);
  }
  const position = Math.round(video.currentTime);
  const duration = Number.isFinite(video.duration) ? Math.round(video.duration) : 0;
  const title = videoTitle(video);
  if (type === "timeupdate") {
    const step = video.currentTime - state.last;
    if (step > 0 && step < 2) state.watched += step;
    state.last = video.currentTime;
    if (duration > 0) {
      for (const mark of [25, 50, 75]) {
        if (!state.marks.has(mark) && video.currentTime / duration >= mark / 100) {
          state.marks.add(mark);
          trackActivity("video_progress", { title, percent: mark, position, duration });
        }
      }
    }
    return;
  }
  if (type === "play") {
    state.last = video.currentTime;
    trackActivity("video_play", { title, position, duration });
    return;
  }
  const watched = Math.round(state.watched);
  state.watched = 0;
  if (type === "ended") {
    watching.delete(video);
    trackActivity("video_complete", { title, duration, watched });
  } else if (type === "pause" && !video.ended) {
    trackActivity("video_pause", { title, position, duration, watched });
  }
}

/** Videos still playing when the page (`reason` "page") or the site ("site") is left: what was watched of them. */
function stopVideos(reason: "page" | "site") {
  for (const [video, state] of watching) {
    // A video taken off the page is paused without a pause event reaching
    // here, so anything watched and not yet reported counts.
    const watched = Math.round(state.watched);
    if (watched > 0) {
      trackActivity("video_pause", {
        title: videoTitle(video),
        position: Math.round(video.currentTime),
        duration: Number.isFinite(video.duration) ? Math.round(video.duration) : 0,
        watched,
        reason,
      }, state.path);
    }
    state.watched = 0;
    if (!video.isConnected) watching.delete(video);
  }
}

// Searching: what's typed into a search box, once typing stops (or on Enter).
const searchTimers = new WeakMap<HTMLInputElement, ReturnType<typeof setTimeout>>();
const searched = new WeakMap<HTMLInputElement, string>();

function isSearchBox(input: HTMLInputElement): boolean {
  if (input.type === "search" || input.getAttribute("role") === "searchbox") return true;
  if (input.type !== "text" && input.type !== "") return false;
  const hint = `${input.getAttribute("aria-label") ?? ""} ${input.placeholder} ${input.name}`;
  return /search|검색|検索|찾기/i.test(hint);
}

function recordSearch(input: HTMLInputElement) {
  searchTimers.delete(input);
  const query = input.value.replace(/\s+/g, " ").trim();
  if (!query || searched.get(input) === query) return;
  searched.set(input, query);
  trackActivity("search", { query: query.slice(0, 120), box: (input.getAttribute("aria-label") || input.placeholder || "").slice(0, 80) });
}

