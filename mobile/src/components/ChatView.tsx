import { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDmTime } from "@/lib/dm/formatDmTime";
import { useLocale } from "~/lib/locale";
import type { ChatMessage, ReplyTarget } from "~/lib/messages";
import { colors, radius, space, type } from "~/theme";

/**
 * Conversation for both 1:1 threads and group rooms. Long-press a message to
 * reply to it (website: dm.actions.reply).
 */
export function ChatView({
  myUid,
  messages,
  senderName,
  onSend,
}: {
  myUid: string;
  messages: ChatMessage[];
  /** Group rooms show who sent each message; 1:1 threads pass undefined. */
  senderName?: (uid: string) => string;
  onSend: (text: string, replyTo?: ReplyTarget) => Promise<void>;
}) {
  const { t, locale } = useLocale();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(body, replyTo ?? undefined);
      setText("");
      setReplyTo(null);
    } catch (err) {
      setError((err as Error).message || t("dm.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  // Newest at the bottom: an inverted list keeps the latest message in view.
  const reversed = [...messages].reverse();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        ref={listRef}
        inverted
        data={reversed}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: space(4), gap: space(2) }}
        ListEmptyComponent={<Text style={styles.empty}>{t("dm.threadEmpty")}</Text>}
        renderItem={({ item }) => {
          const mine = item.senderUid === myUid;
          return (
            <Pressable
              onLongPress={() => setReplyTo({ messageId: item.id, senderUid: item.senderUid, text: item.text })}
              style={[styles.bubbleWrap, mine ? { alignItems: "flex-end" } : { alignItems: "flex-start" }]}
            >
              {!mine && senderName ? <Text style={styles.sender}>{senderName(item.senderUid)}</Text> : null}
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                {item.replyToText ? (
                  <Text style={styles.quote} numberOfLines={2}>
                    {item.replyToText}
                  </Text>
                ) : null}
                <Text style={styles.text}>{item.text}</Text>
                {item.reactions && Object.keys(item.reactions).length > 0 ? (
                  <Text style={styles.reactions}>{Object.values(item.reactions).join(" ")}</Text>
                ) : null}
              </View>
              <Text style={styles.time}>{formatDmTime(item.createdAt, locale)}</Text>
            </Pressable>
          );
        }}
      />

      {replyTo ? (
        <View style={styles.replyBar}>
          <Text style={styles.replyText} numberOfLines={1}>
            {t("dm.actions.replyingTo")} · {replyTo.text}
          </Text>
          <Text style={styles.cancel} onPress={() => setReplyTo(null)}>
            {t("dm.actions.cancelReply")}
          </Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, space(3)) }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("dm.placeholder")}
          placeholderTextColor={colors.ink4}
          multiline
          style={styles.input}
        />
        <Pressable onPress={send} disabled={!text.trim() || sending} style={[styles.send, (!text.trim() || sending) && { opacity: 0.5 }]}>
          <Text style={styles.sendText}>{t("dm.send")}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  empty: { ...type.small, color: colors.ink3, textAlign: "center", padding: space(8), transform: [{ scaleY: -1 }] },
  bubbleWrap: { gap: 2 },
  sender: { ...type.small, color: colors.ink3, marginLeft: space(1) },
  bubble: { maxWidth: "82%", borderRadius: radius.card, paddingHorizontal: space(3), paddingVertical: space(2) },
  mine: { backgroundColor: colors.accent },
  theirs: { backgroundColor: colors.card },
  quote: { ...type.small, color: colors.ink2, borderLeftWidth: 2, borderLeftColor: colors.ink3, paddingLeft: space(2), marginBottom: space(1) },
  text: { ...type.body, color: colors.ink },
  reactions: { ...type.small, marginTop: 2 },
  time: { ...type.small, fontSize: 11, color: colors.ink4, marginHorizontal: space(1) },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    paddingHorizontal: space(4),
    paddingVertical: space(2),
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  replyText: { ...type.small, color: colors.ink2, flex: 1 },
  cancel: { ...type.small, color: colors.ink3 },
  error: { ...type.small, color: colors.destructive, paddingHorizontal: space(4) },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space(2),
    paddingHorizontal: space(3),
    paddingTop: space(2),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  input: {
    ...type.body,
    flex: 1,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: space(4),
    paddingTop: space(2),
    paddingBottom: space(2),
    maxHeight: 120,
  },
  send: { backgroundColor: colors.accent, borderRadius: 20, paddingHorizontal: space(4), paddingVertical: space(2) + 1 },
  sendText: { ...type.body, color: "#ffffff", fontWeight: "600" },
});
