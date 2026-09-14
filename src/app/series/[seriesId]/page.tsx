import { redirect } from "next/navigation";
import SeriesDetailPage from "@/components/series/SeriesDetailPage";
import { DEMO_MODE } from "@/lib/demoMode";

type Props = { params: Promise<{ seriesId: string }> };

/** Series detail pages are built from showcase fixtures, so they only exist in demo mode. */
export default async function SeriesPage({ params }: Props) {
  if (!DEMO_MODE) redirect("/series");
  const { seriesId } = await params;
  return <SeriesDetailPage seriesId={seriesId} />;
}
