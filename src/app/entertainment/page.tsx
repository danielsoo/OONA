import BrowseCatalogPage from "@/components/browse/BrowseCatalogPage";
import ShowCatalogPage from "@/components/show/ShowCatalogPage";
import { DEMO_MODE } from "@/lib/demoMode";

export default function EntertainmentPage() {
  if (DEMO_MODE) {
    return <ShowCatalogPage />;
  }
  return <BrowseCatalogPage section="entertainment" />;
}
