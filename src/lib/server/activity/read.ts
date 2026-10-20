import { ObjectId, type Db, type Filter } from "mongodb";
import {
  activityCategory,
  type ActivityCategory,
  type ActivityData,
  type ActivityEventView,
  type ActivityType,
} from "@/lib/activity/events";
import {
  EVENT_KINDS,
  eventCollection,
  sessionsCollection,
  visitorsCollection,
  type AnyEventDoc,
  type EventKind,
} from "@/lib/server/activity/collections";

/**
 * Reading the activity log for the admin console: newest first, across the
 * kinds' collections (or just one kind's), for everyone, one person, one
 * browser, or signed in or not.
 */

export type ActivityFilter = {
  uid?: string;
  visitorId?: string;
  signedIn?: boolean;
  category?: ActivityCategory;
};

const KIND_OF_CATEGORY: Record<ActivityCategory, EventKind> = {
  pages: "page_views",
  clicks: "clicks",
  search: "searches",
  watching: "video_events",
  account: "auth_events",
};

/** A page's place in the log: the last event's time and id. */
function parseCursor(cursor: string | null): { at: Date; id: ObjectId } | null {
  const [ms, id] = (cursor ?? "").split("_");
  if (!ms || !id || !ObjectId.isValid(id) || !Number.isFinite(Number(ms))) return null;
  return { at: new Date(Number(ms)), id: new ObjectId(id) };
}

const cursorOf = (doc: AnyEventDoc) => `${doc.at.getTime()}_${doc._id!.toHexString()}`;

/** Newest first, ties broken by id, the same in every collection, so pages can be merged. */
const newer = (a: AnyEventDoc, b: AnyEventDoc) => b.at.getTime() - a.at.getTime() || b._id!.toHexString().localeCompare(a._id!.toHexString());

function typeOf(kind: EventKind, doc: AnyEventDoc): ActivityType {
  if (kind === "page_views") return "page_view";
  if (kind === "clicks") return "click";
  if (kind === "searches") return "search";
  const action = (doc as { action?: string }).action ?? "";
  return (kind === "video_events" ? `video_${action}` : action) as ActivityType;
}

/** An event's own fields (what's not who, when or where), for the console. */
function dataOf(doc: AnyEventDoc): ActivityData {
  const skip = new Set(["_id", "at", "uid", "signedIn", "visitorId", "sessionId", "path", "area", "action"]);
  return Object.fromEntries(
    Object.entries(doc).filter(([key, value]) => !skip.has(key) && ["string", "number", "boolean"].includes(typeof value))
  ) as ActivityData;
}

export async function listActivity(
  db: Db,
  filter: ActivityFilter,
  cursor: string | null,
  limit: number
): Promise<{ events: Omit<ActivityEventView, "actor">[]; nextCursor: string | null }> {
  const match: Filter<AnyEventDoc> = {};
  if (filter.uid) match.uid = filter.uid;
  else if (filter.visitorId) match.visitorId = filter.visitorId;
  else if (filter.signedIn !== undefined) match.signedIn = filter.signedIn;
  const after = parseCursor(cursor);
  if (after) match.$or = [{ at: { $lt: after.at } }, { at: after.at, _id: { $lt: after.id } }];

  const kinds = filter.category ? [KIND_OF_CATEGORY[filter.category]] : [...EVENT_KINDS];
  const pages = await Promise.all(
    kinds.map(async (kind) => {
      const docs = await eventCollection(db, kind).find(match).sort({ at: -1, _id: -1 }).limit(limit + 1).toArray();
      return docs.map((doc) => ({ kind, doc }));
    })
  );
  const merged = pages.flat().sort((a, b) => newer(a.doc, b.doc));
  const page = merged.slice(0, limit);

  // Each visit's device and place, from its session.
  const sessionIds = [...new Set(page.map(({ doc }) => doc.sessionId))];
  const sessions = new Map(
    (await sessionsCollection(db).find({ _id: { $in: sessionIds } }).toArray()).map((s) => [s._id, s])
  );

  const events = page.map(({ kind, doc }) => {
    const type = typeOf(kind, doc);
    const session = sessions.get(doc.sessionId);
    return {
      id: doc._id!.toHexString(),
      type,
      category: activityCategory(type),
      area: doc.area,
      at: doc.at.toISOString(),
      path: doc.path,
      data: dataOf(doc),
      uid: doc.uid,
      visitorId: doc.visitorId,
      sessionId: doc.sessionId,
      signedIn: doc.signedIn,
      device: session?.device ?? null,
      browser: session?.browser ?? null,
      os: session?.os ?? null,
      country: session?.country ?? null,
      city: session?.city ?? null,
    };
  });
  return { events, nextCursor: merged.length > limit ? cursorOf(page[page.length - 1]!.doc) : null };
}

/** Whether this browser has been seen (for finding a visitor by id). */
export async function visitorExists(db: Db, visitorId: string): Promise<boolean> {
  return (await visitorsCollection(db).countDocuments({ _id: visitorId }, { limit: 1 })) > 0;
}
