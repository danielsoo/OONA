import BrowseCatalogPage from "@/components/browse/BrowseCatalogPage";
import CategoryMockPage from "@/components/category/CategoryMockPage";
import { DEMO_MODE } from "@/lib/demoMode";

export default function MoviesPage() {
  if (DEMO_MODE) {
    return <CategoryMockPage variant="films" />;
  }
  return <BrowseCatalogPage section="movies" />;
}
