import { createHash } from "crypto";
import { after } from "next/server";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { isLocale, translate, type Locale } from "@/i18n";
import type { NotificationType } from "@/types/notification";

/**
 * Push notifications for the OONA mobile app (mobile/), sent through the Expo
 * push service. Tokens live in users/{uid}/pushTokens/{sha256(token)} and are
 * written only by the server (POST /api/me/push-tokens).
 *
 * Sending never throws and never delays the response: it runs after the
 * response is sent (next/server `after`), and a failed push only logs.
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;
const MAX_TOKENS_PER_USER = 10;

export type PushMessage = {
  title: string;
  body: string;
  /** In-app path the app opens when the push is tapped, e.g. /messages/abc. */
  path?: string;
};

function pushTokensCol(db: Firestore, uid: string) {
  return db.collection("users").doc(uid).collection("pushTokens");
}

function tokenDocId(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 40);
}

export function isExpoPushToken(token: unknown): token is string {
  return typeof token === "string" && token.length < 256 && EXPO_TOKEN_RE.test(token);
}

export async function savePushToken(db: Firestore, uid: string, token: string, platform: string): Promise<void> {
  await pushTokensCol(db, uid)
    .doc(tokenDocId(token))
    .set(
      { token, platform: platform.slice(0, 16), updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
}

export async function deletePushToken(db: Firestore, uid: string, token: string): Promise<void> {
  await pushTokensCol(db, uid).doc(tokenDocId(token)).delete();
}

async function sendNow(db: Firestore, uid: string, message: PushMessage): Promise<void> {
  const snap = await pushTokensCol(db, uid).orderBy("updatedAt", "desc").limit(MAX_TOKENS_PER_USER).get();
  const tokens = snap.docs.map((d) => String(d.data().token ?? "")).filter(isExpoPushToken);
  if (tokens.length === 0) return;

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(
      tokens.map((to) => ({
        to,
        title: message.title.slice(0, 120),
        body: message.body.slice(0, 240),
        sound: "default",
        data: message.path ? { path: message.path } : {},
      }))
    ),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    console.warn("[push] expo responded", res.status);
    return;
  }

  // Drop tokens of uninstalled apps so they are not retried forever.
  const body = (await res.json()) as { data?: { status?: string; details?: { error?: string } }[] };
  const stale = (body.data ?? [])
    .map((ticket, i) => (ticket.details?.error === "DeviceNotRegistered" ? tokens[i] : null))
    .filter((t): t is string => Boolean(t));
  await Promise.all(stale.map((t) => deletePushToken(db, uid, t)));
}

/** Runs `task` after the response is sent; outside a request (scripts, tests) it runs right away. */
function runAfterResponse(task: () => Promise<void>, label: string): void {
  const run = () =>
    task().catch((err) => {
      console.warn(`[push] ${label} failed`, err instanceof Error ? err.message : err);
    });
  try {
    after(run);
  } catch {
    void run();
  }
}

async function readName(db: Firestore, uid: string | undefined): Promise<{ name: string; locale: Locale }> {
  if (!uid) return { name: "", locale: "en" };
  const snap = await db.collection("users").doc(uid).get();
  const data = (snap.data() ?? {}) as { displayName?: unknown; locale?: unknown };
  return {
    name: typeof data.displayName === "string" ? data.displayName : "",
    locale: isLocale(data.locale) ? data.locale : "en",
  };
}

/** Push for an in-app notification, worded in the recipient's language with the website's copy. */
export function schedulePushForNotification(
  db: Firestore,
  input: {
    recipientUid: string;
    type: NotificationType;
    actorUid?: string;
    workId?: string;
    workTitle?: string;
    threadId?: string;
    roomId?: string;
    roomName?: string;
    messagePreview?: string;
  },
  path?: string
): void {
  const task = async () => {
    const [recipient, actor] = await Promise.all([readName(db, input.recipientUid), readName(db, input.actorUid)]);
    const body = translate(recipient.locale, `notifications.items.${input.type}`, {
      workTitle: input.workTitle ?? "",
      actorName: actor.name,
      preview: input.messagePreview ?? "",
      roomName: input.roomName ?? "",
    });
    await sendNow(db, input.recipientUid, { title: "OONA", body, path });
  };
  runAfterResponse(task, "notification push");
}

/** Push for a new chat message (1:1 or group). */
export function schedulePushForMessage(
  db: Firestore,
  recipientUids: string[],
  senderUid: string,
  text: string,
  target: { threadId: string } | { roomId: string; roomName: string }
): void {
  const task = async () => {
    const sender = await readName(db, senderUid);
    const preview = text.slice(0, 120);
    const isRoom = "roomId" in target;
    const message: PushMessage = isRoom
      ? { title: target.roomName, body: `${sender.name}: ${preview}`, path: `/messages/rooms/${target.roomId}` }
      : { title: sender.name || "OONA", body: preview, path: `/messages/${target.threadId}` };
    await Promise.all(recipientUids.map((uid) => sendNow(db, uid, message)));
  };
  runAfterResponse(task, "message push");
}
