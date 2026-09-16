import { NextResponse } from "next/server";
import { timestampToIso } from "@/lib/collab-invite-pure";
import { jsonError, requireUser } from "@/lib/server/api-auth";
import { listNotificationsForUser } from "@/lib/server/notifications";
import { getDbOrNull } from "@/lib/server/works";
import { parseUserProfileDoc } from "@/lib/userAccess";
import { peopleProfileHref } from "@/lib/dm/peopleProfileHref";
import type { NotificationDoc, NotificationListItem } from "@/types/notification";

function targetPath(n: NotificationDoc & { id: string }, actorHandle: string | null): string {
  switch (n.type) {
    case "work_approve":
    case "work_reject":
      return "/uploader/works";
    case "new_follower":
      return peopleProfileHref(actorHandle, n.actorUid) ?? "/messages";
    case "new_dm_message":
      return n.threadId ? `/messages/${n.threadId}` : "/messages";
    case "new_room_message":
      return n.roomId ? `/messages/rooms/${n.roomId}` : "/messages?tab=groups";
    case "business_invite_accepted":
      return n.threadId ? `/messages/${n.threadId}` : "/messages?tab=invites";
    case "business_invite_received":
    case "business_invite_declined":
      return "/messages?tab=invites";
    default:
      return "/messages";
  }
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") ?? 20), 50);
  const rows = await listNotificationsForUser(db, auth.session.uid, limit);

  const actorUids = Array.from(
    new Set(rows.flatMap((notification) => notification.actorUid ? [notification.actorUid] : []))
  );
  const actorSnapshots = actorUids.length > 0
    ? await db.getAll(...actorUids.map((uid) => db.collection("users").doc(uid)))
    : [];
  const actors = new Map(
    actorSnapshots.map((snap) => {
      const profile = snap.exists
        ? parseUserProfileDoc(snap.data() as Record<string, unknown>)
        : null;
      return [snap.id, profile] as const;
    })
  );

  const notifications: NotificationListItem[] = rows.map((n) => {
    let actorDisplayName: string | undefined;
    let actorAvatarUrl: string | null | undefined;
    let actorHandle: string | null = null;
    if (n.actorUid) {
      const profile = actors.get(n.actorUid) ?? null;
      actorDisplayName = profile?.displayName ?? "—";
      actorAvatarUrl = profile?.avatarUrl ?? null;
      actorHandle = profile?.handle ?? null;
    }
    return {
      ...n,
      createdAt: timestampToIso(n.createdAt),
      targetPath: targetPath(n, actorHandle),
      actorDisplayName,
      actorAvatarUrl,
    };
  });

  return NextResponse.json({ notifications });
}
