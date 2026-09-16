import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { adminTimestampToMillis } from "@/lib/admin/format-timestamp";
import { isBlocked } from "@/lib/server/blocks";
import { isAllowedReactionEmoji } from "@/lib/dm/messageReactions";
import type { SendMessageReplyTo } from "@/lib/server/dm";
import { MAX_ROOM_MEMBERS, type RoomDoc, type RoomMessageDoc } from "@/types/room";

const MAX_TEXT = 2000;
const MAX_NAME = 100;
const MAX_REPLY_TEXT = 160;

export function roomsCol(db: Firestore) {
  return db.collection("rooms");
}

export function roomMessagesCol(db: Firestore, roomId: string) {
  return roomsCol(db).doc(roomId).collection("messages");
}

export function parseRoomDoc(data: Record<string, unknown>): RoomDoc | null {
  const rawIds = data.memberIds;
  if (!Array.isArray(rawIds)) return null;
  const memberIds = Array.from(new Set(rawIds.map(String))).slice(0, MAX_ROOM_MEMBERS);
  if (memberIds.length < 2) return null;
  return {
    name: String(data.name ?? "").slice(0, MAX_NAME),
    memberIds,
    createdBy: String(data.createdBy ?? ""),
    lastMessageAt: data.lastMessageAt,
    lastMessagePreview: data.lastMessagePreview
      ? String(data.lastMessagePreview).slice(0, 200)
      : undefined,
    lastSenderUid: data.lastSenderUid ? String(data.lastSenderUid) : undefined,
    lastReadAt:
      data.lastReadAt && typeof data.lastReadAt === "object"
        ? (data.lastReadAt as Record<string, unknown>)
        : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function parseRoomMessage(id: string, data: Record<string, unknown>): RoomMessageDoc & { id: string } {
  return {
    id,
    senderUid: String(data.senderUid ?? ""),
    text: String(data.text ?? "").slice(0, MAX_TEXT),
    createdAt: data.createdAt,
    reactions:
      data.reactions && typeof data.reactions === "object"
        ? Object.fromEntries(
            Object.entries(data.reactions as Record<string, unknown>).map(([uid, emoji]) => [
              uid,
              String(emoji),
            ])
          )
        : undefined,
    replyToMessageId: data.replyToMessageId ? String(data.replyToMessageId) : undefined,
    replyToSenderUid: data.replyToSenderUid ? String(data.replyToSenderUid) : undefined,
    replyToText: data.replyToText ? String(data.replyToText) : undefined,
  };
}

/** 안읽음 여부 — 마지막 메시지 시각이 이 멤버의 마지막 열람 시각보다 나중이면 안읽음 */
export function isRoomUnread(room: RoomDoc, uid: string): boolean {
  const lastMessageMs = adminTimestampToMillis(room.lastMessageAt);
  if (lastMessageMs == null) return false;
  if (room.lastSenderUid === uid) return false;
  const readMs = adminTimestampToMillis(room.lastReadAt?.[uid]);
  return readMs == null || readMs < lastMessageMs;
}

/** 방 열람 시 호출 — 해당 멤버에 한해 마지막 열람 시각 갱신 */
export async function markRoomRead(db: Firestore, roomId: string, uid: string): Promise<void> {
  await roomsCol(db)
    .doc(roomId)
    .update({ [`lastReadAt.${uid}`]: FieldValue.serverTimestamp() });
}

export async function createRoom(
  db: Firestore,
  creatorUid: string,
  name: string,
  memberUids: string[]
): Promise<{ ok: true; roomId: string } | { ok: false; code: string }> {
  const trimmedName = name.trim().slice(0, MAX_NAME);
  if (!trimmedName) return { ok: false, code: "name_required" };

  const candidates = Array.from(new Set(memberUids.filter((uid) => uid && uid !== creatorUid)));
  const allowed: string[] = [];
  for (const uid of candidates) {
    if (!(await isBlocked(db, creatorUid, uid))) allowed.push(uid);
  }
  if (allowed.length === 0) return { ok: false, code: "members_required" };

  const memberIds = [creatorUid, ...allowed].slice(0, MAX_ROOM_MEMBERS);

  const doc: Record<string, unknown> = {
    name: trimmedName,
    memberIds,
    createdBy: creatorUid,
    lastMessageAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const ref = await roomsCol(db).add(doc);
  return { ok: true, roomId: ref.id };
}

export async function sendRoomMessage(
  db: Firestore,
  roomId: string,
  senderUid: string,
  text: string,
  replyTo?: SendMessageReplyTo
): Promise<{ ok: true; messageId: string } | { ok: false; code: string }> {
  const trimmed = text.trim().slice(0, MAX_TEXT);
  if (!trimmed) return { ok: false, code: "empty" };

  const roomRef = roomsCol(db).doc(roomId);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) return { ok: false, code: "room_not_found" };
  const room = parseRoomDoc(roomSnap.data() as Record<string, unknown>);
  if (!room) return { ok: false, code: "room_invalid" };
  if (!room.memberIds.includes(senderUid)) return { ok: false, code: "forbidden" };

  const msgRef = roomMessagesCol(db, roomId).doc();
  const batch = db.batch();
  const messageDoc: Record<string, unknown> = {
    senderUid,
    text: trimmed,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (replyTo?.messageId) {
    messageDoc.replyToMessageId = replyTo.messageId;
    messageDoc.replyToSenderUid = replyTo.senderUid;
    messageDoc.replyToText = replyTo.text.trim().slice(0, MAX_REPLY_TEXT);
  }
  batch.set(msgRef, messageDoc);
  batch.update(roomRef, {
    lastMessageAt: FieldValue.serverTimestamp(),
    lastMessagePreview: trimmed.slice(0, 120),
    lastSenderUid: senderUid,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { ok: true, messageId: msgRef.id };
}

export async function reactToRoomMessage(
  db: Firestore,
  roomId: string,
  messageId: string,
  uid: string,
  emoji: string
): Promise<{ ok: true; reactions: Record<string, string> } | { ok: false; code: string }> {
  if (!isAllowedReactionEmoji(emoji)) return { ok: false, code: "invalid_emoji" };

  const roomSnap = await roomsCol(db).doc(roomId).get();
  if (!roomSnap.exists) return { ok: false, code: "room_not_found" };
  const room = parseRoomDoc(roomSnap.data() as Record<string, unknown>);
  if (!room?.memberIds.includes(uid)) return { ok: false, code: "forbidden" };

  const msgRef = roomMessagesCol(db, roomId).doc(messageId);
  const msgSnap = await msgRef.get();
  if (!msgSnap.exists) return { ok: false, code: "message_not_found" };
  const existing = parseRoomMessage(messageId, msgSnap.data() as Record<string, unknown>);

  const reactions = { ...(existing.reactions ?? {}) };
  if (reactions[uid] === emoji) {
    delete reactions[uid];
  } else {
    reactions[uid] = emoji;
  }

  await msgRef.update({ reactions });
  return { ok: true, reactions };
}

export async function deleteRoomMessage(
  db: Firestore,
  roomId: string,
  messageId: string,
  uid: string
): Promise<{ ok: true } | { ok: false; code: string }> {
  const msgRef = roomMessagesCol(db, roomId).doc(messageId);
  const snap = await msgRef.get();
  if (!snap.exists) return { ok: false, code: "message_not_found" };
  const message = parseRoomMessage(messageId, snap.data() as Record<string, unknown>);
  if (message.senderUid !== uid) return { ok: false, code: "forbidden" };

  await msgRef.delete();
  return { ok: true };
}

export async function listRoomsForUser(db: Firestore, uid: string, limit = 40) {
  const snap = await roomsCol(db)
    .where("memberIds", "array-contains", uid)
    .orderBy("lastMessageAt", "desc")
    .limit(limit)
    .get();
  return snap.docs
    .map((d) => {
      const room = parseRoomDoc(d.data() as Record<string, unknown>);
      if (!room) return null;
      return { roomId: d.id, room };
    })
    .filter((row): row is { roomId: string; room: RoomDoc } => row !== null);
}

export async function countUnreadRoomsForUser(db: Firestore, uid: string): Promise<number> {
  const rows = await listRoomsForUser(db, uid);
  return rows.filter((row) => isRoomUnread(row.room, uid)).length;
}

export async function addRoomMembers(
  db: Firestore,
  roomId: string,
  actorUid: string,
  newUids: string[]
): Promise<{ ok: true } | { ok: false; code: string }> {
  const ref = roomsCol(db).doc(roomId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, code: "room_not_found" };
  const room = parseRoomDoc(snap.data() as Record<string, unknown>);
  if (!room) return { ok: false, code: "room_invalid" };
  if (!room.memberIds.includes(actorUid)) return { ok: false, code: "forbidden" };

  const candidates = Array.from(
    new Set(newUids.filter((uid) => uid && !room.memberIds.includes(uid)))
  );
  const allowed: string[] = [];
  for (const uid of candidates) {
    if (!(await isBlocked(db, actorUid, uid))) allowed.push(uid);
  }
  if (allowed.length === 0) return { ok: false, code: "members_required" };
  if (room.memberIds.length + allowed.length > MAX_ROOM_MEMBERS) {
    return { ok: false, code: "room_full" };
  }

  await ref.update({
    memberIds: FieldValue.arrayUnion(...allowed),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
}

export async function removeRoomMember(
  db: Firestore,
  roomId: string,
  actorUid: string,
  targetUid: string
): Promise<{ ok: true } | { ok: false; code: string }> {
  const ref = roomsCol(db).doc(roomId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, code: "room_not_found" };
  const room = parseRoomDoc(snap.data() as Record<string, unknown>);
  if (!room) return { ok: false, code: "room_invalid" };
  if (room.createdBy !== actorUid) return { ok: false, code: "forbidden" };
  if (!room.memberIds.includes(targetUid)) return { ok: false, code: "not_a_member" };

  await ref.update({
    memberIds: FieldValue.arrayRemove(targetUid),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
}

export async function leaveRoom(
  db: Firestore,
  roomId: string,
  uid: string
): Promise<{ ok: true } | { ok: false; code: string }> {
  const ref = roomsCol(db).doc(roomId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, code: "room_not_found" };
  const room = parseRoomDoc(snap.data() as Record<string, unknown>);
  if (!room) return { ok: false, code: "room_invalid" };
  if (!room.memberIds.includes(uid)) return { ok: false, code: "not_a_member" };

  await ref.update({
    memberIds: FieldValue.arrayRemove(uid),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
}
