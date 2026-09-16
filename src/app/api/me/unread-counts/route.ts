import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/server/api-auth";
import { countUnreadThreadsForUser } from "@/lib/server/dm";
import { countUnreadNotificationsForUser } from "@/lib/server/notifications";
import { countUnreadRoomsForUser } from "@/lib/server/rooms";
import { getDbOrNull } from "@/lib/server/works";

/** One authenticated round trip for every global unread badge. */
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  const [notifications, directMessages, rooms] = await Promise.all([
    countUnreadNotificationsForUser(db, auth.session.uid),
    countUnreadThreadsForUser(db, auth.session.uid),
    countUnreadRoomsForUser(db, auth.session.uid),
  ]);

  return NextResponse.json(
    {
      notifications,
      messages: directMessages + rooms,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
