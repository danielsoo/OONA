import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useIsFocused } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, type ViewToken } from "react-native";
import type { PromoFeedItem } from "@/types/work";
import { Loading, Message } from "~/components/ui";
import { apiFetch } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { loadPromoShorts } from "~/lib/feeds";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, space, type } from "~/theme";

/**
 * Discover: the promo shorts feed (website /discover, GET /api/feed/promo-shorts)
 * as a full-screen vertical pager. One player follows the visible short so
 * only one video decodes at a time.
 */
export default function DiscoverScreen() {
  const { t } = useLocale();
  const { user } = useAuth();
  const focused = useIsFocused();
  const feed = useApi(`promo-shorts:${user?.uid ?? "guest"}`, loadPromoShorts);
  const [height, setHeight] = useState(0);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const viewed = useRef(new Set<string>());
  const sessionId = useRef(`app-${Date.now()}`);

  const items = feed.data ?? [];
  const current: PromoFeedItem | undefined = items[index];

  const player = useVideoPlayer(null, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    if (!current?.videoUrl) return;
    void player.replaceAsync(current.videoUrl).then(() => focused && player.play());
    if (!viewed.current.has(current.id)) {
      viewed.current.add(current.id);
      void apiFetch("/api/engagement/view", {
        method: "POST",
        auth: "optional",
        json: { ownerUid: current.ownerUid, workId: current.workId, target: "promo", sessionId: sessionId.current },
      }).catch(() => {});
    }
  }, [current?.id, current?.videoUrl]); // eslint-disable-line react-hooks/exhaustive-deps -- reload only when the visible short changes

  useEffect(() => {
    if (focused) player.play();
    else player.pause();
  }, [focused, player]);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setIndex(first.index);
  }).current;

  const toggleLike = useCallback(
    async (item: PromoFeedItem) => {
      if (!user) {
        router.push("/login");
        return;
      }
      const next = !(liked[item.id] ?? item.likedByMe ?? false);
      setLiked((prev) => ({ ...prev, [item.id]: next }));
      try {
        await apiFetch("/api/engagement/like", { method: "POST", auth: "required", json: { ownerUid: item.ownerUid, workId: item.workId, liked: next } });
      } catch {
        setLiked((prev) => ({ ...prev, [item.id]: !next }));
      }
    },
    [user, liked]
  );

  if (feed.loading && !feed.data) return <Loading />;
  if (feed.error && !feed.data) return <Message title={t("common.retry")} body={feed.error.message} />;
  if (items.length === 0) return <Message title={t("search.noResults")} />;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
          renderItem={({ item, index: i }) => {
            const isLiked = liked[item.id] ?? item.likedByMe ?? false;
            return (
              <View style={{ height, justifyContent: "center" }}>
                {i === index ? (
                  <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
                ) : null}
                <View style={styles.overlay}>
                  <View style={{ flex: 1, gap: space(1) }}>
                    <Text style={styles.title} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.director ? <Text style={styles.meta}>{item.director}</Text> : null}
                    <Pressable onPress={() => router.push(`/watch/${item.ownerUid}/${item.workId}`)} style={styles.cta}>
                      <Text style={styles.ctaText}>{t("watch.playFilm")}</Text>
                    </Pressable>
                  </View>
                  <Pressable onPress={() => toggleLike(item)} style={styles.like} accessibilityRole="button" accessibilityState={{ selected: isLiked }}>
                    <Ionicons name={isLiked ? "heart" : "heart-outline"} size={30} color={isLiked ? colors.destructive : colors.ink} />
                    <Text style={styles.meta}>{(item.likeCount ?? 0) + (isLiked && !item.likedByMe ? 1 : !isLiked && item.likedByMe ? -1 : 0)}</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space(4),
    padding: space(4),
    paddingBottom: space(6),
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  title: { ...type.h3, color: colors.ink },
  meta: { ...type.small, color: colors.ink2 },
  cta: { alignSelf: "flex-start", marginTop: space(2), backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: space(4), paddingVertical: space(2) },
  ctaText: { ...type.small, color: "#ffffff", fontWeight: "600" },
  like: { alignItems: "center", gap: 2 },
});
