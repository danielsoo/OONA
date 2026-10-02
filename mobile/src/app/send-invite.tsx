import { randomUUID } from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { ProjectListItem } from "@/types/project";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Avatar, Button } from "~/components/ui";
import { apiFetch } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { storage } from "~/lib/firebase";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

type Permission = "view_comment" | "edit" | "manage";
type Compensation = "negotiable" | "paid" | "credit" | "unpaid";

const PERMISSIONS: { id: Permission; label: string }[] = [
  { id: "view_comment", label: "View and comment" },
  { id: "edit", label: "Edit project" },
  { id: "manage", label: "Manage members" },
];
// Same limits as storage.rules for users/{uid}/business-invites/**.
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

type Attachment = { uri: string; name: string; mimeType: string; size: number };

const COMPENSATIONS: { id: Compensation; label: string }[] = [
  { id: "negotiable", label: "Negotiable" },
  { id: "paid", label: "Paid" },
  { id: "credit", label: "Credit" },
  { id: "unpaid", label: "Unpaid" },
];

/**
 * Invite a creator to a project (website BusinessInviteComposerModal,
 * POST /api/me/business-invites with direction "offer"). Opened from a profile.
 */
export default function SendInviteScreen() {
  const params = useLocalSearchParams<{ uid: string; handle?: string; name?: string; avatar?: string }>();
  const { user } = useAuth();
  const { ui } = useLocale();
  const projects = useApi(user ? `projects:${user.uid}` : null, async () => {
    const data = await apiFetch<{ projects?: ProjectListItem[] }>("/api/me/projects", { auth: "required" });
    return data.projects ?? [];
  });
  const [projectId, setProjectId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState("Creative collaborator");
  const [permissions, setPermissions] = useState<Permission>("view_comment");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("Remote");
  const [compensation, setCompensation] = useState<Compensation>("negotiable");
  const [budgetRange, setBudgetRange] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId && projects.data?.[0]) setProjectId(projects.data[0].id);
  }, [projects.data, projectId]);

  if (!user) return <SignInPrompt />;
  const list = projects.data ?? [];
  const selected = list.find((p) => p.id === projectId) ?? null;

  async function createProject() {
    if (!newTitle.trim()) return;
    setCreating(true);
    setErr(null);
    try {
      const data = await apiFetch<{ project?: ProjectListItem }>("/api/me/projects", { method: "POST", auth: "required", json: { title: newTitle.trim() } });
      if (!data.project) throw new Error(ui("The project could not be created."));
      await projects.refresh();
      setProjectId(data.project.id);
      setNewTitle("");
    } catch (e) {
      setErr((e as Error).message || ui("The project could not be created."));
    } finally {
      setCreating(false);
    }
  }

  async function chooseAttachment() {
    const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", ...DOC_TYPES], copyToCacheDirectory: true, multiple: false });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    const mimeType = asset.mimeType ?? "application/octet-stream";
    if ((!mimeType.startsWith("image/") && !DOC_TYPES.includes(mimeType)) || (asset.size ?? 0) > MAX_ATTACHMENT_BYTES) {
      setErr(ui("Attach a PDF, document, or image smaller than 20 MB."));
      return;
    }
    setErr(null);
    setAttachment({ uri: asset.uri, name: asset.name, mimeType, size: asset.size ?? 0 });
  }

  /** Same path and fields as the website's uploadBusinessInviteAttachment. */
  async function uploadAttachment(file: Attachment) {
    if (!storage || !user) throw new Error("storage_not_configured");
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const storageRef = ref(storage, `users/${user.uid}/business-invites/${randomUUID()}/attachment.${ext}`);
    const blob = await (await fetch(file.uri)).blob();
    await uploadBytes(storageRef, blob, { contentType: file.mimeType });
    return { attachmentUrl: await getDownloadURL(storageRef), attachmentFileName: file.name, attachmentContentType: file.mimeType };
  }

  async function send() {
    if (!params.uid || !projectId || sending) return;
    setSending(true);
    setErr(null);
    try {
      const uploaded = attachment ? await uploadAttachment(attachment) : null;
      await apiFetch("/api/me/business-invites", {
        method: "POST",
        auth: "required",
        json: {
          recipientUid: params.uid,
          direction: "offer",
          projectId,
          projectTitle: selected?.title,
          role,
          permissions,
          availability: [start, end].map((s) => s.trim()).filter(Boolean).join(" → "),
          location,
          compensation,
          budgetRange,
          message: message.trim() || undefined,
          ...(uploaded ?? {}),
        },
      });
      router.replace("/invites");
    } catch (e) {
      setErr((e as Error).message || ui("The invitation could not be sent."));
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), gap: space(2), paddingBottom: space(12) }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: ui("Invite to project") }} />
      <View style={styles.recipient}>
        <Avatar uri={params.avatar || null} name={params.name ?? "?"} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{params.name}</Text>
          {params.handle ? <Text style={styles.hint}>@{params.handle}</Text> : null}
        </View>
      </View>

      <Text style={styles.label}>{ui("PROJECT")}</Text>
      {list.length === 0 && !projects.loading ? <Text style={styles.hint}>{ui("Select a project")}</Text> : null}
      <View style={styles.chips}>
        {list.map((p) => (
          <Chip key={p.id} label={p.title} active={p.id === projectId} onPress={() => setProjectId(p.id)} />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: space(2) }}>
        <TextInput value={newTitle} onChangeText={setNewTitle} placeholder={ui("New project title")} placeholderTextColor={colors.ink4} style={[styles.input, { flex: 1 }]} />
        <Button variant="secondary" label={creating ? ui("Creating…") : ui("Create")} disabled={creating || !newTitle.trim()} onPress={createProject} />
      </View>

      <Text style={styles.label}>{ui("ROLE")}</Text>
      <TextInput value={role} onChangeText={setRole} placeholder={ui("Writer, editor, producer…")} placeholderTextColor={colors.ink4} style={styles.input} />

      <Text style={styles.label}>{ui("PERMISSIONS")}</Text>
      <View style={styles.chips}>
        {PERMISSIONS.map((p) => (
          <Chip key={p.id} label={ui(p.label)} active={permissions === p.id} onPress={() => setPermissions(p.id)} />
        ))}
      </View>

      <Text style={styles.label}>{ui("AVAILABILITY")}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space(2) }}>
        <TextInput value={start} onChangeText={setStart} placeholder="YYYY-MM-DD" placeholderTextColor={colors.ink4} style={[styles.input, { flex: 1 }]} />
        <Text style={styles.hint}>→</Text>
        <TextInput value={end} onChangeText={setEnd} placeholder="YYYY-MM-DD" placeholderTextColor={colors.ink4} style={[styles.input, { flex: 1 }]} />
      </View>

      <Text style={styles.label}>{ui("LOCATION")}</Text>
      <TextInput value={location} onChangeText={setLocation} placeholder={ui("Remote or city")} placeholderTextColor={colors.ink4} style={styles.input} />

      <Text style={styles.label}>{ui("COMPENSATION")}</Text>
      <View style={styles.chips}>
        {COMPENSATIONS.map((c) => (
          <Chip key={c.id} label={ui(c.label)} active={compensation === c.id} onPress={() => setCompensation(c.id)} />
        ))}
      </View>

      <Text style={styles.label}>{ui("BUDGET RANGE (OPTIONAL)")}</Text>
      <TextInput value={budgetRange} onChangeText={setBudgetRange} placeholder={ui("e.g. $2,000 – $5,000 USD")} placeholderTextColor={colors.ink4} style={styles.input} />

      <Text style={styles.label}>{ui("PERSONAL NOTE")}</Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        maxLength={500}
        multiline
        placeholder={ui("Introduce the project and explain why you would like to work together.")}
        placeholderTextColor={colors.ink4}
        style={[styles.input, { minHeight: 120, paddingTop: space(3), textAlignVertical: "top" }]}
      />
      <Text style={[styles.hint, { textAlign: "right" }]}>{message.length} / 500</Text>

      <Text style={styles.label}>{ui("SUPPORTING FILE (OPTIONAL)")}</Text>
      {attachment ? (
        <Text style={styles.hint} onPress={() => setAttachment(null)}>
          {attachment.name} ✕
        </Text>
      ) : (
        <Button variant="secondary" label={ui("SUPPORTING FILE (OPTIONAL)")} onPress={chooseAttachment} />
      )}

      {err ? <Text style={[styles.hint, { color: colors.destructive }]}>{err}</Text> : null}
      <Button label={sending ? ui("Sending…") : ui("Send invite")} disabled={!projectId || sending} loading={sending} onPress={send} style={{ marginTop: space(2) }} />
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Text style={[styles.hint, active && { color: colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  recipient: { flexDirection: "row", alignItems: "center", gap: space(3), padding: space(3), borderRadius: radius.card, backgroundColor: colors.surface },
  name: { ...type.h3, color: colors.ink },
  label: { ...type.small, color: colors.ink2, marginTop: space(3), letterSpacing: 0.5 },
  hint: { ...type.small, color: colors.ink3 },
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
});
