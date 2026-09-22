import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/server/api-auth";
import {
  createCollabInvite,
  listCollabInvitesForWork,
} from "@/lib/server/collab-invites";
import { sendCollabInviteEmail } from "@/lib/server/collab-invite-email";
import { buildCollabInviteUrl } from "@/lib/collabInviteUrl";
import { getDbOrNull, worksCol } from "@/lib/server/works";
import { parseUserProfileDoc } from "@/lib/userAccess";
import { isWorkCreditRole } from "@/lib/server/credits";
import type { CollabInviteCreateInput } from "@/types/collab-invite";
import type { WorkCreditRole } from "@/types/credits";

type Params = { params: Promise<{ workId: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  const { workId } = await params;
  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  const ownerUid = auth.session.uid;
  const workSnap = await worksCol(db, ownerUid).doc(workId).get();
  if (!workSnap.exists) return jsonError("not_found", "작품을 찾을 수 없습니다.", 404);

  const invites = await listCollabInvitesForWork(db, ownerUid, workId);
  return NextResponse.json({ invites });
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  const { workId } = await params;
  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  const ownerUid = auth.session.uid;
  const workSnap = await worksCol(db, ownerUid).doc(workId).get();
  if (!workSnap.exists) return jsonError("not_found", "작품을 찾을 수 없습니다.", 404);

  let body: {
    email?: string;
    role?: string;
    message?: string;
    locale?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("invalid_json", "요청 형식(JSON)이 올바르지 않습니다.", 400);
  }

  const roleRaw = String(body.role ?? "").trim();
  if (!isWorkCreditRole(roleRaw)) {
    return jsonError("invite_role_invalid", "유효하지 않은 역할입니다.", 400);
  }

  const input: CollabInviteCreateInput = {
    email: String(body.email ?? ""),
    role: roleRaw as WorkCreditRole,
    message: body.message,
  };

  const ownerSnap = await db.collection("users").doc(ownerUid).get();
  const ownerProfile = ownerSnap.exists
    ? parseUserProfileDoc(ownerSnap.data() as Record<string, unknown>)
    : null;
  const inviterDisplayName =
    ownerProfile?.displayName || ownerProfile?.defaultDirectorName || auth.session.email || "";

  const sessionEmail = auth.session.email?.trim().toLowerCase();
  if (sessionEmail && sessionEmail === input.email.trim().toLowerCase()) {
    return jsonError("invite_self", "본인 이메일로는 초대할 수 없습니다.", 400);
  }

  const created = await createCollabInvite(db, {
    ownerUid,
    workId,
    inviterUid: ownerUid,
    inviterDisplayName,
    input,
  });

  if (!created.ok) {
    const messages: Record<string, string> = {
      invite_email_invalid: "유효한 이메일을 입력해 주세요.",
      invite_role_invalid: "유효하지 않은 역할입니다.",
      invite_self: "본인 이메일로는 초대할 수 없습니다.",
      invite_duplicate_pending: "이미 해당 이메일·역할로 대기 중인 초대가 있습니다.",
      work_not_found: "작품을 찾을 수 없습니다.",
    };
    return jsonError(
      created.error,
      messages[created.error] ?? "초대를 생성하지 못했습니다.",
      400
    );
  }

  const locale = body.locale === "ja" ? "ja" : body.locale === "en" ? "en" : "ko";
  const emailResult = await sendCollabInviteEmail(created.invite, { locale });
  const inviteUrl = buildCollabInviteUrl(
    created.invite.token,
    process.env.NEXT_PUBLIC_APP_URL?.trim()
  );

  return NextResponse.json({
    invite: created.invite,
    inviteUrl,
    emailSent: emailResult.sent,
    ...(emailResult.sent
      ? {}
      : {
          emailFallbackUrl: emailResult.inviteUrl,
          emailSendReason: emailResult.reason,
          ...(emailResult.hint ? { emailErrorHint: emailResult.hint } : {}),
        }),
  });
}
