import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/server/api-auth";
import { FEED_CACHE_HEADERS } from "@/lib/server/home-feeds";
import { fetchSchoolsRanking, toClientSafeSchool } from "@/lib/server/school-feeds";
import { getDbOrNull } from "@/lib/server/works";
import { getOrCreateSchool } from "@/lib/server/schools";
import type { SchoolGeoLocation } from "@/types/school";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const db = await getDbOrNull();
  if (!db) return NextResponse.json({ schools: [] }, { headers: FEED_CACHE_HEADERS });

  const schools = (await fetchSchoolsRanking(db, limit)).map(toClientSafeSchool);
  return NextResponse.json({ schools }, { headers: FEED_CACHE_HEADERS });
}

/** 업로드 시 학교 검색 결과에 없으면 자가등록 — pending 상태로 즉시 생성, 관리자가 비동기로 정리 */
export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  let body: { name?: string; location?: Partial<SchoolGeoLocation> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("invalid_json", "요청 형식이 올바르지 않습니다.", 400);
  }

  const name = body.name?.trim();
  if (!name) return jsonError("name_required", "학교 이름이 필요합니다.", 400);

  let location: SchoolGeoLocation | null = null;
  if (body.location) {
    const latitude = Number(body.location.latitude);
    const longitude = Number(body.location.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return jsonError("invalid_location", "학교 위치가 올바르지 않습니다.", 400);
    }
    location = {
      latitude,
      longitude,
      ...(body.location.city?.trim() ? { city: body.location.city.trim() } : {}),
      ...(body.location.country?.trim() ? { country: body.location.country.trim() } : {}),
      ...(body.location.countryCode?.trim()
        ? { countryCode: body.location.countryCode.trim().toUpperCase().slice(0, 2) }
        : {}),
      source:
        body.location.source === "verified" || body.location.source === "geocoded"
          ? body.location.source
          : "submitted",
    };
  }

  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  try {
    const school = await getOrCreateSchool(db, name, auth.session.uid, location);
    return NextResponse.json({ school });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "invalid_school_name") {
      return jsonError("invalid_school_name", "유효한 학교 이름이 아닙니다.", 400);
    }
    throw e;
  }
}
