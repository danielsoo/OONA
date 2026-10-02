import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { closestVideoAspectRatio } from "@/lib/works/aspect-ratio";
import { validatePromoClipRange, type PromoTrimRange } from "@/lib/works/promo-clip";
import { defaultPromoFrameCrop } from "@/lib/works/promo-crop";
import { CATALOG_THUMBNAIL_FRAME_ASPECT, PORTRAIT_FRAME_ASPECT } from "@/lib/works/promo-crop-interaction-pure";
import { PROMO_MAX_DURATION_SEC, validatePromoVideoDimensions, validatePromoVideoDuration } from "@/lib/works/promo-video";
import { uploadPercentForPhase, uploadPercentForSubmitPhase, type UploadPhase } from "@/lib/works/upload-progress";
import type { SchoolSuggestion } from "@/types/school";
import type { PromoFrameCrop, WorkSection } from "@/types/work";
import { CropFrameEditor } from "~/components/CropFrameEditor";
import { CreditTagger } from "~/components/CreditTagger";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Button } from "~/components/ui";
import { appText } from "~/lib/appCopy";
import { useAuth } from "~/lib/auth";
import { apiFetch } from "~/lib/api";
import { useLocale } from "~/lib/locale";
import {
  createWork,
  patchStaging,
  sendCollabInvite,
  submitForReview,
  uploadStagingVideo,
  uploadThumbnail,
  type CreditDraft,
  type InviteDraft,
  type PickedMedia,
} from "~/lib/upload";
import { colors, radius, space, type } from "~/theme";

type StepId = "fullWork" | "catalog" | "credits" | "prologue" | "promo";
const STEPS: StepId[] = ["fullWork", "catalog", "credits", "prologue", "promo"];
const SECTIONS: WorkSection[] = ["movies", "series", "entertainment"];
const MAX_THUMBNAIL_BYTES = 10 * 1024 * 1024; // storage.rules, same as the website

async function pick(kind: "videos" | "images"): Promise<PickedMedia | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kind,
    allowsMultipleSelection: false,
    quality: 1,
    // Keep the original file: no iOS re-encode before upload.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? asset.uri.split("/").pop() ?? (kind === "videos" ? "video.mp4" : "image.jpg"),
    mimeType: asset.mimeType ?? (kind === "videos" ? "video/mp4" : "image/jpeg"),
    fileSize: asset.fileSize ?? 0,
    width: asset.width,
    height: asset.height,
    duration: (asset.duration ?? 0) / 1000,
  };
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Upload studio: same steps, fields and API sequence as the website's /uploader/upload. */
export default function UploadScreen() {
  const { user, profile } = useAuth();
  const { t, locale } = useLocale();

  const [stepIndex, setStepIndex] = useState(0);
  const [full, setFull] = useState<PickedMedia | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [director, setDirector] = useState("");
  const [section, setSection] = useState<WorkSection>("movies");
  const [contentCategory, setContentCategory] = useState("");
  const [tags, setTags] = useState("");
  const [thumbnail, setThumbnail] = useState<PickedMedia | null>(null);
  const [thumbnailCrop, setThumbnailCrop] = useState<PromoFrameCrop>(defaultPromoFrameCrop);
  const [school, setSchool] = useState<SchoolSuggestion | null>(null);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolResults, setSchoolResults] = useState<SchoolSuggestion[]>([]);
  const [credits, setCredits] = useState<CreditDraft[]>([]);
  const [invites, setInvites] = useState<InviteDraft[]>([]);
  const [prologueChoice, setPrologueChoice] = useState<"upload" | "skip" | "">("");
  const [prologue, setPrologue] = useState<PickedMedia | null>(null);
  const [prologueTitle, setPrologueTitle] = useState("");
  const [promo, setPromo] = useState<PickedMedia | null>(null);
  const [promoCrop, setPromoCrop] = useState<PromoFrameCrop>(defaultPromoFrameCrop);
  // Muted looping preview under the 9:16 frame editor.
  const promoPlayer = useVideoPlayer(promo?.uri ?? null, (p) => {
    p.muted = true;
    p.loop = true;
    p.play();
  });
  const [promoTitle, setPromoTitle] = useState("");
  const [promoDescription, setPromoDescription] = useState("");
  const [trimStart, setTrimStart] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<UploadPhase | null>(null);
  const [percent, setPercent] = useState(0);
  const [notes, setNotes] = useState<string[]>([]);

  // School tagging (website SchoolPicker, GET /api/schools/suggest).
  useEffect(() => {
    const q = schoolQuery.trim();
    if (q.length < 2 || !user) {
      setSchoolResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      apiFetch<{ items?: SchoolSuggestion[] }>(`/api/schools/suggest?q=${encodeURIComponent(q)}`, { auth: "required" })
        .then((d) => !cancelled && setSchoolResults(d.items ?? []))
        .catch(() => !cancelled && setSchoolResults([]));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [schoolQuery, user]);

  if (!user) return <SignInPrompt />;

  const lockedDirector = profile?.defaultDirectorName?.trim() || "";
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const busy = phase !== null;
  const promoNeedsTrim = Boolean(promo && promo.duration > PROMO_MAX_DURATION_SEC);

  function promoTrimRange(): PromoTrimRange | null {
    if (!promo || !promoNeedsTrim) return null;
    const start = Math.max(0, Number(trimStart) || 0);
    return { startSec: start, endSec: Math.min(promo.duration, start + PROMO_MAX_DURATION_SEC) };
  }

  function validate(current: StepId): string | null {
    switch (current) {
      case "fullWork":
        if (!full) return t("uploader.errorNoFile");
        if (!full.fileSize) return t("uploader.errorUploadLengthRequired");
        if (!title.trim()) return t("uploader.errorTitleRequired");
        if (!description.trim()) return t("uploader.errorDescriptionRequired");
        return null;
      case "catalog":
        if (!thumbnail) return t("uploader.errorThumbnailRequired");
        if (!thumbnail.mimeType.startsWith("image/")) return t("uploader.errorThumbnailInvalidType");
        if (thumbnail.fileSize > MAX_THUMBNAIL_BYTES) return t("uploader.errorThumbnailTooLarge");
        return null;
      case "credits":
        return null;
      case "prologue":
        if (!prologueChoice) return t("uploader.errorPrologueChoiceRequired");
        if (prologueChoice === "upload" && !prologue) return t("uploader.errorPrologueVideoRequired");
        return null;
      case "promo": {
        if (!promo) return t("uploader.errorPromoVideoRequired");
        const dim = validatePromoVideoDimensions(promo.width, promo.height);
        if (dim === "too_small") return t("uploader.errorPromoTooSmall");
        if (dim) return t("uploader.errorPromoVideoInvalid");
        const dur = validatePromoVideoDuration(promo.duration);
        if (dur === "too_short") return t("uploader.errorPromoTooShort");
        if (dur === "invalid_duration") return t("uploader.errorPromoVideoInvalid");
        const range = promoTrimRange();
        if (range && validatePromoClipRange(range.startSec, range.endSec, promo.duration)) return t("uploader.errorPromoTrimInvalid");
        if (!promoTitle.trim()) return t("uploader.errorPromoTitleRequired");
        return null;
      }
    }
  }

  async function startUpload() {
    for (const s of STEPS) {
      const problem = validate(s);
      if (problem) {
        setError(problem);
        setStepIndex(STEPS.indexOf(s));
        return;
      }
    }
    if (!full || !thumbnail || !promo || !user) return;
    setError(null);
    setNotes([]);
    const withPrologue = prologueChoice === "upload" && prologue ? prologue : null;
    let staged = false;
    // A sleeping screen suspends the app and stops the upload.
    await activateKeepAwakeAsync("upload").catch(() => {});

    try {
      setPhase("creating");
      setPercent(uploadPercentForPhase("creating"));
      const tagList = tags.split(/[,#\s]+/).map((s) => s.trim()).filter(Boolean);
      const workId = await createWork({
        title: title.trim(),
        section,
        aspectRatio: closestVideoAspectRatio(full.width, full.height),
        uploadLength: full.fileSize,
        description: description.trim(),
        director: (lockedDirector || director.trim()) || undefined,
        contentCategory: contentCategory.trim() || undefined,
        tags: tagList.length > 0 ? tagList : undefined,
        schoolId: school?.id || undefined,
        schoolName: school?.name || undefined,
        promoDraft: { title: promoTitle.trim(), description: promoDescription.trim() || undefined },
        prologueDraft: withPrologue ? { title: prologueTitle.trim() || title.trim() || undefined } : undefined,
        credits: credits.map((c, i) => ({ userId: c.userId, role: c.role, sortOrder: i })),
      });

      setPhase("thumbnail");
      await uploadThumbnail(user.uid, workId, thumbnail, thumbnailCrop, (r) => setPercent(uploadPercentForPhase("thumbnail", r)));

      setPhase("full");
      const fullStaged = await uploadStagingVideo(user.uid, workId, "full", full, (r) => setPercent(uploadPercentForPhase("full", r)));
      let prologueStaged: Awaited<ReturnType<typeof uploadStagingVideo>> | null = null;
      if (withPrologue) {
        setPhase("prologue");
        prologueStaged = await uploadStagingVideo(user.uid, workId, "prologue", withPrologue, (r) =>
          setPercent(uploadPercentForPhase("prologue", r))
        );
      }
      setPhase("promo");
      const promoStaged = await uploadStagingVideo(user.uid, workId, "promo", promo, (r) => setPercent(uploadPercentForPhase("promo", r)));
      const range = promoTrimRange();

      setPhase("finalizing");
      setPercent(uploadPercentForPhase("finalizing"));
      await patchStaging(workId, {
        full: {
          ...fullStaged,
          originalFileName: full.fileName,
          width: full.width,
          height: full.height,
          durationSec: full.duration,
        },
        ...(prologueStaged ? { prologue: prologueStaged } : {}),
        promo: { ...promoStaged, ...(range ? { trimStartSec: range.startSec, trimEndSec: range.endSec } : {}) },
      });
      staged = true;

      const inviteNotes: string[] = [];
      for (const inv of invites) {
        try {
          const res = await sendCollabInvite(workId, inv, locale);
          if (res.emailSent) inviteNotes.push(t("uploader.inviteEmailSent", { email: inv.email }));
          else if (res.emailFallbackUrl) inviteNotes.push(t("uploader.inviteEmailShareLink", { email: inv.email, url: res.emailFallbackUrl }));
          else inviteNotes.push(t("uploader.inviteEmailFailed", { email: inv.email, message: res.message ?? "unknown" }));
        } catch (err) {
          inviteNotes.push(t("uploader.inviteEmailFailed", { email: inv.email, message: (err as Error).message }));
        }
      }
      setNotes(inviteNotes);

      const phaseMap = { full_upload: "streamFull", prologue_upload: "streamPrologue", promo_upload: "streamPromo", encoding: "encoding", done: "encoding" } as const;
      await submitForReview({
        workId,
        full,
        prologue: withPrologue,
        promo,
        frameCrop: promoCrop,
        promoTrimRange: range,
        onProgress: (p, ratio) => {
          setPhase(phaseMap[p]);
          setPercent(uploadPercentForSubmitPhase(p, ratio));
        },
      });
      setPercent(100);
      router.replace("/my-works");
    } catch (err) {
      const message = (err as Error).message;
      setError(staged ? `${message}\n\n${t("uploader.errorSubmitReviewStagedSaved")}` : message);
    } finally {
      setPhase(null);
      void deactivateKeepAwake("upload").catch(() => {});
    }
  }

  const pickButton = (label: string, media: PickedMedia | null, onPick: () => void) => (
    <Pressable onPress={onPick} disabled={busy} style={styles.picker}>
      <Text style={styles.pickerTitle}>{media ? t("uploader.dropzoneChangeFile") : label}</Text>
      {media ? (
        <Text style={styles.hint}>
          {media.fileName} · {media.width}×{media.height}
          {media.duration ? ` · ${formatDuration(media.duration)}` : ""}
        </Text>
      ) : null}
    </Pressable>
  );

  const input = (value: string, onChange: (v: string) => void, placeholder?: string, multiline = false) => (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.ink4}
      multiline={multiline}
      editable={!busy}
      style={[styles.input, multiline && { minHeight: 110, paddingTop: space(3), textAlignVertical: "top" }]}
    />
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.progressText}>{t("uploader.uploadStepProgress", { current: stepIndex + 1, total: STEPS.length })}</Text>

        {step === "fullWork" ? (
          <View style={styles.section}>
            <Text style={styles.title}>{t("uploader.uploadZoneFullWorkTitle")}</Text>
            <Text style={styles.hint}>{t("uploader.uploadZoneFullWorkHint")}</Text>
            {pickButton(t("uploader.dropzoneTitle"), full, async () => setFull((await pick("videos")) ?? full))}
            <Text style={styles.label}>{t("uploader.uploadTitleLabel")}</Text>
            {input(title, setTitle, t("uploader.uploadTitlePlaceholder"))}
            <Text style={styles.label}>{t("uploader.uploadDescriptionLabel")}</Text>
            {input(description, setDescription, t("uploader.uploadDescriptionPlaceholder"), true)}
            <Text style={styles.label}>{t("uploader.uploadDirectorLabel")}</Text>
            {lockedDirector ? (
              <Text style={styles.hint}>
                {t("uploader.uploadDirectorDisplayValue", { name: lockedDirector })}
                {"\n"}
                {t("uploader.uploadDirectorReadOnlyHint")}
              </Text>
            ) : (
              input(director, setDirector, t("uploader.uploadDirectorPlaceholder"))
            )}
          </View>
        ) : null}

        {step === "catalog" ? (
          <View style={styles.section}>
            <Text style={styles.title}>{t("uploader.uploadZoneCatalogTitle")}</Text>
            <Text style={styles.hint}>{t("uploader.uploadZoneCatalogHint")}</Text>
            <Text style={styles.label}>{t("uploader.uploadSectionLabel")}</Text>
            <View style={styles.chips}>
              {SECTIONS.map((s) => (
                <Pressable key={s} onPress={() => setSection(s)} style={[styles.chip, section === s && styles.chipActive]}>
                  <Text style={[styles.chipText, section === s && { color: colors.ink }]}>{t(`nav.${s}`)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>{t("uploader.uploadContentCategoryLabel")}</Text>
            {input(contentCategory, setContentCategory, t("uploader.uploadContentCategoryPlaceholder"))}
            <Text style={styles.label}>{t("uploader.uploadTagsLabel")}</Text>
            {input(tags, setTags, "#")}
            <Text style={styles.label}>{t("uploader.schoolPickerLabel")}</Text>
            {school ? (
              <Pressable onPress={() => setSchool(null)} style={[styles.chip, styles.chipActive, { alignSelf: "flex-start" }]}>
                <Text style={[styles.chipText, { color: colors.ink }]}>{school.name} ✕</Text>
              </Pressable>
            ) : (
              <>
                {input(schoolQuery, setSchoolQuery, t("uploader.schoolPickerPlaceholder"))}
                <Text style={styles.hint}>{t("uploader.schoolPickerHint")}</Text>
                {schoolResults.slice(0, 6).map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      setSchool(s);
                      setSchoolQuery("");
                    }}
                    style={{ paddingVertical: space(2) }}
                  >
                    <Text style={{ ...type.body, color: colors.ink }}>{s.name}</Text>
                  </Pressable>
                ))}
              </>
            )}
            <Text style={styles.label}>{t("uploader.catalogThumbnailPreviewTitle")}</Text>
            {thumbnail && thumbnail.width > 0 ? (
              <>
                <Text style={styles.hint}>{t("uploader.thumbnailCropHint")}</Text>
                <CropFrameEditor
                  sourceWidth={thumbnail.width}
                  sourceHeight={thumbnail.height}
                  frameAspect={CATALOG_THUMBNAIL_FRAME_ASPECT}
                  crop={thumbnailCrop}
                  onChange={setThumbnailCrop}
                  label={t("uploader.catalogThumbnailPreviewTitle")}
                >
                  <Image source={{ uri: thumbnail.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
                </CropFrameEditor>
              </>
            ) : thumbnail ? (
              <Image source={{ uri: thumbnail.uri }} style={styles.thumbPreview} contentFit="cover" />
            ) : null}
            {pickButton(t("uploader.catalogThumbnailPreviewTitle"), thumbnail, async () => {
              const next = await pick("images");
              if (!next) return;
              setThumbnail(next);
              setThumbnailCrop(defaultPromoFrameCrop());
            })}
            <Text style={styles.hint}>{t("uploader.catalogThumbnailPreviewHint")}</Text>
          </View>
        ) : null}

        {step === "credits" ? (
          <View style={styles.section}>
            <Text style={styles.title}>{t("watch.tabs.credits")}</Text>
            <CreditTagger credits={credits} invites={invites} onChangeCredits={setCredits} onChangeInvites={setInvites} />
          </View>
        ) : null}

        {step === "prologue" ? (
          <View style={styles.section}>
            <Text style={styles.title}>{t("uploader.uploadZonePrologueTitle")}</Text>
            <Text style={styles.hint}>{t("uploader.uploadZonePrologueHint")}</Text>
            <View style={styles.chips}>
              {(["upload", "skip"] as const).map((c) => (
                <Pressable key={c} onPress={() => setPrologueChoice(c)} style={[styles.chip, prologueChoice === c && styles.chipActive]}>
                  <Text style={[styles.chipText, prologueChoice === c && { color: colors.ink }]}>
                    {t(c === "upload" ? "uploader.prologueChoiceUpload" : "uploader.prologueChoiceSkip")}
                  </Text>
                </Pressable>
              ))}
            </View>
            {prologueChoice === "upload" ? (
              <>
                {pickButton(t("uploader.dropzoneTitle"), prologue, async () => setPrologue((await pick("videos")) ?? prologue))}
                <Text style={styles.label}>{t("uploader.prologueTitleLabel")}</Text>
                {input(prologueTitle, setPrologueTitle)}
              </>
            ) : null}
          </View>
        ) : null}

        {step === "promo" ? (
          <View style={styles.section}>
            <Text style={styles.title}>{t("uploader.uploadZonePromoTitle")}</Text>
            <Text style={styles.hint}>{t("uploader.promoVideoFileHint")}</Text>
            {pickButton(t("uploader.dropzoneTitle"), promo, async () => {
              const next = await pick("videos");
              if (!next) return;
              setPromo(next);
              setPromoCrop(defaultPromoFrameCrop());
            })}
            {promo && promo.width > 0 ? (
              <>
                <Text style={styles.hint}>{t("uploader.promoCropHint")}</Text>
                <CropFrameEditor
                  sourceWidth={promo.width}
                  sourceHeight={promo.height}
                  frameAspect={PORTRAIT_FRAME_ASPECT}
                  crop={promoCrop}
                  onChange={setPromoCrop}
                  label={t("uploader.promoCropDragLabel")}
                >
                  <VideoView player={promoPlayer} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
                </CropFrameEditor>
              </>
            ) : null}
            {promoNeedsTrim ? (
              <>
                <Text style={styles.label}>
                  {`${appText(locale, "promoTrimStart")} · ${formatDuration(promoTrimRange()!.startSec)}–${formatDuration(promoTrimRange()!.endSec)}`}
                </Text>
                <TextInput value={trimStart} onChangeText={setTrimStart} keyboardType="number-pad" style={styles.input} />
              </>
            ) : null}
            <Text style={styles.label}>{t("promoEditor.promoTitle")}</Text>
            {input(promoTitle, setPromoTitle)}
            <Text style={styles.label}>{t("promoEditor.promoDescription")}</Text>
            {input(promoDescription, setPromoDescription, undefined, true)}
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notes.map((n) => (
          <Text key={n} style={styles.hint}>
            {n}
          </Text>
        ))}

        {busy ? (
          <View style={{ gap: space(2) }}>
            <Text style={styles.label}>{t(`uploader.uploadPhase.${phase}`)}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${percent}%` }]} />
            </View>
            <Text style={styles.hint}>{percent}%</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            {stepIndex > 0 ? (
              <Button variant="secondary" label={t("common.previous")} onPress={() => setStepIndex((i) => i - 1)} style={{ flex: 1 }} />
            ) : null}
            <Button
              label={isLast ? t("uploader.uploadSubmitReview") : t("common.next")}
              onPress={() => {
                const problem = validate(step);
                if (problem) {
                  setError(problem);
                  return;
                }
                setError(null);
                if (isLast) void startUpload();
                else setStepIndex((i) => i + 1);
              }}
              style={{ flex: 2 }}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space(4), gap: space(4), paddingBottom: space(12) },
  progressText: { ...type.small, color: colors.ink3 },
  section: { gap: space(2) },
  title: { ...type.h2, color: colors.ink },
  label: { ...type.small, color: colors.ink2, marginTop: space(3) },
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
  picker: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.lineStrong,
    borderRadius: radius.card,
    padding: space(5),
    alignItems: "center",
    gap: space(1),
    marginTop: space(2),
  },
  pickerTitle: { ...type.body, color: colors.ink, fontWeight: "600" },
  thumbPreview: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.card, backgroundColor: colors.card },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: space(4),
    paddingVertical: space(2),
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: "rgba(61,125,255,0.12)" },
  chipText: { ...type.small, color: colors.ink2 },
  error: { ...type.small, color: colors.destructive },
  actions: { flexDirection: "row", gap: space(3) },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.card, overflow: "hidden" },
  fill: { height: 6, backgroundColor: colors.accent },
});
