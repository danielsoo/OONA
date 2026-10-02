import { Stack, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { FlatList, RefreshControl, useWindowDimensions } from "react-native";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Loading, Message } from "~/components/ui";
import { WorkCard } from "~/components/WorkRail";
import { useAuth } from "~/lib/auth";
import { loadWatchlist } from "~/lib/discovery";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, space } from "~/theme";

/** My List (website /my-list, GET /api/me/watchlist). */
export default function MyListScreen() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { width } = useWindowDimensions();
  const list = useApi(user ? `watchlist:${user.uid}` : null, loadWatchlist);
  const cardWidth = (width - space(4) * 2 - space(3)) / 2;

  // Reload when coming back from a watch screen where the item was removed.
  useFocusEffect(useCallback(() => void list.refresh(), [list.refresh]));

  if (!user) return <SignInPrompt />;
  if (list.loading && !list.data) return <Loading />;
  if (list.error && !list.data) return <Message title={t("common.retry")} body={list.error.message} />;

  return (
    <>
      <Stack.Screen options={{ title: t("myList.title") }} />
      <FlatList
        style={{ backgroundColor: colors.bg }}
        data={list.data ?? []}
        numColumns={2}
        keyExtractor={(w) => `${w.ownerUid}:${w.workId}`}
        columnWrapperStyle={{ gap: space(3) }}
        contentContainerStyle={{ padding: space(4), gap: space(5) }}
        refreshControl={<RefreshControl refreshing={list.loading} onRefresh={list.refresh} tintColor={colors.ink2} />}
        ListEmptyComponent={<Message title={t("myList.empty")} />}
        renderItem={({ item }) => (
          <WorkCard
            width={cardWidth}
            item={{ key: item.workId, ownerUid: item.ownerUid, workId: item.workId, title: item.title, subtitle: item.director, thumbnailUrl: item.thumbnailUrl }}
          />
        )}
      />
    </>
  );
}
