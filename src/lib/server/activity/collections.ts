import type { Collection, Db, IndexDescription, ObjectId } from "mongodb";
import type { ActivityArea, ActivityType } from "@/lib/activity/events";

/**
 * Where the activity log lives in MongoDB: one small collection for each kind
 * of thing people do, each with only its own fields, plus one for each visit
 * (a browser tab's session, with its device and place) and one for each
 * browser (a visitor, and whose account it signed in to).
 *
 *   page_views    path, heading, referrer
 *   clicks        label, href, element, checked
 *   searches      query, box
 *   video_events  action (play | pause | progress | complete), title, position, duration, watched, percent, reason
 *   auth_events   action (sign_in | sign_up | sign_out), method
 *   sessions      device, browser, os, country, region, city, when it began and was last seen
 *   visitors      uid, first and last seen
 *
 * Every event says who (uid, or null before sign-in; visitorId; sessionId),
 * when (`at`) and where (`path`, `area`). Events, sessions and visitors are
 * kept for a year (TTL indexes).
 */

export const RETENTION_SECONDS = 365 * 24 * 60 * 60;

export type EventBase = {
  _id?: ObjectId;
  at: Date;
  uid: string | null;
  signedIn: boolean;
  /** Set when a browser's earlier, signed-out events were added to the account it signed in to. */
  beforeSignIn?: true;
  visitorId: string;
  sessionId: string;
  path: string;
  area: ActivityArea;
};

export type PageViewDoc = EventBase & { heading?: string; referrer?: string };
export type ClickDoc = EventBase & { label?: string; href?: string; element?: string; checked?: boolean };
export type SearchDoc = EventBase & { query: string; box?: string };
export type VideoAction = "play" | "pause" | "progress" | "complete";
export type VideoEventDoc = EventBase & {
  action: VideoAction;
  title?: string;
  position?: number;
  duration?: number;
  watched?: number;
  percent?: number;
  reason?: string;
};
export type AuthAction = "sign_in" | "sign_up" | "sign_out";
export type AuthEventDoc = EventBase & { action: AuthAction; method?: string };

export type SessionDoc = {
  _id: string;
  visitorId: string;
  uid: string | null;
  startedAt: Date;
  lastSeenAt: Date;
  landingPath: string;
  events: number;
  device: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
};

export type VisitorDoc = {
  _id: string;
  uid: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastSignedInAt?: Date;
  events: number;
};

export type AnyEventDoc = PageViewDoc | ClickDoc | SearchDoc | VideoEventDoc | AuthEventDoc;

export const EVENT_KINDS = ["page_views", "clicks", "searches", "video_events", "auth_events"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** One kind's collection, for what all kinds share (writing, reading by who and when). */
export function eventCollection(db: Db, kind: EventKind): Collection<AnyEventDoc> {
  return db.collection<AnyEventDoc>(kind);
}

/** Which collection an event type goes to. */
export function kindOf(type: ActivityType): EventKind {
  if (type === "page_view") return "page_views";
  if (type === "click") return "clicks";
  if (type === "search") return "searches";
  if (type.startsWith("video_")) return "video_events";
  return "auth_events";
}

export const sessionsCollection = (db: Db) => db.collection<SessionDoc>("sessions");
export const visitorsCollection = (db: Db) => db.collection<VisitorDoc>("visitors");

/** Each event collection: newest first for everyone, one person, one browser, or signed in or not; gone after a year. */
const EVENT_INDEXES: IndexDescription[] = [
  { key: { at: 1 }, name: "at_ttl", expireAfterSeconds: RETENTION_SECONDS },
  { key: { uid: 1, at: -1 }, name: "uid_at" },
  { key: { visitorId: 1, at: -1 }, name: "visitor_at" },
  { key: { signedIn: 1, at: -1 }, name: "signedIn_at" },
];

let indexed: Promise<void> | null = null;

/**
 * Creates the indexes once per server process (creating an existing index is
 * a no-op). Each on its own, so one the server can't make (a TTL on a
 * MongoDB-compatible store without TTLs) doesn't keep the others from it.
 */
export function ensureActivityIndexes(db: Db): Promise<void> {
  indexed ??= (async () => {
    const wanted: [string, IndexDescription][] = [
      ...EVENT_KINDS.flatMap((kind) => EVENT_INDEXES.map((index): [string, IndexDescription] => [kind, index])),
      ["sessions", { key: { visitorId: 1 }, name: "visitor" }],
      ["sessions", { key: { lastSeenAt: 1 }, name: "lastSeen_ttl", expireAfterSeconds: RETENTION_SECONDS }],
      ["visitors", { key: { uid: 1 }, name: "uid" }],
      ["visitors", { key: { lastSeenAt: 1 }, name: "lastSeen_ttl", expireAfterSeconds: RETENTION_SECONDS }],
    ];
    const results = await Promise.allSettled(wanted.map(([name, index]) => db.collection(name).createIndexes([index])));
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        const [name, index] = wanted[i]!;
        console.error(`[activity] index ${name}.${index.name} not created:`, (result.reason as Error)?.message ?? result.reason);
      }
    });
  })();
  return indexed;
}
