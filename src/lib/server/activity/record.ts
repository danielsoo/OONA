import type { Db } from "mongodb";
import { activityArea, type ActivityData, type ActivityType } from "@/lib/activity/events";
import {
  EVENT_KINDS,
  ensureActivityIndexes,
  eventCollection,
  kindOf,
  sessionsCollection,
  visitorsCollection,
  type AnyEventDoc,
  type AuthAction,
  type AuthEventDoc,
  type ClickDoc,
  type EventBase,
  type EventKind,
  type PageViewDoc,
  type SearchDoc,
  type VideoAction,
  type VideoEventDoc,
} from "@/lib/server/activity/collections";

/** Who a batch is from, and on what (the intake reads it from the request). */
export type ActivitySource = {
  uid: string | null;
  visitorId: string;
  sessionId: string;
  device: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
};

export type ActivityToStore = { type: ActivityType; at: number; path: string; data: ActivityData };

const DAY_MS = 24 * 60 * 60 * 1000;
/** A device clock within this of the server's is taken as right. */
const CLOCK_TOLERANCE_MS = 2 * 60 * 1000;

const text = (value: unknown) => (typeof value === "string" && value ? value : undefined);
const num = (value: unknown) => (typeof value === "number" ? value : undefined);
const flag = (value: unknown) => (typeof value === "boolean" ? value : undefined);

/** Drops the fields an event doesn't have. */
function compact<T extends object>(doc: T): T {
  return Object.fromEntries(Object.entries(doc).filter(([, value]) => value !== undefined)) as T;
}

/** One event as its collection's document. */
function toDoc(event: ActivityToStore, base: EventBase): AnyEventDoc | null {
  const d = event.data;
  switch (kindOf(event.type)) {
    case "page_views":
      return compact<PageViewDoc>({ ...base, heading: text(d.heading), referrer: text(d.referrer) });
    case "clicks":
      return compact<ClickDoc>({ ...base, label: text(d.label), href: text(d.href), element: text(d.element), checked: flag(d.checked) });
    case "searches": {
      const query = text(d.query);
      return query ? compact<SearchDoc>({ ...base, query, box: text(d.box) }) : null;
    }
    case "video_events":
      return compact<VideoEventDoc>({
        ...base,
        action: event.type.slice("video_".length) as VideoAction,
        title: text(d.title),
        position: num(d.position),
        duration: num(d.duration),
        watched: num(d.watched),
        percent: num(d.percent),
        reason: text(d.reason),
      });
    case "auth_events":
      return compact<AuthEventDoc>({ ...base, action: event.type as AuthAction, method: text(d.method) });
  }
}

/**
 * Stores a batch from one browser tab: each event in its own kind's
 * collection, the tab's session (device and place) and the browser's
 * visitor record. `at` is the browser's clock, right on nearly every device
 * even when a batch sent from a page being left arrives late; a clock that's
 * minutes off (`sentAt` against the server's) is set right by the difference.
 */
export async function recordActivity(db: Db, source: ActivitySource, events: ActivityToStore[], sentAt: number): Promise<number> {
  if (events.length === 0) return 0;
  await ensureActivityIndexes(db);
  const now = Date.now();
  const skew = Number.isFinite(sentAt) ? now - sentAt : 0;
  const offset = Math.abs(skew) < CLOCK_TOLERANCE_MS ? 0 : skew;

  const byKind = new Map<EventKind, AnyEventDoc[]>();
  for (const event of events) {
    const at = new Date(Math.min(now, Math.max(now - DAY_MS, event.at + offset)));
    const doc = toDoc(event, {
      at,
      uid: source.uid,
      signedIn: source.uid !== null,
      visitorId: source.visitorId,
      sessionId: source.sessionId,
      path: event.path,
      area: activityArea(event.path),
    });
    if (doc) byKind.set(kindOf(event.type), [...(byKind.get(kindOf(event.type)) ?? []), doc]);
  }
  const stored = [...byKind.values()].reduce((sum, docs) => sum + docs.length, 0);
  const seenAt = new Date(now);

  // The events first: they're what matters, and nothing below can lose them.
  await Promise.all([...byKind].map(([kind, docs]) => eventCollection(db, kind).insertMany(docs)));

  const before = await visitorsCollection(db).findOne({ _id: source.visitorId }, { projection: { uid: 1 } });
  await Promise.all([
    retryOnRace(() =>
      sessionsCollection(db).updateOne(
        { _id: source.sessionId },
        {
          $setOnInsert: { visitorId: source.visitorId, startedAt: seenAt, landingPath: events[0]!.path, ...(source.uid ? {} : { uid: null }) },
          $set: {
            lastSeenAt: seenAt,
            device: source.device,
            browser: source.browser,
            os: source.os,
            country: source.country,
            region: source.region,
            city: source.city,
            ...(source.uid ? { uid: source.uid } : {}),
          },
          $inc: { events: stored },
        },
        { upsert: true }
      )
    ),
    retryOnRace(() =>
      visitorsCollection(db).updateOne(
        { _id: source.visitorId },
        {
          $setOnInsert: { firstSeenAt: seenAt, ...(source.uid ? {} : { uid: null }) },
          $set: { lastSeenAt: seenAt, ...(source.uid ? { uid: source.uid, lastSignedInAt: seenAt } : {}) },
          $inc: { events: stored },
        },
        { upsert: true }
      )
    ),
  ]);

  // The first time this browser is seen signed in to an account, what it did
  // before signing in becomes that person's too.
  if (source.uid && source.uid !== (before?.uid ?? null)) await claimVisitorHistory(db, source.visitorId, source.uid);
  return stored;
}

/**
 * Two batches from a new tab can both try to create its session (or
 * visitor) at once; the one that loses gets a duplicate key, and trying
 * again finds the document the other made.
 */
async function retryOnRace<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    return write();
  }
}

async function claimVisitorHistory(db: Db, visitorId: string, uid: string) {
  await Promise.all([
    ...EVENT_KINDS.map((kind) => eventCollection(db, kind).updateMany({ visitorId, uid: null }, { $set: { uid, beforeSignIn: true } })),
    sessionsCollection(db).updateMany({ visitorId, uid: null }, { $set: { uid } }),
  ]);
}
