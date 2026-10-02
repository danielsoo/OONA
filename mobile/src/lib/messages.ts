import { apiFetch } from "~/lib/api";

/** Same endpoints as the website's DM and rooms UI (src/components/messages). */

export type ThreadSummary = {
  threadId: string;
  otherUid: string;
  otherHandle: string | null;
  otherDisplayName: string;
  otherAvatarUrl: string | null;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  lastSenderUid: string | null;
  unread: boolean;
};

export type RoomSummary = {
  roomId: string;
  name: string;
  memberIds: string[];
  memberPreview: { uid: string; displayName: string; avatarUrl: string | null }[];
  lastMessagePreview: string;
  lastMessageAt: string | null;
  lastSenderUid: string | null;
  unread: boolean;
};

export type ChatMessage = {
  id: string;
  senderUid: string;
  text: string;
  createdAt: string | null;
  reactions?: Record<string, string>;
  replyToMessageId?: string;
  replyToSenderUid?: string;
  replyToText?: string;
};

export type ChatMember = { uid: string; handle: string | null; displayName: string; avatarUrl: string | null };

export type ThreadDetail = {
  threadId: string;
  otherUid: string;
  otherHandle: string | null;
  otherDisplayName: string;
  otherAvatarUrl: string | null;
  messages: ChatMessage[];
};

export type RoomDetail = { roomId: string; name: string; createdBy: string; members: ChatMember[]; messages: ChatMessage[] };

export type ReplyTarget = { messageId: string; senderUid: string; text: string };

export async function loadInbox(): Promise<{ threads: ThreadSummary[]; rooms: RoomSummary[] }> {
  const [threads, rooms] = await Promise.all([
    apiFetch<{ threads?: ThreadSummary[] }>("/api/me/dm/threads", { auth: "required" }),
    apiFetch<{ rooms?: RoomSummary[] }>("/api/me/rooms", { auth: "required" }),
  ]);
  return { threads: threads.threads ?? [], rooms: rooms.rooms ?? [] };
}

export function loadThread(threadId: string): Promise<ThreadDetail> {
  return apiFetch(`/api/me/dm/threads/${encodeURIComponent(threadId)}/messages?limit=100`, { auth: "required" });
}

export function loadRoom(roomId: string): Promise<RoomDetail> {
  return apiFetch(`/api/me/rooms/${encodeURIComponent(roomId)}/messages?limit=100`, { auth: "required" });
}

export function sendThreadMessage(threadId: string, text: string, replyTo?: ReplyTarget, otherUidHint?: string) {
  return apiFetch(`/api/me/dm/threads/${encodeURIComponent(threadId)}/messages`, {
    method: "POST",
    auth: "required",
    json: { text, replyTo, otherUidHint },
  });
}

export function sendRoomMessage(roomId: string, text: string, replyTo?: ReplyTarget) {
  return apiFetch(`/api/me/rooms/${encodeURIComponent(roomId)}/messages`, {
    method: "POST",
    auth: "required",
    json: { text, replyTo },
  });
}

/** Opens (or creates) the 1:1 thread with a user. */
export async function openThreadWith(targetUid: string): Promise<string> {
  const data = await apiFetch<{ threadId: string }>("/api/me/dm/threads", {
    method: "POST",
    auth: "required",
    json: { targetUid },
  });
  return data.threadId;
}

export function createRoom(name: string, memberUids: string[]) {
  return apiFetch<{ roomId: string }>("/api/me/rooms", { method: "POST", auth: "required", json: { name, memberUids } });
}

export function leaveRoom(roomId: string) {
  return apiFetch(`/api/me/rooms/${encodeURIComponent(roomId)}/leave`, { method: "POST", auth: "required" });
}

export type ConversationRef = { kind: "thread"; id: string } | { kind: "room"; id: string };

function messagePath(conv: ConversationRef, messageId: string): string {
  const base = conv.kind === "thread" ? `/api/me/dm/threads/${encodeURIComponent(conv.id)}` : `/api/me/rooms/${encodeURIComponent(conv.id)}`;
  return `${base}/messages/${encodeURIComponent(messageId)}`;
}

/** Toggles the viewer's reaction (one per person); same emoji set as the website. */
export function reactToMessage(conv: ConversationRef, messageId: string, emoji: string) {
  return apiFetch(`${messagePath(conv, messageId)}/react`, { method: "POST", auth: "required", json: { emoji } });
}

export function deleteMessage(conv: ConversationRef, messageId: string) {
  return apiFetch(messagePath(conv, messageId), { method: "DELETE", auth: "required" });
}
