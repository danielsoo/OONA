import { NextResponse } from "next/server";
import { timestampToIso } from "@/lib/collab-invite-pure";
import { jsonError, requireUser } from "@/lib/server/api-auth";
import {
  createBusinessInvite,
  listReceivedBusinessInvites,
  listSentBusinessInvites,
} from "@/lib/server/business-invites";
import { getDbOrNull } from "@/lib/server/works";
import type { BusinessInviteCreateInput, BusinessInviteListItem } from "@/types/business-invite";

function toClientSafeInvite(invite: BusinessInviteListItem) {
  return {
    ...invite,
    expiresAt: timestampToIso(invite.expiresAt),
    respondedAt: timestampToIso(invite.respondedAt),
    createdAt: timestampToIso(invite.createdAt),
    updatedAt: timestampToIso(invite.updatedAt),
  };
}

function errorMessage(code: string): string {
  switch (code) {
    case "invite_self":
      return "본인에게는 보낼 수 없습니다.";
    case "invite_duplicate_pending":
      return "이미 대기 중인 제안이 있습니다.";
    case "blocked":
      return "차단된 사용자입니다.";
    case "target_required":
      return "대화 상대를 지정해 주세요.";
    case "direction_invalid":
      return "유효하지 않은 요청 유형입니다.";
    case "project_not_found":
      return "프로젝트를 찾을 수 없습니다.";
    case "project_forbidden":
      return "이 프로젝트에 초대할 권한이 없습니다.";
    default:
      return "제안을 보내지 못했습니다.";
  }
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  const box = new URL(request.url).searchParams.get("box") === "sent" ? "sent" : "received";
  const invites =
    box === "sent"
      ? await listSentBusinessInvites(db, auth.session.uid)
      : await listReceivedBusinessInvites(db, auth.session.uid);

  return NextResponse.json({ invites: invites.map(toClientSafeInvite) });
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  let body: BusinessInviteCreateInput;
  try {
    body = (await request.json()) as BusinessInviteCreateInput;
  } catch {
    return jsonError("invalid_json", "요청 형식(JSON)이 올바르지 않습니다.", 400);
  }

  const result = await createBusinessInvite(db, auth.session.uid, body);
  if (!result.ok) {
    return jsonError(result.code, errorMessage(result.code), 400);
  }
  return NextResponse.json({ ok: true, id: result.id });
}
