"use client";

import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import SchoolProfilePage from "@/components/school/SchoolProfilePage";
import { schoolHeroBackground } from "@/lib/school-brand";
import type { SchoolListItem, SchoolStats } from "@/types/school";
import type { CatalogFeedItem } from "@/types/work";

type SchoolPayload = {
  school: SchoolListItem;
  stats: SchoolStats;
  latest: CatalogFeedItem[];
  mostViewed: CatalogFeedItem[];
  representative: CatalogFeedItem | null;
};

/**
 * A made-up school's page in the demo (/school/demo-…): the same page a real
 * school gets on the server, fed from /api/schools/<id>, which the demo
 * answers in the browser (lib/demo-api.ts). Outside the demo there is no
 * such school, so it's not found.
 */
export default function DemoSchoolPage({ schoolId }: { schoolId: string }) {
  const [page, setPage] = useState<SchoolPayload | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/schools/${encodeURIComponent(schoolId)}`)
      .then(async (res) => (res.ok ? ((await res.json()) as SchoolPayload) : null))
      .catch(() => null)
      .then((payload) => {
        if (!cancelled) setPage(payload?.school ? payload : null);
      });
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  if (page === null) notFound();
  if (!page) return <main className="min-h-screen" aria-busy="true" />;
  return <SchoolProfilePage {...page} heroPreset={schoolHeroBackground(schoolId)} />;
}
