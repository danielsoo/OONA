import { router, Stack } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { formatDmTime } from "@/lib/dm/formatDmTime";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Avatar, Button, Loading, Message } from "~/components/ui";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { loadInbox } from "~/lib/messages";
import { useApi } from "~/lib/useApi";
import { usePolling } from "~/lib/usePolling";
import { colors, space, type } from "~/theme";

type Row = {
  key: string;
  href: string;
  title: string;
  avatarUrl: string | null;
  preview: string;
  mine: boolean;
  at: string | null;
  unread: boolean;
};

/** Inbox: 1:1 threads and group rooms together, newest first (website /messages). */
export default function InboxScreen() {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const inbox = useApi(user ? `inbox:${user.uid}` : null, loadInbox);
  usePolling(inbox.refresh, 15000, Boolean(user));

  if (!user) return <SignInPrompt />;
  if (inbox.loading && !inbox.data) return <Loading />;
  if (inbox.error && !inbox.data) return <Message title={t("common.retry")} body={inbox.error.message} />;

  const rows: Row[] = [
    ...(inbox.data?.threads ?? []).map((th) => ({
      key: `t:${th.threadId}`,
      href: `/messages/${th.threadId}`,
      title: th.otherDisplayName,
      avatarUrl: th.otherAvatarUrl,
      preview: th.lastMessagePreview,
      mine: th.lastSenderUid === user.uid,
      at: th.lastMessageAt,
      unread: th.unread,
    })),
    ...(inbox.data?.rooms ?? []).map((r) => ({
      key: `r:${r.roomId}`,
      href: `/messages/rooms/${r.roomId}`,
      title: r.name,
      avatarUrl: r.memberPreview[0]?.avatarUrl ?? null,
      preview: r.lastMessagePreview,
      mine: r.lastSenderUid === user.uid,
      at: r.lastMessageAt,
      unread: r.unread,
    })),
  ].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));

  return (
    <>
      <Stack.Screen options={{ title: t("dm.inboxTitle") }} />
      <FlatList
        style={{ backgroundColor: colors.bg }}
        data={rows}
        keyExtractor={(r) => r.key}
        refreshControl={<RefreshControl refreshing={inbox.loading} onRefresh={inbox.refresh} tintColor={colors.ink2} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Button label={t("dm.rooms.newRoom")} variant="secondary" onPress={() => router.push("/messages/new-room")} />
          </View>
        }
        ListEmptyComponent={<Message title={t("dm.inbox.emptyTitle")} body={t("dm.inbox.emptyLead")} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(item.href as never)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <Avatar uri={item.avatarUrl} name={item.title} size={48} />
            <View style={{ flex: 1 }}>
              <View style={styles.topLine}>
                <Text style={[styles.title, item.unread && { fontWeight: "700" }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.time}>{formatDmTime(item.at, locale)}</Text>
              </View>
              <Text style={[styles.preview, item.unread && { color: colors.ink }]} numberOfLines={1}>
                {item.mine ? `${t("dm.inbox.youPrefix")} ` : ""}
                {item.preview}
              </Text>
            </View>
            {item.unread ? <View style={styles.dot} /> : null}
          </Pressable>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: { padding: space(4) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  topLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space(2) },
  title: { ...type.body, color: colors.ink, flex: 1 },
  time: { ...type.small, color: colors.ink4 },
  preview: { ...type.small, color: colors.ink3, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
});
