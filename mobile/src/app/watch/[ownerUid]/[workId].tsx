import { useEventListener } from "expo";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { guestPreviewLimitSeconds } from "@/lib/watch/guestPreview";
import type { PublicWorkWatch } from "@/types/watch";
import { Avatar, Button, Loading, Message } from "~/components/ui";
import { useAuth } from "~/lib/auth";
import { loadWatch, recordView, reportWatchProgress } from "~/lib/feeds";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

const PROGRESS_INTERVAL_SEC = 15;

function Player({ work }: { work: PublicWorkWatch }) {
  const { user } = useAuth();
  const { t } = useLocale();
  const [guestLimitReached, setGuestLimitReached] = useState(false);
  const lastReported = useRef(0);
  const viewRecorded = useRef(false);
  const sessionId = useRef(`app-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const player = useVideoPlayer(work.playbackUrl, (p) => {
    p.timeUpdateEventInterval = 1;
    p.play();
  });

  useEventListener(player, "playingChange", ({ isPlaying }) => {
    if (isPlaying && !viewRecorded.current) {
      viewRecorded.current = true;
      void recordView(work.ownerUid, work.workId, sessionId.current).catch(() => {});
    }
  });

  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    const duration = player.duration || work.durationSec || 0;
    // Guests watch the first quarter, same as the website (src/lib/watch/guestPreview.ts).
    if (!user && duration > 0 && currentTime >= guestPreviewLimitSeconds(duration)) {
      player.pause();
      setGuestLimitReached(true);
      return;
    }
    if (user && duration > 0 && Math.abs(currentTime - lastReported.current) >= PROGRESS_INTERVAL_SEC) {
      lastReported.current = currentTime;
      void reportWatchProgress(work.ownerUid, work.workId, Math.floor(currentTime), Math.floor(duration)).catch(() => {});
    }
  });

  useEffect(() => {
    if (user) setGuestLimitReached(false);
  }, [user]);

  return (
    <View style={styles.playerWrap}>
      <VideoView player={player} style={styles.player} fullscreenOptions={{ enable: true }} allowsPictureInPicture nativeControls />
      {guestLimitReached ? (
        <View style={styles.guestOverlay}>
          <Text style={[type.h3, { color: colors.ink, textAlign: "center" }]}>{t("watch.guestPreviewTitle")}</Text>
          <Button label={t("watch.guestPreviewLogin")} onPress={() => router.push("/login")} />
        </View>
      ) : null}
    </View>
  );
}

export default function WatchScreen() {
  const { ownerUid, workId } = useLocalSearchParams<{ ownerUid: string; workId: string }>();
  const { t } = useLocale();
  const watch = useApi(`watch:${ownerUid}:${workId}`, () => loadWatch(ownerUid, workId));

  if (watch.loading && !watch.data) return <Loading />;
  if (!watch.data) return <Message title={t("common.retry")} body={watch.error?.message} />;

  const work = watch.data;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: space(10) }}>
      <Stack.Screen options={{ title: work.title }} />
      {work.playbackUrl ? <Player work={work} /> : <View style={[styles.player, { backgroundColor: colors.card }]} />}

      <View style={styles.body}>
        <Text style={styles.title}>{work.title}</Text>
        {work.director ? <Text style={styles.meta}>{work.director}</Text> : null}
        {work.description ? <Text style={styles.description}>{work.description}</Text> : null}

        {work.credits.length > 0 ? (
          <View style={{ marginTop: space(6) }}>
            <Text style={styles.sectionTitle}>{t("watch.tabs.credits")}</Text>
            {work.credits.map((credit) => {
              const handle = credit.profileHref?.startsWith("/people/") ? credit.profileHref.slice("/people/".length) : null;
              return (
                <Pressable
                  key={credit.id}
                  disabled={!handle}
                  onPress={() => handle && router.push(`/people/${handle}`)}
                  style={({ pressed }) => [styles.creditRow, pressed && { opacity: 0.7 }]}
                >
                  <Avatar uri={credit.avatarUrl} name={credit.displayName} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.creditName}>{credit.displayName}</Text>
                    <Text style={styles.creditRole}>{credit.characterName || t(`watch.creditRole.${credit.role}`)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  playerWrap: { position: "relative" },
  player: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" },
  guestOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.78)",
    alignItems: "center",
    justifyContent: "center",
    gap: space(4),
    padding: space(6),
  },
  body: { padding: space(4) },
  title: { ...type.h1, color: colors.ink },
  meta: { ...type.small, color: colors.ink3, marginTop: space(1) },
  description: { ...type.body, color: colors.ink2, marginTop: space(4) },
  sectionTitle: { ...type.h3, color: colors.ink, marginBottom: space(2) },
  creditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    paddingVertical: space(2),
    borderRadius: radius.control,
  },
  creditName: { ...type.body, color: colors.ink, fontWeight: "500" },
  creditRole: { ...type.small, color: colors.ink3 },
});
