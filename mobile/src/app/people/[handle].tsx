import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Avatar, Button, Loading, Message } from "~/components/ui";
import { WorkCard } from "~/components/WorkRail";
import { apiFetch } from "~/lib/api";
import { appText } from "~/lib/appCopy";
import { useAuth } from "~/lib/auth";
import { loadPeople, setFollowing, type PeopleWorkEntry } from "~/lib/feeds";
import { openThreadWith } from "~/lib/messages";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, space, type } from "~/theme";

/** Public creator profile (website /people/[handle], GET /api/people/{handle}). */
export default function PeopleScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const { width } = useWindowDimensions();
  const people = useApi(`people:${handle}:${user?.uid ?? "guest"}`, () => loadPeople(handle));
  const [followBusy, setFollowBusy] = useState(false);
  const cardWidth = (width - space(4) * 2 - space(3)) / 2;

  if (people.loading && !people.data) return <Loading />;
  if (!people.data) return <Message title={t("common.retry")} body={people.error?.message} />;

  const { profile, viewer, directed, credited } = people.data;
  const isFollowing = viewer?.isFollowing ?? false;

  async function message() {
    if (!user) {
      router.push("/login");
      return;
    }
    const threadId = await openThreadWith(profile.uid);
    router.push(`/messages/${threadId}`);
  }

  function block() {
    Alert.alert(appText(locale, "block"), appText(locale, "blockConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: appText(locale, "block"),
        style: "destructive",
        onPress: async () => {
          await apiFetch(`/api/me/blocks/${encodeURIComponent(profile.uid)}`, { method: "POST", auth: "required" });
          if (isFollowing) await setFollowing(profile.uid, false).catch(() => {});
          Alert.alert(appText(locale, "blocked"));
          router.back();
        },
      },
    ]);
  }

  async function toggleFollow() {
    if (!user) {
      router.push("/login");
      return;
    }
    setFollowBusy(true);
    try {
      await setFollowing(profile.uid, !isFollowing);
      await people.refresh();
    } finally {
      setFollowBusy(false);
    }
  }

  const grid = (title: string, items: PeopleWorkEntry[]) =>
    items.length > 0 ? (
      <View style={{ marginTop: space(7) }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.grid}>
          {items.map((w) => (
            <WorkCard
              key={`${w.ownerUid}:${w.workId}`}
              width={cardWidth}
              item={{
                key: `${w.ownerUid}:${w.workId}`,
                ownerUid: w.ownerUid,
                workId: w.workId,
                title: w.title,
                subtitle: w.characterName || t(`watch.creditRole.${w.role}`),
                thumbnailUrl: w.thumbnailUrl,
              }}
            />
          ))}
        </View>
      </View>
    ) : null;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }}>
      <Stack.Screen options={{ title: profile.displayName }} />
      <View style={styles.header}>
        <Avatar uri={profile.avatarUrl} name={profile.displayName} size={88} />
        <Text style={styles.name}>{profile.displayName}</Text>
        <Text style={styles.handle}>@{profile.handle}</Text>
        {profile.headline ? <Text style={styles.headline}>{profile.headline}</Text> : null}
        <Text style={styles.counts}>
          {t("follow.counts", { followers: profile.followerCount, following: profile.followingCount })}
        </Text>
        {!viewer?.isSelf ? (
          <Button
            label={isFollowing ? t("follow.following") : t("follow.follow")}
            variant={isFollowing ? "secondary" : "primary"}
            loading={followBusy}
            onPress={toggleFollow}
            style={{ alignSelf: "stretch", marginTop: space(4) }}
          />
        ) : null}
        {!viewer?.isSelf ? (
          <Button variant="secondary" label={t("dm.inbox.sendMessageCta")} onPress={() => void message()} style={{ alignSelf: "stretch", marginTop: space(2) }} />
        ) : null}
      </View>
      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      {grid(t("watch.director"), directed)}
      {grid(t("watch.castCrew"), credited)}
      {user && !viewer?.isSelf ? (
        <Text style={styles.block} accessibilityRole="button" onPress={block}>
          {appText(locale, "block")}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: space(1), paddingTop: space(4) },
  name: { ...type.h2, color: colors.ink, marginTop: space(3) },
  handle: { ...type.small, color: colors.ink3 },
  headline: { ...type.body, color: colors.ink2, textAlign: "center", marginTop: space(2) },
  counts: { ...type.small, color: colors.ink3, marginTop: space(2) },
  bio: { ...type.body, color: colors.ink2, marginTop: space(6) },
  sectionTitle: { ...type.h3, color: colors.ink, marginBottom: space(3) },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(3) },
  block: { ...type.small, color: colors.ink3, marginTop: space(8), textAlign: "center" },
});
