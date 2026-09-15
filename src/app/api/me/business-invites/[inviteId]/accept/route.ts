import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/server/api-auth";
import { acceptBusinessInvite } from "@/lib/server/business-invites";
import { getDbOrNull } from "@/lib/server/works";

type Params = { params: Promise<{ inviteId: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  const { inviteId } = await params;
  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  const result = await acceptBusinessInvite(db, inviteId, auth.session.uid);
  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : result.code === "forbidden" ? 403 : 400;
    return jsonError(result.code, "제안을 수락하지 못했습니다.", status);
  }

  return NextResponse.json({ ok: true, threadId: result.threadId, projectId: result.projectId });
}
