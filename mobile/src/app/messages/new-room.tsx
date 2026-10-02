import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "~/components/ui";
import { useLocale } from "~/lib/locale";
import { createRoom } from "~/lib/messages";
import { searchUsersByHandle, type HandleSearchResult } from "~/lib/upload";
import { colors, radius, space, type } from "~/theme";

/** Create a group room: name + members by @handle (website: dm.rooms composer). */
export default function NewRoomScreen() {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HandleSearchResult[]>([]);
  const [members, setMembers] = useState<HandleSearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function submit() {
    if (!name.trim()) return setError(t("dm.rooms.errorNameRequired"));
    if (members.length === 0) return setError(t("dm.rooms.errorMembersRequired"));
    setBusy(true);
    setError(null);
    try {
      const { roomId } = await createRoom(name.trim(), members.map((m) => m.uid));
      router.replace(`/messages/rooms/${roomId}`);
    } catch (err) {
      setError((err as Error).message || t("dm.rooms.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), gap: space(3) }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t("dm.rooms.composerTitle") }} />
      <Text style={styles.label}>{t("dm.rooms.nameLabel")}</Text>
      <TextInput value={name} onChangeText={setName} placeholder={t("dm.rooms.namePlaceholder")} placeholderTextColor={colors.ink4} style={styles.input} />
      <Text style={styles.label}>{t("dm.rooms.membersLabel")}</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t("dm.rooms.membersSearchPlaceholder")}
        placeholderTextColor={colors.ink4}
        autoCapitalize="none"
        style={styles.input}
      />
      {results
        .filter((r) => !members.some((m) => m.uid === r.uid))
        .map((r) => (
          <Pressable
            key={r.uid}
            onPress={() => {
              setMembers((prev) => [...prev, r]);
              setQuery("");
            }}
            style={styles.result}
          >
            <Text style={styles.name}>{r.displayName}</Text>
            <Text style={styles.label}>@{r.handle}</Text>
          </Pressable>
        ))}
      {query.trim().length >= 2 && results.length === 0 ? <Text style={styles.label}>{t("dm.rooms.membersNoResults")}</Text> : null}
      <View style={styles.chips}>
        {members.map((m) => (
          <Pressable key={m.uid} onPress={() => setMembers((prev) => prev.filter((x) => x.uid !== m.uid))} style={styles.chip}>
            <Text style={styles.chipText}>@{m.handle} ✕</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={busy ? t("dm.rooms.creating") : t("dm.rooms.create")} loading={busy} onPress={submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { ...type.small, color: colors.ink3 },
  name: { ...type.body, color: colors.ink },
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
  result: { paddingVertical: space(2), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: { borderRadius: 999, backgroundColor: colors.card, paddingHorizontal: space(3), paddingVertical: space(2) },
  chipText: { ...type.small, color: colors.ink },
  error: { ...type.small, color: colors.destructive },
});
