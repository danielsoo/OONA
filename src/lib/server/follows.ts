import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { buildNotificationPayload, notificationsCol } from "@/lib/server/notifications";
import { schedulePushForNotification } from "@/lib/server/push";

export function followDocId(followerUid: string, followingUid: string): string {
  return `${followerUid}_${followingUid}`;
}

export function followsCol(db: Firestore) {
  return db.collection("follows");
}

export async function isFollowing(
  db: Firestore,
  followerUid: string,
  followingUid: string
): Promise<boolean> {
  const snap = await followsCol(db).doc(followDocId(followerUid, followingUid)).get();
  return snap.exists;
}

export async function followUser(
  db: Firestore,
  followerUid: string,
  followingUid: string
): Promise<{ ok: true } | { ok: false; code: string }> {
  if (followerUid === followingUid) return { ok: false, code: "self_follow" };
  const target = await db.collection("users").doc(followingUid).get();
  if (!target.exists) return { ok: false, code: "user_not_found" };

  const ref = followsCol(db).doc(followDocId(followerUid, followingUid));
  const existing = await ref.get();
  if (existing.exists) return { ok: true };

  const batch = db.batch();
  batch.set(ref, {
    followerUid,
    followingUid,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(
    db.collection("users").doc(followingUid),
    { followerCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  batch.set(
    db.collection("users").doc(followerUid),
    { followingCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  batch.set(
    notificationsCol(db).doc(),
    buildNotificationPayload({ recipientUid: followingUid, type: "new_follower", actorUid: followerUid })
  );
  await batch.commit();
  schedulePushForNotification(db, { recipientUid: followingUid, type: "new_follower", actorUid: followerUid }, "/notifications");
  return { ok: true };
}

export async function unfollowUser(
  db: Firestore,
  followerUid: string,
  followingUid: string
): Promise<void> {
  const ref = followsCol(db).doc(followDocId(followerUid, followingUid));
  const snap = await ref.get();
  if (!snap.exists) return;

  const batch = db.batch();
  batch.delete(ref);
  batch.set(
    db.collection("users").doc(followingUid),
    { followerCount: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  batch.set(
    db.collection("users").doc(followerUid),
    { followingCount: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  await batch.commit();
}

export async function listFollowingUids(
  db: Firestore,
  followerUid: string,
  limit = 200
): Promise<string[]> {
  const snap = await followsCol(db)
    .where("followerUid", "==", followerUid)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => String(d.data().followingUid ?? ""));
}
