import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/server/api-auth";
import { requireCompleteMemberProfile } from "@/lib/server/member-access";
import {
  FieldValue,
  getDbOrNull,
  parsePrologueDoc,
  parsePromoDoc,
  parseWorkDoc,
  prologueRef,
  promoRef,
  worksCol,
} from "@/lib/server/works";
import { hasCompleteVideoStaging } from "@/lib/works/work-staging-ready";
import { requireSchoolUploadEligibility } from "@/lib/server/school-verification";

type Params = { params: Promise<{ workId: string }> };

/** Stream 인코딩 완료 후 본편·쇼츠 심사 큐(pending)로 전환 */
export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const { workId } = await params;

  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  const profileBlock = await requireCompleteMemberProfile(db, session.uid);
  if (profileBlock) return profileBlock;

  const workRef = worksCol(db, session.uid).doc(workId);
  const workSnap = await workRef.get();
  if (!workSnap.exists) return jsonError("not_found", "작품을 찾을 수 없습니다.", 404);

  const work = parseWorkDoc(workId, workSnap.data() as Record<string, unknown>);
  const schoolBlock = await requireSchoolUploadEligibility(db, session.uid, work.proposedSchoolId);
  if (schoolBlock) return schoolBlock;
  if (work.platformStatus !== "draft") {
    return jsonError("invalid_state", "초안 상태에서만 심사 제출할 수 있습니다.", 400);
  }
  if (work.streamStatus !== "ready") {
    return jsonError("not_ready", "본편 인코딩이 끝난 후 제출할 수 있습니다.", 400);
  }
  if (!work.streamUid) {
    return jsonError("not_ready", "본편 영상이 없습니다.", 400);
  }
  if (!work.title?.trim()) {
    return jsonError("title_required", "작품 제목을 입력하세요.", 400);
  }

  const promoRefDoc = promoRef(db, session.uid, workId);
  const promoSnap = await promoRefDoc.get();
  if (!promoSnap.exists) {
    return jsonError("not_found", "홍보 쇼츠를 먼저 저장하세요.", 404);
  }

  const promo = parsePromoDoc(promoSnap.data() as Record<string, unknown>);
  if (promo.platformStatus !== "draft" && promo.platformStatus !== "rejected") {
    return jsonError("invalid_state", "제출할 수 없는 쇼츠 상태입니다.", 400);
  }
  if (promo.streamStatus !== "ready") {
    return jsonError("not_ready", "쇼츠 인코딩이 끝난 후 제출할 수 있습니다.", 400);
  }
  if (!promo.thumbnailUrl) {
    return jsonError("thumbnail_required", "홍보 썸네일을 저장하세요.", 400);
  }
  if (!promo.title?.trim()) {
    return jsonError("title_required", "쇼츠 제목을 입력하세요.", 400);
  }

  await workRef.update({
    platformStatus: "pending",
    updatedAt: FieldValue.serverTimestamp(),
  });

  await promoRefDoc.update({
    platformStatus: "pending",
    submittedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    rejectReason: FieldValue.delete(),
  });

  const prologueRefDoc = prologueRef(db, session.uid, workId);
  const prologueSnap = await prologueRefDoc.get();
  if (prologueSnap.exists) {
    const prologue = parsePrologueDoc(prologueSnap.data() as Record<string, unknown>);
    if (
      prologue.platformStatus === "draft" ||
      prologue.platformStatus === "rejected"
    ) {
      if (prologue.streamStatus !== "ready") {
        return jsonError("not_ready", "프롤로그 인코딩이 끝난 후 제출할 수 있습니다.", 400);
      }
      await prologueRefDoc.update({
        platformStatus: "pending",
        submittedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        rejectReason: FieldValue.delete(),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    platformStatus: "pending",
    hadStaging: hasCompleteVideoStaging(work.videoStaging),
  });
}
