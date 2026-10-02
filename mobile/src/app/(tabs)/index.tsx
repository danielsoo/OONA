import { useCallback } from "react";
import { RefreshControl, ScrollView } from "react-native";
import type { CatalogFeedItem } from "@/types/work";
import { Loading, Message } from "~/components/ui";
import { WorkRail, type RailItem } from "~/components/WorkRail";
import { useAuth } from "~/lib/auth";
import { loadCatalog, loadContinueWatching } from "~/lib/feeds";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, space } from "~/theme";

function toRailItem(item: CatalogFeedItem): RailItem {
  return {
    key: `${item.ownerUid}:${item.workId}`,
    ownerUid: item.ownerUid,
    workId: item.workId,
    title: item.title,
    subtitle: item.director,
    thumbnailUrl: item.thumbnailUrl,
  };
}

/** Home: the website's catalog rails (src/components/home/CinematicHomePage.tsx). */
export default function HomeScreen() {
  const { t, ui } = useLocale();
  const { user } = useAuth();

  const catalog = useApi("catalog", async () => {
    const [movies, series, entertainment] = await Promise.all([
      loadCatalog("movies"),
      loadCatalog("series"),
      loadCatalog("entertainment"),
    ]);
    return { movies, series, entertainment };
  });
  const continueWatching = useApi(user ? `continue:${user.uid}` : null, loadContinueWatching);

  const refresh = useCallback(() => {
    void catalog.refresh();
    void continueWatching.refresh();
  }, [catalog, continueWatching]);

  if (catalog.loading && !catalog.data) return <Loading />;
  if (catalog.error && !catalog.data) {
    return <Message title={t("common.retry")} body={catalog.error.message} />;
  }

  const data = catalog.data ?? { movies: [], series: [], entertainment: [] };
  const trending = [...data.movies, ...data.series, ...data.entertainment]
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, 12);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: space(4), paddingBottom: space(10) }}
      refreshControl={<RefreshControl refreshing={catalog.loading} onRefresh={refresh} tintColor={colors.ink2} />}
    >
      <WorkRail
        title={ui("Continue Watching")}
        items={(continueWatching.data ?? []).map((item) => ({
          ...toRailItem(item),
          progressPercent: item.progressPercent,
        }))}
      />
      <WorkRail title={ui("Trending on OONA")} items={trending.map(toRailItem)} />
      <WorkRail title={t("nav.movies")} items={data.movies.map(toRailItem)} />
      <WorkRail title={t("nav.series")} items={data.series.map(toRailItem)} />
      <WorkRail title={t("nav.entertainment")} items={data.entertainment.map(toRailItem)} />
    </ScrollView>
  );
}
