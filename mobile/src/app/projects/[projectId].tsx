import Ionicons from "@expo/vector-icons/Ionicons";
import { randomUUID } from "expo-crypto";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { ProjectDetail, ProjectMilestone, ProjectStatus } from "@/types/project";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Avatar, Button, Loading, Message } from "~/components/ui";
import { apiFetch } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { PROJECT_STATUS_LABEL, PROJECT_STATUSES } from "~/lib/projects";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

/**
 * Project workspace (website /projects/[projectId]): status, members,
 * milestones, project chat and the connected work. Only the owner edits.
 */
export default function ProjectScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { user } = useAuth();
  const { ui } = useLocale();
  const detail = useApi(user ? `project:${projectId}` : null, () =>
    apiFetch<{ project: ProjectDetail }>(`/api/me/projects/${encodeURIComponent(projectId)}`, { auth: "required" })
  );
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("development");
  const [milestone, setMilestone] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const project = detail.data?.project;
  useEffect(() => {
    if (!project || editing) return;
    setTitle(project.title);
    setDescription(project.description ?? "");
    setCategory(project.category ?? "");
    setStatus(project.status);
  }, [project, editing]);

  if (!user) return <SignInPrompt />;
  if (detail.loading && !detail.data) return <Loading />;
  if (!project) return <Message title={ui("Project unavailable")} body={detail.error?.message} />;
  const isOwner = project.ownerUid === user.uid;

  async function patch(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setNotice(null);
    try {
      await apiFetch(`/api/me/projects/${encodeURIComponent(projectId)}`, { method: "PATCH", auth: "required", json: body });
      await detail.refresh();
      return true;
    } catch (e) {
      setNotice((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    if (await patch({ title: title.trim(), description, category, status })) setEditing(false);
  }

  async function addMilestone() {
    if (!project || !milestone.trim()) return;
    const next: ProjectMilestone = { id: randomUUID(), title: milestone.trim(), complete: false };
    if (await patch({ milestones: [...project.milestones, next] })) setMilestone("");
  }

  function toggleMilestone(id: string) {
    if (!project || !isOwner) return;
    void patch({ milestones: project.milestones.map((m) => (m.id === id ? { ...m, complete: !m.complete } : m)) });
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), gap: space(3), paddingBottom: space(12) }} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: ui("Project workspace"),
          headerRight: isOwner
            ? () => (
                <Text onPress={() => setEditing((v) => !v)} style={{ ...type.small, color: colors.accentHover }}>
                  {editing ? ui("Cancel") : ui("⚙ Project settings")}
                </Text>
              )
            : undefined,
        }}
      />

      {editing ? (
        <View style={{ gap: space(2) }}>
          <Text style={styles.label}>{ui("PROJECT TITLE")}</Text>
          <TextInput value={title} onChangeText={setTitle} maxLength={120} style={styles.input} />
          <Text style={styles.label}>{ui("DESCRIPTION")}</Text>
          <TextInput value={description} onChangeText={setDescription} maxLength={1000} multiline style={[styles.input, styles.multiline]} />
          <Text style={styles.label}>{ui("CATEGORY")}</Text>
          <TextInput value={category} onChangeText={setCategory} maxLength={80} style={styles.input} />
          <Text style={styles.label}>{ui("STATUS")}</Text>
          <View style={styles.chips}>
            {PROJECT_STATUSES.map((s) => (
              <Pressable key={s} onPress={() => setStatus(s)} style={[styles.chip, status === s && styles.chipActive]} accessibilityState={{ selected: status === s }}>
                <Text style={[styles.meta, status === s && { color: colors.ink }]}>{ui(PROJECT_STATUS_LABEL[s])}</Text>
              </Pressable>
            ))}
          </View>
          <Button label={busy ? ui("Saving…") : ui("Save changes")} disabled={busy || !title.trim()} onPress={saveSettings} />
        </View>
      ) : (
        <View style={{ gap: space(1) }}>
          <Text style={styles.meta}>
            {project.category || "OONA"} · {ui(PROJECT_STATUS_LABEL[project.status] ?? "Development")}
          </Text>
          <Text style={styles.title}>{project.title}</Text>
          <Text style={styles.body}>
            {project.description || ui("A shared place for your team to shape the work, exchange feedback, and bring the next version to life.")}
          </Text>
        </View>
      )}

      <View style={{ gap: space(2) }}>
        {project.roomId ? <Button variant="secondary" label={ui("⌁ Open project chat")} onPress={() => router.push(`/messages/rooms/${project.roomId}`)} /> : null}
        {project.workId ? <Button variant="secondary" label={ui("Open work")} onPress={() => router.push(`/watch/${project.ownerUid}/${project.workId}`)} /> : null}
      </View>
      {notice ? <Text style={[styles.meta, { color: colors.destructive }]}>{notice}</Text> : null}

      <Text style={styles.section}>{ui("MILESTONES")}</Text>
      {project.milestones.length === 0 ? <Text style={styles.meta}>{ui("No milestones yet.")}</Text> : null}
      {project.milestones.map((m) => (
        <Pressable
          key={m.id}
          onPress={() => toggleMilestone(m.id)}
          disabled={!isOwner || busy}
          style={styles.milestone}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: m.complete, disabled: !isOwner }}
        >
          <Ionicons name={m.complete ? "checkmark-circle" : "ellipse-outline"} size={22} color={m.complete ? colors.success : colors.ink3} />
          <Text style={[styles.body, m.complete && { textDecorationLine: "line-through", color: colors.ink3 }]}>{m.title}</Text>
        </Pressable>
      ))}
      {isOwner ? (
        <View style={{ flexDirection: "row", gap: space(2) }}>
          <TextInput value={milestone} onChangeText={setMilestone} placeholder={ui("Add a milestone")} placeholderTextColor={colors.ink4} style={[styles.input, { flex: 1 }]} />
          <Button variant="secondary" label={ui("Add")} disabled={busy || !milestone.trim()} onPress={addMilestone} />
        </View>
      ) : null}

      <Text style={[styles.section, { marginTop: space(4) }]}>{ui("Project members")}</Text>
      {project.members.map((m) => (
        <Pressable key={m.uid} onPress={() => m.handle && router.push(`/people/${m.handle}`)} style={styles.member}>
          <Avatar uri={m.avatarUrl} name={m.displayName} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.body}>{m.displayName}</Text>
            <Text style={styles.meta}>
              {m.role}
              {m.handle ? ` · @${m.handle}` : ""}
            </Text>
          </View>
        </Pressable>
      ))}
      <Button variant="secondary" label={ui("Find a collaborator →")} onPress={() => router.push("/society")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h2, color: colors.ink },
  section: { ...type.h3, color: colors.ink, marginTop: space(2) },
  body: { ...type.body, color: colors.ink, flexShrink: 1 },
  meta: { ...type.small, color: colors.ink3 },
  label: { ...type.small, color: colors.ink2, marginTop: space(2), letterSpacing: 0.5 },
  milestone: { flexDirection: "row", alignItems: "center", gap: space(3), paddingVertical: space(2) },
  member: { flexDirection: "row", alignItems: "center", gap: space(3), paddingVertical: space(2) },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: { paddingHorizontal: space(3), paddingVertical: space(2), borderRadius: 999, borderWidth: 1, borderColor: colors.line },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.card },
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
  multiline: { minHeight: 110, paddingTop: space(3), textAlignVertical: "top" },
});
