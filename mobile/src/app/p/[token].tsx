import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import type { PortfolioWorkItem, PublicPortfolioPayload } from "@/types/portfolio";
import { Button, Loading, Message } from "~/components/ui";
import { ApiError, apiFetch } from "~/lib/api";
import { API_BASE_URL } from "~/lib/config";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

/**
 * Shared portfolio link (website /p/[token], GET /api/portfolio/{token}).
 * Opens from the https link too, so recipients without an account can watch.
 */
export default function PortfolioScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { t } = useLocale();
  const data = useApi(`portfolio:${token}`, () => apiFetch<PublicPortfolioPayload>(`/api/portfolio/${encodeURIComponent(token)}`));
  const [playing, setPlaying] = useState<PortfolioWorkItem | null>(null);
  const player = useVideoPlayer(null);

  useEffect(() => {
    if (!playing?.playbackUrl) return;
    void player.replaceAsync(playing.playbackUrl).then(() => player.play());
  }, [playing, player]);

  if (data.loading && !data.data) return <Loading />;
  if (!data.data) {
    const status = data.error instanceof ApiError ? data.error.status : 0;
    return <Message title={t(status === 410 ? "portfolio.public.expired" : status === 404 ? "portfolio.public.notFound" : "portfolio.public.loadError")} />;
  }
  const { profile, shareTitle, works } = data.data;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(12) }}>
      <Stack.Screen options={{ title: t("portfolio.public.badge") }} />
      <View style={styles.card}>
        <Text style={styles.badge}>{t("portfolio.public.badge")}</Text>
        {shareTitle ? <Text style={styles.meta}>{shareTitle}</Text> : null}
        <Text style={styles.name} onPress={() => router.push(`/people/${profile.handle}`)}>
          {profile.displayName}
        </Text>
        <Text style={styles.meta}>@{profile.handle}</Text>
        {profile.headline ? <Text style={styles.body}>{profile.headline}</Text> : null}
        {profile.bio ? <Text style={[styles.body, { color: colors.ink2 }]}>{profile.bio}</Text> : null}
        <Button
          variant="secondary"
          label={t("portfolio.public.copyShareLink")}
          onPress={() => void Share.share({ url: `${API_BASE_URL}/p/${token}`, message: `${API_BASE_URL}/p/${token}` })}
          style={{ marginTop: space(2) }}
        />
      </View>

      {works.length === 0 ? <Text style={styles.meta}>{t("portfolio.public.empty")}</Text> : null}
      {works.map((w) => {
        const active = playing?.workId === w.workId && playing.ownerUid === w.ownerUid;
        return (
          <View key={`${w.ownerUid}_${w.workId}`} style={{ gap: space(2) }}>
            <Pressable
              onPress={() => w.playbackUrl && setPlaying(w)}
              disabled={!w.playbackUrl}
              accessibilityRole="button"
              accessibilityLabel={w.title}
              style={styles.media}
            >
              {active ? (
                <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls fullscreenOptions={{ enable: true }} />
              ) : (
                <>
                  {w.thumbnailUrl ? <Image source={{ uri: w.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                  <View style={styles.play}>
                    <Ionicons name="play" size={28} color={colors.ink} />
                  </View>
                </>
              )}
            </Pressable>
            <Text style={styles.title}>{w.title}</Text>
            <Text style={styles.meta}>
              {[w.role, w.characterName, w.director].filter(Boolean).join(" · ")}
            </Text>
            {!w.playbackUrl ? <Text style={styles.meta}>{t("portfolio.public.noPlayback")}</Text> : null}
            {w.description ? <Text style={[styles.body, { color: colors.ink2 }]}>{w.description}</Text> : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { padding: space(4), borderRadius: radius.card, backgroundColor: colors.surface, gap: space(1) },
  badge: { ...type.small, color: colors.accentHover, letterSpacing: 0.5 },
  name: { ...type.h2, color: colors.ink, marginTop: space(2) },
  title: { ...type.h3, color: colors.ink },
  body: { ...type.body, color: colors.ink },
  meta: { ...type.small, color: colors.ink3 },
  media: { aspectRatio: 16 / 9, borderRadius: radius.card, overflow: "hidden", backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  play: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
});
