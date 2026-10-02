import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { displayProfileLink } from "@/lib/profileLink";
import { resolveSocietyBannerBackground } from "@/lib/societyBannerBackground";
import type { HeroBackgroundId } from "@/lib/heroBackgroundPresets";
import { Avatar, Button, Loading, Message } from "~/components/ui";
import { WorkCard } from "~/components/WorkRail";
import { apiFetch } from "~/lib/api";
import { API_BASE_URL } from "~/lib/config";
import { appText } from "~/lib/appCopy";
import { useAuth } from "~/lib/auth";
import { loadPeople, setFollowing, type PeopleWorkEntry } from "~/lib/feeds";
import { openThreadWith } from "~/lib/messages";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

/** Public creator profile (website /people/[handle], GET /api/people/{handle}). */
export default function PeopleScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { user } = useAuth();
  const { t, ui, locale } = useLocale();
  const { width } = useWindowDimensions();
  const [noteTarget, setNoteTarget] = useState<PeopleWorkEntry | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const people = useApi(`people:${handle}:${user?.uid ?? "guest"}`, () => loadPeople(handle));
  const [followBusy, setFollowBusy] = useState(false);
  const cardWidth = (width - space(4) * 2 - space(3)) / 2;

  if (people.loading && !people.data) return <Loading />;
  if (!people.data) return <Message title={t("common.retry")} body={people.error?.message} />;

  const { profile, viewer, directed, credited, isOnline } = people.data;
  // Same banner presets as the website; the images are served by the website.
  const banner = resolveSocietyBannerBackground(profile.societyBannerBackgroundId as HeroBackgroundId | null | undefined);
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
            <View key={`${w.ownerUid}:${w.workId}`} style={{ width: cardWidth, gap: space(1) }}>
              <WorkCard
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
              {w.profileNote ? (
                <Text style={styles.note} numberOfLines={4}>
                  {w.profileNote}
                </Text>
              ) : null}
              {viewer?.isSelf ? (
                <Text
                  style={styles.link}
                  onPress={() => {
                    setNoteTarget(w);
                    setNoteText(w.profileNote ?? "");
                  }}
                >
                  {t("society.workNote.label")}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    ) : null;

  async function saveNote() {
    if (!noteTarget) return;
    setNoteBusy(true);
    try {
      await apiFetch("/api/me/work-profile-notes", {
        method: "PUT",
        auth: "required",
        json: { ownerUid: noteTarget.ownerUid, workId: noteTarget.workId, text: noteText },
      });
      setNoteTarget(null);
      await people.refresh();
    } catch {
      Alert.alert(t("society.workNote.saveError"));
    } finally {
      setNoteBusy(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }}>
      <Stack.Screen options={{ title: profile.displayName }} />
      <Image source={{ uri: `${API_BASE_URL}${banner.src}` }} style={styles.banner} contentFit="cover" accessibilityIgnoresInvertColors />
      <View style={styles.header}>
        <View style={{ marginTop: -44 }}>
          <Avatar uri={profile.avatarUrl} name={profile.displayName} size={88} />
          {isOnline ? <View style={styles.online} accessibilityLabel={t("society.online")} /> : null}
        </View>
        <Text style={styles.name}>{profile.displayName}</Text>
        <Text style={styles.handle}>
          @{profile.handle}
          {profile.schoolName ? ` · ${profile.schoolName}` : ""}
        </Text>
        {profile.headline ? <Text style={styles.headline}>{profile.headline}</Text> : null}
        {profile.roleTags.length > 0 || profile.openToCollaborate ? (
          <View style={styles.tags}>
            {profile.roleTags.map((r) => (
              <Text key={r} style={styles.tag}>
                {t(`society.role${r.charAt(0).toUpperCase()}${r.slice(1)}`)}
              </Text>
            ))}
            {profile.openToCollaborate ? <Text style={[styles.tag, styles.tagOpen]}>{t("profile.edit.openToCollaborate")}</Text> : null}
          </View>
        ) : null}
        {profile.openToCollaborate && profile.collaborationNote ? <Text style={styles.counts}>{profile.collaborationNote}</Text> : null}
        {profile.profileLink ? (
          <Text style={styles.link} onPress={() => void Linking.openURL(profile.profileLink!)} accessibilityRole="link">
            {displayProfileLink(profile.profileLink)} ↗
          </Text>
        ) : null}
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
        {user && !viewer?.isSelf ? (
          <Button
            variant="secondary"
            label={ui("Invite to project")}
            onPress={() =>
              router.push({
                pathname: "/send-invite",
                params: { uid: profile.uid, handle: profile.handle, name: profile.displayName, avatar: profile.avatarUrl ?? "" },
              })
            }
            style={{ alignSelf: "stretch", marginTop: space(2) }}
          />
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
      <Modal visible={noteTarget !== null} transparent animationType="fade" onRequestClose={() => setNoteTarget(null)}>
        <View style={styles.scrim}>
          <View style={styles.sheet}>
            <Text style={styles.sectionTitle}>{noteTarget?.title}</Text>
            <TextInput
              value={noteText}
              onChangeText={setNoteText}
              placeholder={t("society.workNote.placeholder")}
              placeholderTextColor={colors.ink4}
              maxLength={2000}
              multiline
              style={styles.noteInput}
            />
            <Button label={t("society.workNote.save")} loading={noteBusy} disabled={noteBusy} onPress={saveNote} />
            <Button variant="secondary" label={t("common.cancel")} onPress={() => setNoteTarget(null)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: space(1) },
  banner: { height: 120, borderRadius: radius.card, backgroundColor: colors.card },
  online: { position: "absolute", right: 4, bottom: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.bg },
  tags: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space(2), marginTop: space(2) },
  tag: { ...type.small, color: colors.ink2, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: space(3), paddingVertical: 2, overflow: "hidden" },
  tagOpen: { borderColor: colors.success, color: colors.success },
  link: { ...type.small, color: colors.accentHover, marginTop: space(1) },
  note: { ...type.small, color: colors.ink2 },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: space(6) },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.card, padding: space(4), gap: space(3) },
  noteInput: {
    ...type.body,
    color: colors.ink,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    padding: space(3),
    minHeight: 120,
    textAlignVertical: "top",
  },
  name: { ...type.h2, color: colors.ink, marginTop: space(3) },
  handle: { ...type.small, color: colors.ink3 },
  headline: { ...type.body, color: colors.ink2, textAlign: "center", marginTop: space(2) },
  counts: { ...type.small, color: colors.ink3, marginTop: space(2) },
  bio: { ...type.body, color: colors.ink2, marginTop: space(6) },
  sectionTitle: { ...type.h3, color: colors.ink, marginBottom: space(3) },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(3) },
  block: { ...type.small, color: colors.ink3, marginTop: space(8), textAlign: "center" },
});
