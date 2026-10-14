import { NextResponse } from "next/server";
import { requireSchoolUploadEligibility } from "@/lib/server/school-verification";
import { jsonError, requireUser } from "@/lib/server/api-auth";
import { FieldValue, getDbOrNull, parseWorkDoc, worksCol } from "@/lib/server/works";

type Params = { params: Promise<{ workId: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const { workId } = await params;

  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  const ref = worksCol(db, session.uid).doc(workId);
  const snap = await ref.get();
  if (!snap.exists) return jsonError("not_found", "작품을 찾을 수 없습니다.", 404);

  const work = parseWorkDoc(workId, snap.data() as Record<string, unknown>);
  if (work.platformStatus !== "published") {
    return jsonError("invalid_state", "게시된 작품만 수정 심사를 요청할 수 있습니다.", 400);
  }

  const rev = work.pendingRevision;
  if (!rev || (rev.platformStatus !== "draft" && rev.platformStatus !== "rejected")) {
    return jsonError("invalid_state", "저장된 수정 내용이 없습니다.", 400);
  }

  if (rev.streamUid && rev.streamStatus !== "ready") {
    return jsonError("not_ready", "새 영상 인코딩이 끝난 후 제출할 수 있습니다.", 400);
  }
  if (rev.streamUid) {
    const schoolBlock = await requireSchoolUploadEligibility(db, session.uid, work.approvedSchoolId);
    if (schoolBlock) return schoolBlock;
  }

  const { rejectReason: _ignored, rejectReasonCode: _code, ...revRest } = rev;
  await ref.update({
    pendingRevision: {
      ...revRest,
      platformStatus: "pending",
      submittedAt: FieldValue.serverTimestamp(),
    },
    revisionReviewStatus: "pending",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, revisionReviewStatus: "pending" });
}
