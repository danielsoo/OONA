import { useCallback } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { HeroCard } from "~/components/HeroCard";
import { CreatorsRail, ShortsRail } from "~/components/HomeExtras";
import { Loading, Message } from "~/components/ui";
import { WorkRail } from "~/components/WorkRail";
import { toRailItem } from "~/lib/catalog";
import { useAuth } from "~/lib/auth";
import { discoverPeople } from "~/lib/discovery";
import { loadCatalog, loadContinueWatching, loadPromoShorts } from "~/lib/feeds";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, space } from "~/theme";

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
  // Secondary rails: failures just hide the row.
  const shorts = useApi(`promo-shorts:${user?.uid ?? "guest"}`, loadPromoShorts);
  const creators = useApi("home-creators", () => discoverPeople({}));

  const refresh = useCallback(() => {
    void catalog.refresh();
    void continueWatching.refresh();
    void shorts.refresh();
    void creators.refresh();
  }, [catalog, continueWatching, shorts, creators]);

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
      {trending[0] ? (
        <View style={{ marginBottom: space(7) }}>
          <HeroCard item={trending[0]} label={ui("Trending on OONA")} />
        </View>
      ) : null}
      <WorkRail
        title={ui("Continue Watching")}
        items={(continueWatching.data ?? []).map((item) => ({
          ...toRailItem(item),
          progressPercent: item.progressPercent,
        }))}
      />
      <WorkRail title={ui("Trending on OONA")} items={trending.slice(1).map(toRailItem)} />
      <ShortsRail title={t("nav.discover")} items={shorts.data ?? []} />
      {(["movies", "series", "entertainment"] as const).map((section) => (
        <WorkRail
          key={section}
          title={t(`nav.${section}`)}
          items={data[section].map(toRailItem)}
          seeAll={{ label: ui("View all"), onPress: () => router.push(`/section/${section}`) }}
        />
      ))}
      <CreatorsRail
        title={t("society.title")}
        people={creators.data ?? []}
        seeAllLabel={ui("View all")}
        onSeeAll={() => router.push("/society")}
      />
    </ScrollView>
  );
}
