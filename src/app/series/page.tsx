import BrowseCatalogPage from "@/components/browse/BrowseCatalogPage";
import SeriesCatalogPage from "@/components/series/SeriesCatalogPage";
import { DEMO_MODE } from "@/lib/demoMode";

export default function SeriesPage() {
  if (DEMO_MODE) {
    return <SeriesCatalogPage />;
  }
  return <BrowseCatalogPage section="series" />;
}
