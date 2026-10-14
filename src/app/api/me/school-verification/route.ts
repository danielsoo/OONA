import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/server/api-auth";
import { getDbOrNull } from "@/lib/server/works";
import { getSchoolVerificationStatus, leaveSchool, sendSchoolCode, verifySchoolCode, SchoolVerificationError } from "@/lib/server/school-verification";
import { isLocale, translate } from "@/i18n";
import { validSchoolId } from "@/lib/school-verification";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const db = await getDbOrNull();
  if (!db) return jsonError("school_mail_unavailable", "School verification is unavailable.", 503);
  const schoolId = new URL(request.url).searchParams.get("schoolId") || undefined;
  if (schoolId && !validSchoolId(schoolId)) return jsonError("school_unavailable", "Invalid school.", 400);
  try {
    return NextResponse.json(await getSchoolVerificationStatus(db, auth.session.uid, schoolId), { headers: { "Cache-Control": "private, no-store" } });
  } catch { return jsonError("school_mail_unavailable", "School verification is unavailable.", 503); }
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const db = await getDbOrNull();
  if (!db) return jsonError("school_mail_unavailable", "School verification is unavailable.", 503);
  let input: Record<string, unknown>;
  try { const raw = await request.json(); if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw Error(); input = raw; }
  catch { return jsonError("invalid_json", "Invalid request.", 400); }
  const locale = isLocale(input.locale) ? input.locale : "en";
  try {
    if (input.action === "leave") { await leaveSchool(db, auth.session.uid); return NextResponse.json({ ok: true }); }
    if (!validSchoolId(input.schoolId)) throw new SchoolVerificationError("school_unavailable");
    if (input.action === "send") return NextResponse.json(await sendSchoolCode(db, auth.session.uid, { schoolId: input.schoolId, email: input.email, enrolled: input.enrolled, graduationMonth: input.graduationMonth, locale }));
    if (input.action === "verify") return NextResponse.json(await verifySchoolCode(db, auth.session.uid, input.schoolId, input.code));
    return jsonError("invalid_body", "Invalid action.", 400);
  } catch (error) {
    if (error instanceof SchoolVerificationError) return jsonError(error.code, translate(locale, `schoolVerification.${error.code}`), error.status);
    return jsonError("school_mail_unavailable", translate(locale, "schoolVerification.school_mail_unavailable"), 503);
  }
}
