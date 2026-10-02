import { FlatList, RefreshControl, useWindowDimensions } from "react-native";
import { Loading, Message } from "~/components/ui";
import { WorkCard } from "~/components/WorkRail";
import { loadPromoShorts } from "~/lib/feeds";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, space } from "~/theme";

/** Discover: the promo shorts feed (website /discover, GET /api/feed/promo-shorts). */
export default function DiscoverScreen() {
  const { t } = useLocale();
  const { width } = useWindowDimensions();
  const feed = useApi("promo-shorts", loadPromoShorts);
  const cardWidth = (width - space(4) * 2 - space(3)) / 2;

  if (feed.loading && !feed.data) return <Loading />;
  if (feed.error && !feed.data) return <Message title={t("common.retry")} body={feed.error.message} />;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={feed.data ?? []}
      numColumns={2}
      keyExtractor={(item) => item.id}
      columnWrapperStyle={{ gap: space(3) }}
      contentContainerStyle={{ padding: space(4), gap: space(5) }}
      refreshControl={<RefreshControl refreshing={feed.loading} onRefresh={feed.refresh} tintColor={colors.ink2} />}
      renderItem={({ item }) => (
        <WorkCard
          width={cardWidth}
          item={{
            key: item.id,
            ownerUid: item.ownerUid,
            workId: item.workId,
            title: item.title,
            subtitle: item.director,
            thumbnailUrl: item.thumbnailUrl,
          }}
        />
      )}
    />
  );
}
