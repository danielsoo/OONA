import { NextResponse } from "next/server";
import { timestampToIso } from "@/lib/collab-invite-pure";
import { jsonError, requireUser } from "@/lib/server/api-auth";
import { cancelBusinessInvite, getBusinessInviteWithPortfolio } from "@/lib/server/business-invites";
import { getDbOrNull } from "@/lib/server/works";

type Params = { params: Promise<{ inviteId: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  const { inviteId } = await params;
  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  const result = await getBusinessInviteWithPortfolio(db, inviteId, auth.session.uid);
  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : result.code === "forbidden" ? 403 : 400;
    return jsonError(result.code, "제안을 찾을 수 없습니다.", status);
  }

  return NextResponse.json({
    invite: {
      ...result.invite,
      expiresAt: timestampToIso(result.invite.expiresAt),
      respondedAt: timestampToIso(result.invite.respondedAt),
      createdAt: timestampToIso(result.invite.createdAt),
      updatedAt: timestampToIso(result.invite.updatedAt),
    },
    portfolio: result.portfolio,
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  const { inviteId } = await params;
  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  const result = await cancelBusinessInvite(db, inviteId, auth.session.uid);
  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : result.code === "forbidden" ? 403 : 400;
    return jsonError(result.code, "보낸 제안을 취소하지 못했습니다.", status);
  }

  return NextResponse.json({ ok: true });
}
