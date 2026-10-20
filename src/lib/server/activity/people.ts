import type { Firestore } from "firebase-admin/firestore";
import type { ActivityEventView } from "@/lib/activity/events";
import { getAdminAuth } from "@/lib/server/firebase-admin";

/**
 * Who the people in the activity log are. Their profiles stay in Firestore
 * (users/{uid}); an account that never finished signing up has only its
 * Firebase Auth record.
 */

export type Actor = NonNullable<ActivityEventView["actor"]>;

/** Names for the accounts in a page of the log. */
export async function actorsOf(firestore: Firestore | null, uids: string[]): Promise<Map<string, Actor>> {
  const people = new Map<string, Actor>();
  const unique = [...new Set(uids)];
  if (unique.length === 0) return people;
  if (firestore) {
    const users = await firestore.getAll(...unique.map((uid) => firestore.collection("users").doc(uid)));
    for (const user of users) {
      if (!user.exists) continue;
      const data = user.data() ?? {};
      const handle = typeof data.handle === "string" && data.handle ? data.handle : null;
      const email = typeof data.email === "string" && data.email ? data.email : null;
      const name = (typeof data.displayName === "string" && data.displayName) || handle || email || user.id;
      people.set(user.id, { name, handle, email });
    }
  }
  const missing = unique.filter((uid) => !people.has(uid));
  const auth = missing.length > 0 ? getAdminAuth() : null;
  if (auth) {
    const found = await auth.getUsers(missing.map((uid) => ({ uid }))).catch(() => null);
    for (const account of found?.users ?? []) {
      people.set(account.uid, { name: account.displayName || account.email || account.uid, handle: null, email: account.email ?? null });
    }
  }
  return people;
}

/**
 * The account an admin typed into the log's search (a uid, @handle or
 * email), or null. A visitor id is looked up by the caller, in MongoDB.
 */
export async function findAccount(firestore: Firestore | null, text: string): Promise<{ uid: string; name: string } | null> {
  const who = text.trim();
  if (!who) return null;
  const named = (uid: string, data: Record<string, unknown> | undefined) => ({
    uid,
    name: (typeof data?.displayName === "string" && data.displayName) || (typeof data?.handle === "string" && data.handle) || uid,
  });
  if (firestore) {
    const users = firestore.collection("users");
    if (/^[A-Za-z0-9_-]{8,128}$/.test(who)) {
      const byId = await users.doc(who).get();
      if (byId.exists) return named(byId.id, byId.data());
    }
    const byHandle = await users.where("handle", "==", who.replace(/^@/, "")).limit(1).get();
    if (!byHandle.empty) return named(byHandle.docs[0]!.id, byHandle.docs[0]!.data());
    for (const email of new Set([who, who.toLowerCase()])) {
      const byEmail = await users.where("email", "==", email).limit(1).get();
      if (!byEmail.empty) return named(byEmail.docs[0]!.id, byEmail.docs[0]!.data());
    }
  }
  const auth = getAdminAuth();
  if (auth) {
    const account = await (who.includes("@") ? auth.getUserByEmail(who.toLowerCase()) : auth.getUser(who)).catch(() => null);
    if (account) return { uid: account.uid, name: account.displayName || account.email || account.uid };
  }
  return null;
}
