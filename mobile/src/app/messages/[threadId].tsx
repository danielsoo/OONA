import { router, Stack, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { ChatView } from "~/components/ChatView";
import { Loading, Message } from "~/components/ui";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { loadThread, sendThreadMessage } from "~/lib/messages";
import { useApi } from "~/lib/useApi";
import { usePolling } from "~/lib/usePolling";
import { colors, type } from "~/theme";

/** 1:1 conversation (website /messages/[threadId]); polls every 8s like the website. */
export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { user } = useAuth();
  const { t } = useLocale();
  const thread = useApi(user ? `thread:${threadId}` : null, () => loadThread(threadId));
  usePolling(thread.refresh, 8000, Boolean(user));

  if (!user) return <Message title={t("common.loginRequired")} />;
  if (thread.loading && !thread.data) return <Loading />;
  if (!thread.data) return <Message title={t("common.retry")} body={thread.error?.message} />;

  const data = thread.data;
  const handle = data.otherHandle;

  return (
    <>
      <Stack.Screen
        options={{
          title: data.otherDisplayName,
          headerRight: handle
            ? () => (
                <Text onPress={() => router.push(`/people/${handle}`)} style={{ ...type.small, color: colors.accentHover }}>
                  {t("dm.viewProfile")}
                </Text>
              )
            : undefined,
        }}
      />
      <ChatView
        myUid={user.uid}
        messages={data.messages}
        onSend={async (text, replyTo) => {
          await sendThreadMessage(threadId, text, replyTo, data.otherUid);
          await thread.refresh();
        }}
      />
    </>
  );
}
