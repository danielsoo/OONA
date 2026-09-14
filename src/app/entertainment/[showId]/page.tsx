import { redirect } from "next/navigation";
import SeriesDetailPage from "@/components/series/SeriesDetailPage";
import { DEMO_MODE } from "@/lib/demoMode";

type Props = { params: Promise<{ showId: string }> };

/** Show pages are built from showcase fixtures, so they only exist in demo mode. */
export default async function ShowPage({ params }: Props) {
  if (!DEMO_MODE) redirect("/entertainment");
  const { showId } = await params;
  return <SeriesDetailPage seriesId={showId} variant="show" />;
}
