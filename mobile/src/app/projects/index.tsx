import { router, Stack } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import type { ProjectListItem } from "@/types/project";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Button, Loading, Message } from "~/components/ui";
import { apiFetch } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { PROJECT_STATUS_LABEL } from "~/lib/projects";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

/** Projects you own or joined (GET/POST /api/me/projects, website project workspace). */
export default function ProjectsScreen() {
  const { user } = useAuth();
  const { ui } = useLocale();
  const projects = useApi(user ? `projects:${user.uid}` : null, async () => {
    const data = await apiFetch<{ projects?: ProjectListItem[] }>("/api/me/projects", { auth: "required" });
    return data.projects ?? [];
  });
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!user) return <SignInPrompt />;
  if (projects.loading && !projects.data) return <Loading />;

  async function create() {
    if (!title.trim()) return;
    setCreating(true);
    setErr(null);
    try {
      const data = await apiFetch<{ project?: ProjectListItem }>("/api/me/projects", { method: "POST", auth: "required", json: { title: title.trim() } });
      setTitle("");
      await projects.refresh();
      if (data.project) router.push(`/projects/${data.project.id}`);
    } catch (e) {
      setErr((e as Error).message || ui("The project could not be created."));
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: ui("Projects") }} />
      <FlatList
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: space(4), gap: space(3) }}
        data={projects.data ?? []}
        keyExtractor={(p) => p.id}
        refreshControl={<RefreshControl refreshing={projects.loading} onRefresh={projects.refresh} tintColor={colors.ink2} />}
        ListHeaderComponent={
          <View style={{ gap: space(2), marginBottom: space(2) }}>
            <View style={{ flexDirection: "row", gap: space(2) }}>
              <TextInput value={title} onChangeText={setTitle} placeholder={ui("New project title")} placeholderTextColor={colors.ink4} maxLength={120} style={styles.input} />
              <Button label={creating ? ui("Creating…") : ui("Create")} disabled={creating || !title.trim()} onPress={create} />
            </View>
            {err ? <Text style={[styles.meta, { color: colors.destructive }]}>{err}</Text> : null}
          </View>
        }
        ListEmptyComponent={<Message title={ui("No projects yet")} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/projects/${item.id}`)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.meta}>
              {item.category || "OONA"} · {ui(PROJECT_STATUS_LABEL[item.status] ?? "Development")} · {item.memberIds.length}
            </Text>
          </Pressable>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { padding: space(4), borderRadius: radius.card, backgroundColor: colors.surface, gap: space(1) },
  title: { ...type.h3, color: colors.ink },
  meta: { ...type.small, color: colors.ink3 },
  input: {
    ...type.body,
    flex: 1,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    paddingHorizontal: space(4),
    minHeight: 48,
  },
});
