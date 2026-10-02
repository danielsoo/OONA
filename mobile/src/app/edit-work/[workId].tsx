import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput } from "react-native";
import type { WorkDoc } from "@/types/work";
import { Button, Loading, Message } from "~/components/ui";
import { apiFetch } from "~/lib/api";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

type RevisionWork = WorkDoc & {
  revisionReviewStatus?: string;
  pendingRevision?: Partial<WorkDoc> & { platformStatus?: string; proposedCategory?: string; proposedTags?: string[] };
};

/**
 * Edit a published work's details (website /uploader/works/[id]/edit): changes
 * are saved as a revision and go live after review, like on the website.
 */
export default function EditWorkScreen() {
  const { workId } = useLocalSearchParams<{ workId: string }>();
  const { t } = useLocale();
  const data = useApi(`revision:${workId}`, () => apiFetch<{ work: RevisionWork }>(`/api/me/works/${workId}/revision`, { auth: "required" }));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const w = data.data?.work;
    if (!w) return;
    const rev = w.pendingRevision;
    setTitle(rev?.title ?? w.title ?? "");
    setDescription(rev?.description ?? w.description ?? "");
    setCategory(rev?.proposedCategory ?? w.approvedCategory ?? "");
    setTags((rev?.proposedTags ?? w.approvedTags ?? []).join(", "));
  }, [data.data]);

  if (data.loading && !data.data) return <Loading />;
  const work = data.data?.work;
  if (!work) return <Message title={t("myWorks.errorGeneric")} body={data.error?.message} />;

  const pending = work.revisionReviewStatus === "pending";

  async function save(): Promise<boolean> {
    await apiFetch(`/api/me/works/${workId}/revision`, {
      method: "PATCH",
      auth: "required",
      json: {
        title: title.trim(),
        description: description.trim(),
        contentCategory: category.trim() || undefined,
        tags: tags.split(/[,#\s]+/).map((s) => s.trim()).filter(Boolean),
      },
    });
    return true;
  }

  async function run(kind: "save" | "submit") {
    setBusy(kind);
    setMessage(null);
    try {
      await save();
      if (kind === "submit") {
        await apiFetch(`/api/me/works/${workId}/revision/submit`, { method: "POST", auth: "required", json: {} });
        setMessage({ text: t("workRevision.submitted"), ok: true });
        await data.refresh();
      } else {
        setMessage({ text: t("workRevision.metadataSaved"), ok: true });
      }
    } catch (err) {
      setMessage({ text: (err as Error).message || t("myWorks.errorGeneric"), ok: false });
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), gap: space(2), paddingBottom: space(12) }}>
      <Stack.Screen options={{ title: t("workRevision.title") }} />
      <Text style={styles.hint}>{pending ? t("workRevision.revisionPending") : t("workRevision.hint")}</Text>

      <Text style={styles.label}>{t("uploader.uploadTitleLabel")}</Text>
      <TextInput value={title} onChangeText={setTitle} editable={!pending} maxLength={200} style={styles.input} />
      <Text style={styles.label}>{t("uploader.uploadDescriptionLabel")}</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        editable={!pending}
        multiline
        style={[styles.input, { minHeight: 120, paddingTop: space(3), textAlignVertical: "top" }]}
      />
      <Text style={styles.label}>{t("uploader.uploadCategoryLabel")}</Text>
      <TextInput value={category} onChangeText={setCategory} editable={!pending} style={styles.input} />
      <Text style={styles.label}>{t("uploader.uploadTagsLabel")}</Text>
      <TextInput value={tags} onChangeText={setTags} editable={!pending} autoCapitalize="none" style={styles.input} />

      {message ? <Text style={[styles.hint, { color: message.ok ? colors.success : colors.destructive }]}>{message.text}</Text> : null}
      {!pending ? (
        <>
          <Button variant="secondary" label={t("workRevision.saveMetadata")} loading={busy === "save"} disabled={busy !== null} onPress={() => run("save")} style={{ marginTop: space(3) }} />
          <Button label={t("workRevision.submitReview")} loading={busy === "submit"} disabled={busy !== null} onPress={() => run("submit")} />
        </>
      ) : null}
      <Button variant="secondary" label={t("workRevision.backToWorks")} onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { ...type.small, color: colors.ink2, marginTop: space(2) },
  hint: { ...type.small, color: colors.ink3 },
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
