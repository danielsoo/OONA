import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server/api-auth";
import {
  computeSchoolStats,
  fetchSchool,
  fetchSchoolWorksFeed,
  sortByPublishedAtDesc,
  sortByViewCountDesc,
  toClientSafeCatalogItem,
  toClientSafeSchool,
} from "@/lib/server/school-feeds";
import { pickSchoolRepresentativeWork } from "@/lib/server/school-representative";
import { getDbOrNull } from "@/lib/server/works";

type Params = { params: Promise<{ schoolId: string }> };

/**
 * School profile data for the mobile app: the same payload the website's
 * server-rendered /school/[schoolId] page builds.
 */
export async function GET(_request: Request, { params }: Params) {
  const { schoolId } = await params;
  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  const school = await fetchSchool(db, schoolId);
  if (!school) return jsonError("not_found", "학교를 찾을 수 없습니다.", 404);
  if (school.status === "merged" && school.mergedIntoSlug) {
    return NextResponse.json({ redirectTo: school.mergedIntoSlug });
  }

  const items = await fetchSchoolWorksFeed(db, schoolId, 60);
  const representative = pickSchoolRepresentativeWork(items);

  return NextResponse.json(
    {
      school: toClientSafeSchool(school),
      stats: computeSchoolStats(items),
      representative: representative ? toClientSafeCatalogItem(representative) : null,
      latest: sortByPublishedAtDesc(items).slice(0, 12).map(toClientSafeCatalogItem),
      mostViewed: sortByViewCountDesc(items).slice(0, 12).map(toClientSafeCatalogItem),
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
