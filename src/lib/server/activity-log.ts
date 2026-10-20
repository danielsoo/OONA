import { FieldValue, Timestamp, type Firestore, type Query } from "firebase-admin/firestore";
import { getAdminAuth } from "@/lib/server/firebase-admin";
import {
  activityArea,
  activityCategory,
  type ActivityCategory,
  type ActivityData,
  type ActivityEventView,
  type ActivityType,
} from "@/lib/activity/events";

/**
 * The activity log's store: one `activityEvents` doc per thing someone did
 * (lib/activity/events.ts), and one `activityVisitors` doc per browser,
 * which says whose account it signed into. Written and read only here, with
 * the Admin SDK (firestore.rules lets no client near either), and kept for a
 * year (a TTL on `expiresAt`, firestore.indexes.json).
 */

export const ACTIVITY_EVENTS = "activityEvents";
export const ACTIVITY_VISITORS = "activityVisitors";
const RETENTION_MS = 365 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** A device clock within this of the server's is taken as right. */
const CLOCK_TOLERANCE_MS = 2 * 60 * 1000;

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

/**
 * Stores a batch from one browser. `at` is when each happened: by the
 * browser's clock, which is right on nearly every device, even when a batch
 * sent from a page being left arrives late. A clock that's minutes off (the
 * batch's `sentAt` against the server's) is set right by the difference.
 */
export async function recordActivity(
  db: Firestore,
  source: ActivitySource,
  events: ActivityToStore[],
  sentAt: number
): Promise<number> {
  if (events.length === 0) return 0;
  const now = Date.now();
  const expiresAt = Timestamp.fromMillis(now + RETENTION_MS);
  const visitorRef = db.collection(ACTIVITY_VISITORS).doc(source.visitorId);
  const visitor = await visitorRef.get();
  const linkedUid = (visitor.data()?.uid as string | undefined) ?? null;

  const skew = Number.isFinite(sentAt) ? now - sentAt : 0;
  const offset = Math.abs(skew) < CLOCK_TOLERANCE_MS ? 0 : skew;
  const batch = db.batch();
  for (const event of events) {
    const when = Math.min(now, Math.max(now - DAY_MS, event.at + offset));
    batch.set(db.collection(ACTIVITY_EVENTS).doc(), {
      type: event.type,
      category: activityCategory(event.type),
      area: activityArea(event.path),
      path: event.path,
      data: event.data,
      uid: source.uid,
      signedIn: source.uid !== null,
      visitorId: source.visitorId,
      sessionId: source.sessionId,
      device: source.device,
      browser: source.browser,
      os: source.os,
      country: source.country,
      region: source.region,
      city: source.city,
      at: Timestamp.fromMillis(when),
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    });
  }
  const last = events[events.length - 1]!;
  batch.set(
    visitorRef,
    {
      visitorId: source.visitorId,
      ...(visitor.exists ? {} : { firstSeenAt: FieldValue.serverTimestamp() }),
      lastSeenAt: FieldValue.serverTimestamp(),
      lastPath: last.path,
      events: FieldValue.increment(events.length),
      device: source.device,
      browser: source.browser,
      os: source.os,
      country: source.country,
      city: source.city,
      ...(source.uid ? { uid: source.uid, lastSignedInAt: FieldValue.serverTimestamp() } : {}),
      expiresAt,
    },
    { merge: true }
  );
  await batch.commit();

  // The first time this browser is seen signed in to an account, what it did
  // before signing in becomes that person's too.
  if (source.uid && source.uid !== linkedUid) await claimVisitorHistory(db, source.visitorId, source.uid);
  return events.length;
}

async function claimVisitorHistory(db: Firestore, visitorId: string, uid: string) {
  const snap = await db
    .collection(ACTIVITY_EVENTS)
    .where("visitorId", "==", visitorId)
    .where("uid", "==", null)
    .limit(450)
    .get();
  if (snap.empty) return;
  const batch = db.batch();
  for (const doc of snap.docs) batch.update(doc.ref, { uid, beforeSignIn: true });
  await batch.commit();
}

export type ActivityFilter = {
  uid?: string;
  visitorId?: string;
  signedIn?: boolean;
  category?: ActivityCategory;
};

export class ActivityIndexPendingError extends Error {}

/** A page of the log, newest first; `cursor` is the last event id of the page before. */
export async function listActivity(
  db: Firestore,
  filter: ActivityFilter,
  cursor: string | null,
  limit: number
): Promise<{ events: ActivityEventView[]; nextCursor: string | null }> {
  let query: Query = db.collection(ACTIVITY_EVENTS);
  if (filter.uid) query = query.where("uid", "==", filter.uid);
  else if (filter.visitorId) query = query.where("visitorId", "==", filter.visitorId);
  else if (filter.signedIn !== undefined) query = query.where("signedIn", "==", filter.signedIn);
  if (filter.category) query = query.where("category", "==", filter.category);
  query = query.orderBy("at", "desc");
  if (cursor) {
    const after = await db.collection(ACTIVITY_EVENTS).doc(cursor).get();
    if (after.exists) query = query.startAfter(after);
  }

  let snap;
  try {
    snap = await query.limit(limit + 1).get();
  } catch (error) {
    // A new filter's index is still being built after a deploy.
    const code = (error as { code?: number | string }).code;
    if (code === 9 || code === "failed-precondition" || /requires an index/i.test(String(error))) {
      throw new ActivityIndexPendingError();
    }
    throw error;
  }

  const docs = snap.docs.slice(0, limit);
  const uids = [...new Set(docs.map((d) => d.get("uid") as string | null).filter((u): u is string => !!u))];
  const people = new Map<string, ActivityEventView["actor"]>();
  if (uids.length > 0) {
    const users = await db.getAll(...uids.map((uid) => db.collection("users").doc(uid)));
    for (const user of users) {
      const data = user.data() ?? {};
      const handle = typeof data.handle === "string" && data.handle ? data.handle : null;
      const email = typeof data.email === "string" && data.email ? data.email : null;
      const name = (typeof data.displayName === "string" && data.displayName) || handle || email || user.id;
      if (user.exists) people.set(user.id, { name, handle, email });
    }
    // Signed in but never finished signing up: no profile yet, only the account.
    const missing = uids.filter((uid) => !people.has(uid));
    const auth = missing.length > 0 ? getAdminAuth() : null;
    if (auth) {
      const found = await auth.getUsers(missing.map((uid) => ({ uid }))).catch(() => null);
      for (const account of found?.users ?? []) {
        people.set(account.uid, { name: account.displayName || account.email || account.uid, handle: null, email: account.email ?? null });
      }
    }
  }

  const events = docs.map((doc): ActivityEventView => {
    const d = doc.data();
    const uid = (d.uid as string | null) ?? null;
    const at = d.at as Timestamp | undefined;
    return {
      id: doc.id,
      type: d.type as ActivityType,
      category: d.category as ActivityCategory,
      area: d.area,
      at: (at ?? Timestamp.now()).toDate().toISOString(),
      path: d.path ?? "/",
      data: { ...(d.data ?? {}), ...(d.beforeSignIn ? { beforeSignIn: true } : {}) },
      uid,
      visitorId: d.visitorId,
      sessionId: d.sessionId,
      signedIn: d.signedIn === true,
      device: d.device ?? null,
      browser: d.browser ?? null,
      os: d.os ?? null,
      country: d.country ?? null,
      city: d.city ?? null,
      actor: uid ? people.get(uid) ?? null : null,
    };
  });
  return { events, nextCursor: snap.docs.length > limit ? docs[docs.length - 1]!.id : null };
}

/**
 * Who an admin typed into the log's search: an account (by uid, @handle or
 * email) or a browser (by visitor id).
 */
export async function resolveActivityActor(
  db: Firestore,
  text: string
): Promise<{ uid: string; name: string } | { visitorId: string } | null> {
  const who = text.trim();
  if (!who) return null;
  const users = db.collection("users");
  const named = (id: string, data: Record<string, unknown> | undefined) => ({
    uid: id,
    name: (typeof data?.displayName === "string" && data.displayName) || (typeof data?.handle === "string" && data.handle) || id,
  });
  if (/^[A-Za-z0-9_-]{8,128}$/.test(who)) {
    const byId = await users.doc(who).get();
    if (byId.exists) return named(byId.id, byId.data());
    const visitor = await db.collection(ACTIVITY_VISITORS).doc(who).get();
    if (visitor.exists) return { visitorId: who };
  }
  const handle = who.replace(/^@/, "");
  const byHandle = await users.where("handle", "==", handle).limit(1).get();
  if (!byHandle.empty) return named(byHandle.docs[0]!.id, byHandle.docs[0]!.data());
  for (const email of new Set([who, who.toLowerCase()])) {
    const byEmail = await users.where("email", "==", email).limit(1).get();
    if (!byEmail.empty) return named(byEmail.docs[0]!.id, byEmail.docs[0]!.data());
  }
  // An account that hasn't finished signing up has no profile to find it by.
  const auth = getAdminAuth();
  if (auth) {
    const account = await (who.includes("@") ? auth.getUserByEmail(who.toLowerCase()) : auth.getUser(who)).catch(() => null);
    if (account) return { uid: account.uid, name: account.displayName || account.email || account.uid };
  }
  return null;
}
