import { getEngagementSessionId } from "@/lib/engagement-session";
import { sanitizeActivityPath, type ActivityData, type ActivityEventInput, type ActivityType } from "@/lib/activity/events";

/**
 * The browser half of the activity log: events wait here and go to
 * /api/activity a few seconds later, or at once when the page is left, in
 * batches. Every browser has its own visitor id (kept in localStorage), so a
 * visitor is followed before they sign in too; the server ties that id to
 * their account once they do (ActivityRecorder sends their token).
 */

const VISITOR_KEY = "oona.visitorId";
const FLUSH_MS = 4000;
const BATCH = 50;

let queue: ActivityEventInput[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let getToken: (() => Promise<string | null>) | null = null;
let token: string | null = null;
let memoryVisitorId: string | null = null;
let refresher: ReturnType<typeof setInterval> | null = null;
let off = false;
/** Sign-in tokens last an hour. */
const TOKEN_REFRESH_MS = 20 * 60 * 1000;

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/** This browser's visitor id, the same across tabs and visits. */
export function activityVisitorId(): string {
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = newId();
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // Storage blocked: this page load is a visitor of its own.
    memoryVisitorId ??= newId();
    return memoryVisitorId;
  }
}

/**
 * Who's signed in, for the events that follow (null once they sign out). The
 * token is fetched at once and kept fresh, so even a page left within a
 * second of opening sends its events as theirs.
 */
export function setActivityUser(tokenOf: (() => Promise<string | null>) | null): void {
  getToken = tokenOf;
  if (refresher) clearInterval(refresher);
  refresher = null;
  if (!tokenOf) {
    token = null;
    return;
  }
  const refresh = () => void tokenOf().then((t) => { if (getToken === tokenOf) token = t; }, () => {});
  refresh();
  refresher = setInterval(refresh, TOKEN_REFRESH_MS);
}

export function currentActivityPath(): string {
  return `${window.location.pathname}${window.location.search}`;
}

/** Note that something happened; it's sent with the next batch. */
export function trackActivity(type: ActivityType, data?: ActivityData, path = currentActivityPath(), at = Date.now()): void {
  if (typeof window === "undefined" || off) return;
  queue.push({ type, at, path: sanitizeActivityPath(path) ?? window.location.pathname, ...(data ? { data } : {}) });
  if (queue.length >= BATCH) void flushActivity(false);
  else timer ??= setTimeout(() => void flushActivity(false), FLUSH_MS);
}

/**
 * Sends what's waiting. When the page is going away there is no time to
 * refresh the sign-in token, so the last one is used (keepalive lets the
 * request finish after the page is gone).
 */
export async function flushActivity(leaving: boolean): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;
  const events = queue.splice(0, BATCH);
  if (!leaving && getToken) {
    try {
      token = await getToken();
    } catch {
      // Keep the last token; the server treats a stale one as signed out.
    }
  }
  const body = JSON.stringify({ visitorId: activityVisitorId(), sessionId: getEngagementSessionId(), sentAt: Date.now(), events });
  try {
    const res = await fetch("/api/activity", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body,
    });
    // The log isn't set up on this server (no database): stop for this page load.
    if (res.status === 503) {
      off = true;
      queue = [];
    }
  } catch {
    // Dropped: the log is best effort and never gets in the way of the page.
  }
  if (queue.length > 0) void flushActivity(leaving);
}
