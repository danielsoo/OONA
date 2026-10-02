import { Stack, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { defaultPromoFrameCrop, normalizePromoFrameCrop } from "@/lib/works/promo-crop";
import { PORTRAIT_FRAME_ASPECT } from "@/lib/works/promo-crop-interaction-pure";
import { isStreamEncoding } from "@/lib/works/work-staging-ready";
import { validatePromoVideoDimensions, validatePromoVideoDuration } from "@/lib/works/promo-video";
import type { PromoFrameCrop, StreamStatus } from "@/types/work";
import { CropFrameEditor } from "~/components/CropFrameEditor";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Button, Loading, Message } from "~/components/ui";
import { apiFetch } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { pickMedia, tusUpload, type PickedMedia } from "~/lib/upload";
import { useApi } from "~/lib/useApi";
import { usePolling } from "~/lib/usePolling";
import { colors, radius, space, type } from "~/theme";

type Kind = "prologue" | "promo";

type ClipDoc = {
  platformStatus?: string;
  streamStatus?: string;
  title?: string;
  description?: string;
  playbackUrl?: string;
  frameCrop?: PromoFrameCrop;
};

type EditorPayload = {
  work: { title?: string; description?: string; platformStatus?: string };
  prologue?: ClipDoc | null;
  promo?: ClipDoc | null;
  revisionMode?: boolean;
  revisionReviewStatus?: string;
  pendingRevision?: ClipDoc | null;
  pendingRevisionPlayback?: string;
};

/**
 * Prologue / shorts editor for an existing work (website
 * /uploader/works/[id]/prologue and /promo). A published clip is changed as a
 * revision and stays live until the revision is approved, as on the website.
 */
export default function EditClipScreen() {
  const { workId, kind: kindParam } = useLocalSearchParams<{ workId: string; kind?: string }>();
  const kind: Kind = kindParam === "promo" ? "promo" : "prologue";
  const { user } = useAuth();
  const { t } = useLocale();
  const base = `/api/me/works/${encodeURIComponent(workId)}/${kind}`;
  const data = useApi(user ? `clip:${kind}:${workId}` : null, () => apiFetch<EditorPayload>(base, { auth: "required" }));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<PickedMedia | null>(null);
  const [crop, setCrop] = useState<PromoFrameCrop>(defaultPromoFrameCrop);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [removalOpen, setRemovalOpen] = useState(false);
  const [reason, setReason] = useState("");

  const payload = data.data;
  const doc = (kind === "promo" ? payload?.promo : payload?.prologue) ?? null;
  const revisionMode = Boolean(payload?.revisionMode);
  const rev = payload?.pendingRevision ?? null;
  const active = revisionMode && rev ? rev : doc;
  const encoding = isStreamEncoding(active?.streamStatus as StreamStatus | undefined);
  const locked = revisionMode ? payload?.revisionReviewStatus === "pending" : doc?.platformStatus === "pending";
  const canSubmit = revisionMode
    ? Boolean(rev && (rev.platformStatus === "draft" || rev.platformStatus === "rejected") && rev.streamStatus === "ready")
    : Boolean(doc && (doc.platformStatus === "draft" || doc.platformStatus === "rejected") && doc.streamStatus === "ready");
  const previewUrl = file?.uri ?? (revisionMode ? payload?.pendingRevisionPlayback : undefined) ?? doc?.playbackUrl ?? null;

  usePolling(data.refresh, 6000, encoding);

  useEffect(() => {
    if (!payload) return;
    const source = active ?? doc;
    setTitle(source?.title ?? payload.work.title ?? "");
    setDescription(source?.description ?? payload.work.description ?? "");
    if (kind === "promo") setCrop(normalizePromoFrameCrop(source?.frameCrop));
    // Only on load / refresh of the server copy, not while typing.
  }, [payload]); // eslint-disable-line react-hooks/exhaustive-deps

  const player = useVideoPlayer(previewUrl, (p) => {
    p.loop = true;
    p.muted = kind === "promo";
    if (kind === "promo") p.play();
  });

  if (!user) return <SignInPrompt />;
  if (data.loading && !payload) return <Loading />;
  if (!payload) return <Message title={t("myWorks.errorGeneric")} body={data.error?.message} />;

  const ed = kind === "promo" ? "promoEditor" : "prologueEditor";
  const say = (text: string, ok = true) => setMsg({ text, ok });

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setMsg(null);
    try {
      await fn();
    } catch (err) {
      say((err as Error).message || t("myWorks.errorGeneric"), false);
    } finally {
      setBusy(null);
    }
  }

  async function choose() {
    const next = await pickMedia("videos");
    if (!next) return;
    if (kind === "promo") {
      const dim = validatePromoVideoDimensions(next.width, next.height);
      if (dim) return say(t(dim === "too_small" ? "uploader.errorPromoTooSmall" : "uploader.errorPromoVideoInvalid"), false);
      const dur = validatePromoVideoDuration(next.duration);
      if (dur) {
        const key = dur === "too_short" ? "uploader.errorPromoTooShort" : dur === "too_long" ? "uploader.errorPromoTooLong" : "uploader.errorPromoVideoInvalid";
        return say(t(key), false);
      }
      setCrop(defaultPromoFrameCrop());
    }
    setFile(next);
  }

  const uploadVideo = () =>
    run("upload", async () => {
      if (!file) return;
      const session = await apiFetch<{ tusEndpoint?: string }>(`${base}/upload-url`, {
        method: "POST",
        auth: "required",
        json: { uploadLength: file.fileSize, revision: revisionMode, ...(kind === "promo" ? { frameCrop: crop } : {}) },
      });
      if (!session.tusEndpoint) throw new Error(t("myWorks.errorGeneric"));
      setProgress(0);
      await tusUpload(file, session.tusEndpoint, setProgress);
      setFile(null);
      say(t(`${ed}.savedEncoding`));
      await data.refresh();
    });

  const saveMeta = () =>
    run("meta", async () => {
      await apiFetch(base, {
        method: "PUT",
        auth: "required",
        json: { title, description, ...(kind === "promo" ? { frameCrop: crop } : {}) },
      });
      say(t(`${ed}.metaSaved`));
      await data.refresh();
    });

  const submit = () =>
    run("submit", async () => {
      await apiFetch(`${base}/submit`, { method: "POST", auth: "required", json: {} });
      say(t(`${ed}.submitted`));
      await data.refresh();
    });

  function remove() {
    if (doc?.platformStatus === "published") {
      setRemovalOpen(true);
      return;
    }
    Alert.alert(t(`${ed}.confirmDelete`), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t(kind === "promo" ? "promoEditor.deletePromo" : "prologueEditor.deletePrologue"),
        style: "destructive",
        onPress: () =>
          void run("delete", async () => {
            await apiFetch(base, { method: "DELETE", auth: "required" });
            await data.refresh();
          }),
      },
    ]);
  }

  const requestRemoval = () =>
    run("removal", async () => {
      await apiFetch(`${base}/deletion-request`, { method: "POST", auth: "required", json: { reason: reason.trim() } });
      setRemovalOpen(false);
      setReason("");
      say(t("myWorks.deletionRequested"));
      await data.refresh();
    });

  const status = locked
    ? t(revisionMode ? "promoEditor.revisionPendingTitle" : "promoEditor.statusPendingTitle")
    : encoding
      ? t("promoEditor.statusEncodingTitle")
      : doc?.platformStatus
        ? t(`myWorks.status.${doc.platformStatus}`)
        : t(kind === "promo" ? "myWorks.promoNone" : "myWorks.prologueNone");

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), gap: space(3), paddingBottom: space(12) }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t(kind === "promo" ? "myWorks.editPromo" : "myWorks.editPrologue") }} />
      <Text style={styles.status}>{status}</Text>
      {revisionMode && !locked ? <Text style={styles.hint}>{t("promoEditor.revisionModeHint")}</Text> : null}

      {kind === "promo" && file ? (
        <>
          <Text style={styles.hint}>{t("uploader.promoCropHint")}</Text>
          <CropFrameEditor
            sourceWidth={file.width}
            sourceHeight={file.height}
            frameAspect={PORTRAIT_FRAME_ASPECT}
            crop={crop}
            onChange={setCrop}
            label={t("uploader.promoCropDragLabel")}
          >
            <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
          </CropFrameEditor>
        </>
      ) : previewUrl ? (
        <View style={[styles.preview, kind === "promo" && { aspectRatio: 9 / 16, width: "60%", alignSelf: "center" }]}>
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls fullscreenOptions={{ enable: true }} />
        </View>
      ) : null}

      {!locked ? (
        <>
          <Button variant="secondary" label={file ? file.fileName : t("uploader.dropzoneTitle")} disabled={busy !== null} onPress={choose} />
          {file ? (
            <Button
              label={busy === "upload" ? `${Math.round(progress * 100)}%` : t(kind === "promo" ? "promoEditor.uploadPromoVideo" : "uploader.dropzoneTitle")}
              loading={busy === "upload" && progress === 0}
              disabled={busy !== null}
              onPress={uploadVideo}
            />
          ) : null}
          {encoding ? <Text style={styles.hint}>{t("promoEditor.encodingAutoRefresh")}</Text> : null}

          <Text style={styles.label}>{t("promoEditor.promoTitle")}</Text>
          <TextInput value={title} onChangeText={setTitle} maxLength={200} style={styles.input} />
          <Text style={styles.label}>{t("promoEditor.promoDescription")}</Text>
          <TextInput value={description} onChangeText={setDescription} multiline style={[styles.input, styles.multiline]} />
          <Button variant="secondary" label={t("promoEditor.saveMeta")} loading={busy === "meta"} disabled={busy !== null || !doc} onPress={saveMeta} />
          {canSubmit ? (
            <Button label={t(`${ed}.submitReview`)} loading={busy === "submit"} disabled={busy !== null} onPress={submit} />
          ) : null}
          {doc ? (
            <Button
              variant="secondary"
              label={doc.platformStatus === "published" ? t("myWorks.requestRemoval") : t(kind === "promo" ? "promoEditor.deletePromo" : "prologueEditor.deletePrologue")}
              disabled={busy !== null}
              onPress={remove}
            />
          ) : null}
        </>
      ) : null}
      {msg ? <Text style={[styles.hint, { color: msg.ok ? colors.success : colors.destructive }]}>{msg.text}</Text> : null}

      <Modal visible={removalOpen} transparent animationType="fade" onRequestClose={() => setRemovalOpen(false)}>
        <View style={styles.scrim}>
          <View style={styles.sheet}>
            <Text style={styles.status}>{t("myWorks.requestRemoval")}</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={t("myWorks.deletionReasonPrompt")}
              placeholderTextColor={colors.ink4}
              maxLength={500}
              multiline
              style={[styles.input, styles.multiline]}
            />
            <Button variant="secondary" label={t("myWorks.requestRemoval")} loading={busy === "removal"} disabled={busy !== null || !reason.trim()} onPress={requestRemoval} />
            <Button variant="secondary" label={t("common.cancel")} onPress={() => setRemovalOpen(false)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  status: { ...type.h3, color: colors.ink },
  hint: { ...type.small, color: colors.ink3 },
  label: { ...type.small, color: colors.ink2, marginTop: space(2) },
  preview: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.card, overflow: "hidden", backgroundColor: "#000" },
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
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: space(6) },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.card, padding: space(4), gap: space(3) },
});
