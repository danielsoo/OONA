import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { formatDmTime } from "@/lib/dm/formatDmTime";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Avatar, Loading, Message } from "~/components/ui";
import { useAuth } from "~/lib/auth";
import { loadNotifications, markAllNotificationsRead } from "~/lib/feeds";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, space, type } from "~/theme";

/** Routes that already exist in the app; anything else stays on this screen for now. */
function openTarget(path: string, type?: string) {
  if (type?.startsWith("business_invite")) {
    router.push("/invites");
    return;
  }
  if (["/watch/", "/people/", "/messages", "/collab-invite/"].some((prefix) => path.startsWith(prefix))) {
    router.push(path as never);
  }
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const list = useApi(user ? `notifications:${user.uid}` : null, () => loadNotifications());

  useFocusEffect(
    useCallback(() => {
      if (user) void markAllNotificationsRead().catch(() => {});
    }, [user])
  );

  if (!user) return <SignInPrompt />;
  if (list.loading && !list.data) return <Loading />;
  if (list.error && !list.data) return <Message title={t("common.retry")} body={list.error.message} />;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={list.data ?? []}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={list.loading} onRefresh={list.refresh} tintColor={colors.ink2} />}
      ListEmptyComponent={<Message title={t("notifications.empty")} />}
      renderItem={({ item }) => (
        <Pressable onPress={() => openTarget(item.targetPath, item.type)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
          <Avatar uri={item.actorAvatarUrl} name={item.actorDisplayName} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.text, !item.read && { color: colors.ink }]} numberOfLines={2}>
              {t(`notifications.items.${item.type}`, {
                workTitle: item.workTitle ?? "",
                actorName: item.actorDisplayName ?? "",
                preview: item.messagePreview ?? "",
                roomName: item.roomName ?? "",
              })}
            </Text>
            {item.createdAt ? <Text style={styles.time}>{formatDmTime(item.createdAt, locale)}</Text> : null}
          </View>
          {!item.read ? <View style={styles.dot} /> : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  text: { ...type.body, color: colors.ink2 },
  time: { ...type.small, color: colors.ink4, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
});
