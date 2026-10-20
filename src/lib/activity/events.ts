/**
 * The activity log's events: what the browser records (lib/activity/client.ts)
 * and the server stores in `activityEvents` (lib/server/activity-log.ts), for
 * the admin console to look up who did what. Pure, shared by both sides.
 *
 * Only what people do is kept, never what they type, except into search
 * boxes: a click's button or link label, a page's path, a video's title and
 * position, a search's words.
 */

export const ACTIVITY_TYPES = [
  "page_view",
  "click",
  "search",
  "video_play",
  "video_pause",
  "video_progress",
  "video_complete",
  "sign_in",
  "sign_up",
  "sign_out",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_CATEGORIES = ["pages", "clicks", "watching", "search", "account"] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

/** Part of the site an event happened in, from its path. */
export type ActivityArea = "home" | "films" | "schools" | "society" | "messages" | "account" | "upload" | "other";

export type ActivityData = Record<string, string | number | boolean>;

/** One event as the browser sends it. */
export type ActivityEventInput = { type: ActivityType; at: number; path: string; data?: ActivityData };

/** One event as the admin console reads it. */
export type ActivityEventView = {
  id: string;
  type: ActivityType;
  category: ActivityCategory;
  area: ActivityArea;
  at: string;
  path: string;
  data: ActivityData;
  uid: string | null;
  visitorId: string;
  sessionId: string;
  signedIn: boolean;
  device: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  actor: { name: string; handle: string | null; email: string | null } | null;
};

const TYPES = new Set<string>(ACTIVITY_TYPES);

export function isActivityType(value: unknown): value is ActivityType {
  return typeof value === "string" && TYPES.has(value);
}

export function isActivityCategory(value: unknown): value is ActivityCategory {
  return typeof value === "string" && (ACTIVITY_CATEGORIES as readonly string[]).includes(value);
}

export function activityCategory(type: ActivityType): ActivityCategory {
  if (type === "page_view") return "pages";
  if (type === "click") return "clicks";
  if (type === "search") return "search";
  if (type.startsWith("video_")) return "watching";
  return "account";
}

export function activityArea(path: string): ActivityArea {
  const first = path.split(/[?#]/)[0]!.split("/")[1] ?? "";
  if (first === "") return "home";
  if (["movies", "series", "entertainment", "shorts", "watch", "discover", "credits", "my-list"].includes(first)) return "films";
  if (first === "schools" || first === "school") return "schools";
  if (["society", "people", "p", "search"].includes(first)) return "society";
  if (first === "messages" || first === "notifications") return "messages";
  if (["account", "settings", "profile", "login", "signup"].includes(first)) return "account";
  if (first === "uploader" || first === "projects") return "upload";
  return "other";
}

/** Query parameters that can carry a secret (sign-in links, invites); dropped from logged paths. */
const SECRET_PARAMS = /^(token|code|key|secret|password|oobcode|apikey|state|id_token|access_token|refresh_token|mode|continueurl)$/i;

/** A same-site path to keep: no origin, no secrets in the query, bounded. Null if it isn't one. */
export function sanitizeActivityPath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return null;
  const [path = "/", query = ""] = (raw.split("#")[0] ?? "").split("?");
  const params = new URLSearchParams(query);
  for (const key of [...params.keys()]) if (SECRET_PARAMS.test(key)) params.delete(key);
  const kept = params.toString();
  return `${path}${kept ? `?${kept}` : ""}`.slice(0, 300);
}

const DATA_KEY = /^[a-zA-Z][a-zA-Z0-9]{0,23}$/;

/** An event's details, bounded: up to 12 short fields of text, numbers or flags. */
export function sanitizeActivityData(raw: unknown): ActivityData {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: ActivityData = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>).slice(0, 12)) {
    if (!DATA_KEY.test(key)) continue;
    if (typeof value === "string") {
      const text = value.replace(/\s+/g, " ").trim().slice(0, 200);
      if (text) out[key] = text;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = Math.round(value * 10) / 10;
    } else if (typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

/** The browser and device an event came from, roughly, from its user agent. */
export function describeUserAgent(ua: string): { device: string; browser: string; os: string } {
  const device = /iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung Internet"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\/|CriOS/.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Other";
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "Other";
  return { device, browser, os };
}

/** Crawlers and link previews, which aren't people. */
export function isBotUserAgent(ua: string): boolean {
  return /bot|crawler|spider|slurp|facebookexternalhit|embedly|preview|vercel-screenshot/i.test(ua);
}

/** A visitor or session id the browser made (a UUID), or null. */
export function sanitizeActivityId(raw: unknown): string | null {
  return typeof raw === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(raw) ? raw : null;
}
