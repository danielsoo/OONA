import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Avatar, Loading, Message } from "~/components/ui";
import { apiFetch } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { loadRoom } from "~/lib/messages";
import { searchUsersByHandle, type HandleSearchResult } from "~/lib/upload";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

/**
 * Group members: any member can add people; only the creator can remove them
 * (same rules as POST/DELETE /api/me/rooms/[roomId]/members on the website).
 */
export default function RoomMembersScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuth();
  const { t } = useLocale();
  const room = useApi(user ? `room:${roomId}` : null, () => loadRoom(roomId));
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HandleSearchResult[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim().replace(/^@/, "");
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchUsersByHandle(q)
        .then((items) => !cancelled && setResults(items))
        .catch(() => !cancelled && setResults([]));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (!user) return <Message title={t("common.loginRequired")} />;
  if (room.loading && !room.data) return <Loading />;
  if (!room.data) return <Message title={t("common.retry")} body={room.error?.message} />;

  const data = room.data;
  const memberIds = new Set(data.members.map((m) => m.uid));
  const isCreator = data.createdBy === user.uid;
  const path = `/api/me/rooms/${encodeURIComponent(roomId)}/members`;

  async function add(person: HandleSearchResult) {
    setBusy(person.uid);
    try {
      await apiFetch(path, { method: "POST", auth: "required", json: { memberUids: [person.uid] } });
      setQuery("");
      await room.refresh();
    } catch (err) {
      Alert.alert((err as Error).message || t("dm.rooms.errorGeneric"));
    } finally {
      setBusy(null);
    }
  }

  function remove(uid: string, name: string) {
    Alert.alert(t("dm.rooms.removeMember"), name, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("dm.rooms.removeMember"),
        style: "destructive",
        onPress: async () => {
          setBusy(uid);
          try {
            await apiFetch(`${path}/${encodeURIComponent(uid)}`, { method: "DELETE", auth: "required" });
            await room.refresh();
          } catch (err) {
            Alert.alert((err as Error).message || t("dm.rooms.errorGeneric"));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), gap: space(2), paddingBottom: space(12) }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t("dm.rooms.membersCount", { count: data.members.length }) }} />

      <Text style={styles.label}>{t("dm.rooms.addMember")}</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t("dm.rooms.membersSearchPlaceholder")}
        placeholderTextColor={colors.ink4}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      {results
        .filter((p) => !memberIds.has(p.uid))
        .map((p) => (
          <Pressable key={p.uid} onPress={() => void add(p)} disabled={busy !== null} style={styles.row}>
            <Avatar uri={null} name={p.displayName} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.displayName}</Text>
              <Text style={styles.hint}>@{p.handle}</Text>
            </View>
            <Text style={styles.action}>{busy === p.uid ? "…" : "+"}</Text>
          </Pressable>
        ))}
      {query.trim().replace(/^@/, "").length >= 2 && results.length === 0 ? <Text style={styles.hint}>{t("dm.rooms.membersNoResults")}</Text> : null}

      <View style={{ height: space(4) }} />
      {data.members.map((m) => (
        <View key={m.uid} style={styles.row}>
          <Pressable onPress={() => m.handle && router.push(`/people/${m.handle}`)} style={{ flexDirection: "row", alignItems: "center", gap: space(3), flex: 1 }}>
            <Avatar uri={m.avatarUrl} name={m.displayName} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{m.displayName}</Text>
              {m.handle ? <Text style={styles.hint}>@{m.handle}</Text> : null}
            </View>
          </Pressable>
          {isCreator && m.uid !== user.uid ? (
            <Text onPress={() => remove(m.uid, m.displayName)} style={[styles.action, { color: colors.destructive }]}>
              {busy === m.uid ? "…" : t("dm.rooms.removeMember")}
            </Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { ...type.small, color: colors.ink2 },
  hint: { ...type.small, color: colors.ink3 },
  name: { ...type.body, color: colors.ink },
  action: { ...type.small, color: colors.accentHover, paddingHorizontal: space(2) },
  row: { flexDirection: "row", alignItems: "center", gap: space(3), paddingVertical: space(2) },
  input: {
    ...type.body,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    paddingHorizontal: space(4),
    minHeight: 48,
  },
});
