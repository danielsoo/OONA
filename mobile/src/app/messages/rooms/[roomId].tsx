import { router, Stack, useLocalSearchParams } from "expo-router";
import { Alert, Text } from "react-native";
import { ChatView } from "~/components/ChatView";
import { Loading, Message } from "~/components/ui";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { leaveRoom, loadRoom, sendRoomMessage } from "~/lib/messages";
import { useApi } from "~/lib/useApi";
import { usePolling } from "~/lib/usePolling";
import { colors, type } from "~/theme";

/** Group conversation (website /messages/rooms/[roomId]). */
export default function RoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuth();
  const { t } = useLocale();
  const room = useApi(user ? `room:${roomId}` : null, () => loadRoom(roomId));
  usePolling(room.refresh, 8000, Boolean(user));

  if (!user) return <Message title={t("common.loginRequired")} />;
  if (room.loading && !room.data) return <Loading />;
  if (!room.data) return <Message title={t("common.retry")} body={room.error?.message} />;

  const data = room.data;
  const names = new Map(data.members.map((m) => [m.uid, m.displayName]));

  function confirmLeave() {
    Alert.alert(t("dm.rooms.leaveConfirm"), data.name, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("dm.rooms.leaveRoom"),
        style: "destructive",
        onPress: async () => {
          await leaveRoom(roomId);
          router.back();
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${data.name} · ${t("dm.rooms.membersCount", { count: data.members.length })}`,
          headerRight: () => (
            <Text onPress={confirmLeave} style={{ ...type.small, color: colors.destructive }}>
              {t("dm.rooms.leaveRoom")}
            </Text>
          ),
        }}
      />
      <ChatView
        myUid={user.uid}
        messages={data.messages}
        senderName={(uid) => names.get(uid) ?? "—"}
        onSend={async (text, replyTo) => {
          await sendRoomMessage(roomId, text, replyTo);
          await room.refresh();
        }}
      />
    </>
  );
}
