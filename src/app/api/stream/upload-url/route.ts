import { NextResponse } from "next/server";
import { MAX_STREAM_UPLOAD_BYTES } from "@/lib/cloudflare/stream";
import { hasDepositVerifiedClaim } from "@/lib/server/deposit-verification";
import { isUploaderDepositEnabled } from "@/lib/payments/config";
import { jsonError, requireUser } from "@/lib/server/api-auth";
import { requireCompleteMemberProfile } from "@/lib/server/member-access";
import { parseUserProfileDoc } from "@/lib/userAccess";
import {
  FieldValue,
  getDbOrNull,
  nextWorkSortOrder,
  worksCol,
} from "@/lib/server/works";
import { defaultAspectRatioForSection, isVideoAspectRatio } from "@/lib/works/aspect-ratio";
import { isWorkSection } from "@/lib/works/constants";
import {
  creditDisplayNameMapKey,
  resolveWorkCreditDisplayName,
} from "@/lib/credit-display-name";
import {
  ensureOwnerDirectorCredit,
  validateCreditInputs,
  writeWorkCredits,
} from "@/lib/server/credits";
import { parseUploadLength } from "@/lib/server/parse-upload-length";
import { normalizeContentCategory, normalizeTags } from "@/lib/works/label-utils";
import { getSchoolById } from "@/lib/server/schools";
import { requireSchoolUploadEligibility } from "@/lib/server/school-verification";
import { validSchoolId } from "@/lib/school-verification";
import type { WorkCreditInput } from "@/types/credits";
import type { PrologueDraft, PromoDraft, VideoAspectRatio } from "@/types/work";

/** 작품 메타만 생성 — 영상은 Storage 스테이징 후 제출 전 확인에서 심사 제출 시 Stream 업로드 */
export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const db = await getDbOrNull();
  if (!db) {
    return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);
  }
  const profileBlock = await requireCompleteMemberProfile(db, session.uid);
  if (profileBlock) return profileBlock;

  if (isUploaderDepositEnabled()) {
    const verified = await hasDepositVerifiedClaim(session.uid);
    if (!verified) {
      return jsonError("deposit_required", "업로더 보증금 결제가 완료되지 않았습니다.", 403);
    }
  }

  let body: {
    title?: string;
    section?: string;
    category?: string;
    contentCategory?: string;
    tags?: string[];
    description?: string;
    director?: string;
    aspectRatio?: string;
    uploadLength?: number | string;
    schoolId?: string;
    schoolName?: string;
    promoDraft?: {
      title?: string;
      description?: string;
    };
    prologueDraft?: {
      title?: string;
      description?: string;
    };
    credits?: WorkCreditInput[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("invalid_json", "요청 형식(JSON)이 올바르지 않습니다.", 400);
  }

  const uploadLength = parseUploadLength(body.uploadLength);
  if (uploadLength == null || uploadLength <= 0) {
    return jsonError("invalid_body", "파일 크기(uploadLength)가 필요합니다.", 400);
  }
  if (uploadLength > MAX_STREAM_UPLOAD_BYTES) {
    return jsonError("invalid_body", "파일이 너무 큽니다. (최대 30GB)", 400);
  }

  const sectionRaw = (body.section ?? body.category)?.trim() ?? "movies";
  if (!isWorkSection(sectionRaw)) {
    return jsonError("invalid_section", "유효하지 않은 노출 섹션입니다.", 400);
  }

  const proposedCategory = body.contentCategory
    ? normalizeContentCategory(body.contentCategory)
    : "";
  const proposedTags = normalizeTags(Array.isArray(body.tags) ? body.tags : []);

  const aspectRaw = body.aspectRatio?.trim();
  let proposedAspectRatio: VideoAspectRatio;
  if (aspectRaw && isVideoAspectRatio(aspectRaw)) {
    proposedAspectRatio = aspectRaw;
  } else if (aspectRaw) {
    return jsonError("invalid_aspect_ratio", "유효하지 않은 화면 비율입니다.", 400);
  } else {
    proposedAspectRatio = defaultAspectRatioForSection(sectionRaw);
  }

  const title = String(body.title ?? "").trim().slice(0, 200);
  if (!title) {
    return jsonError("title_required", "작품 제목을 입력해 주세요.", 400);
  }

  const description = body.description?.trim() ?? "";
  if (!description) {
    return jsonError("description_required", "작품 소개를 입력해 주세요.", 400);
  }

  const promoRaw = body.promoDraft;
  if (!promoRaw || typeof promoRaw !== "object") {
    return jsonError("promo_required", "홍보 쇼츠 정보가 필요합니다.", 400);
  }
  const promoTitle = String(promoRaw.title ?? "").trim().slice(0, 200);
  if (!promoTitle) {
    return jsonError("promo_required", "쇼츠 제목을 입력해 주세요.", 400);
  }
  const promoDraft: PromoDraft = {
    title: promoTitle,
    description: promoRaw.description?.trim() || null,
  };

  let prologueDraft: PrologueDraft | undefined;
  const prologueRaw = body.prologueDraft;
  if (prologueRaw && typeof prologueRaw === "object") {
    const pTitle = String(prologueRaw.title ?? "").trim().slice(0, 200);
    prologueDraft = {
      title: pTitle || undefined,
      description: prologueRaw.description?.trim() || null,
    };
  }

  const workId = crypto.randomUUID();

  if (body.schoolId != null && body.schoolId !== "" && !validSchoolId(body.schoolId)) return jsonError("school_unavailable", "학교를 다시 선택해 주세요.", 400);
  const schoolIdRaw = body.schoolId?.trim();
  let proposedSchoolId: string | null = null;
  let proposedSchoolName: string | null = null;
  if (schoolIdRaw) {
    const schoolBlock = await requireSchoolUploadEligibility(db, session.uid, schoolIdRaw);
    if (schoolBlock) return schoolBlock;
    const school = await getSchoolById(db, schoolIdRaw);
    if (school) {
      proposedSchoolId = school.id;
      proposedSchoolName = school.name;
    }
  }

  try {
    const userSnap = await db.collection("users").doc(session.uid).get();
    const profile = userSnap.exists
      ? parseUserProfileDoc(userSnap.data() as Record<string, unknown>)
      : null;
    const directorFromBody = body.director?.trim().slice(0, 120) || "";
    const director =
      directorFromBody || profile?.defaultDirectorName?.trim().slice(0, 120) || null;

    const sortOrder = await nextWorkSortOrder(db, session.uid);
    const ownerCreditName = profile
      ? resolveWorkCreditDisplayName(
          {
            displayName: profile.displayName,
            defaultDirectorName: profile.defaultDirectorName,
            handle: profile.handle,
          },
          "director"
        ) || director || "Creator"
      : director || "Creator";

    await worksCol(db, session.uid).doc(workId).set({
      kind: "full",
      section: sectionRaw,
      title,
      description,
      director,
      proposedCategory: proposedCategory || null,
      proposedTags: proposedTags.length > 0 ? proposedTags : null,
      proposedAspectRatio,
      proposedSchoolId,
      proposedSchoolName,
      promoDraft,
      ...(prologueDraft ? { prologueDraft } : {}),
      platformStatus: "draft",
      streamStatus: "staged",
      sortOrder,
      ownerUid: session.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const creditInputs = Array.isArray(body.credits) ? body.credits : [];
    const withDirector: WorkCreditInput[] = [
      { userId: session.uid, role: "director", sortOrder: 0 },
      ...creditInputs.filter((c) => !(c.userId === session.uid && c.role === "director")),
    ];
    const validated = validateCreditInputs(withDirector, session.uid);
    const creditWork = {
      title,
      section: sectionRaw,
      platformStatus: "draft" as const,
    };
    if (validated.ok && validated.credits.length > 0) {
      const names = new Map<string, string>([
        [creditDisplayNameMapKey(session.uid, "director"), ownerCreditName],
      ]);
      for (const c of validated.credits) {
        const key = creditDisplayNameMapKey(c.userId, c.role);
        if (names.has(key)) continue;
        const u = await db.collection("users").doc(c.userId).get();
        if (u.exists) {
          const p = parseUserProfileDoc(u.data() as Record<string, unknown>);
          names.set(
            key,
            resolveWorkCreditDisplayName(
              {
                displayName: p.displayName,
                defaultDirectorName: p.defaultDirectorName,
                handle: p.handle,
              },
              c.role
            )
          );
        }
      }
      await writeWorkCredits(db, session.uid, workId, creditWork, validated.credits, names);
    } else {
      await ensureOwnerDirectorCredit(
        db,
        session.uid,
        workId,
        { ...creditWork, director: director ?? undefined },
        ownerCreditName
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[upload-url] Firestore:", msg);
    return jsonError(
      "firestore_write_failed",
      msg || "Firestore에 저장하지 못했습니다.",
      500,
      "FIREBASE_SERVICE_ACCOUNT_JSON, Firestore DB 이름(xiio), 보안 규칙을 확인하세요."
    );
  }

  return NextResponse.json({ workId, staged: true });
}
