import { notFound, redirect } from "next/navigation";
import DemoSchoolPage from "@/components/school/DemoSchoolPage";
import SchoolProfilePage from "@/components/school/SchoolProfilePage";
import { DEMO_HANDLE_PREFIX } from "@/lib/demo-flags";
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
import { schoolHeroBackground } from "@/lib/school-brand";
import { getDbOrNull } from "@/lib/server/works";

type Params = { params: Promise<{ schoolId: string }> };

export default async function SchoolPage({ params }: Params) {
  const { schoolId } = await params;
  // The demo's made-up schools are filled in the browser (lib/demo-api.ts).
  if (schoolId.startsWith(DEMO_HANDLE_PREFIX)) return <DemoSchoolPage schoolId={schoolId} />;
  const db = await getDbOrNull();
  if (!db) notFound();

  const school = await fetchSchool(db, schoolId);
  if (!school) notFound();
  if (school.status === "merged" && school.mergedIntoSlug) {
    redirect(`/school/${school.mergedIntoSlug}`);
  }

  const items = await fetchSchoolWorksFeed(db, schoolId, 60);
  const stats = computeSchoolStats(items);
  const representative = pickSchoolRepresentativeWork(items);
  const latest = sortByPublishedAtDesc(items).slice(0, 12);
  const mostViewed = sortByViewCountDesc(items).slice(0, 12);
  const heroPreset = schoolHeroBackground(schoolId);

  return (
    <SchoolProfilePage
      school={toClientSafeSchool(school)}
      stats={stats}
      latest={latest.map(toClientSafeCatalogItem)}
      mostViewed={mostViewed.map(toClientSafeCatalogItem)}
      representative={representative ? toClientSafeCatalogItem(representative) : null}
      heroPreset={heroPreset}
    />
  );
}
