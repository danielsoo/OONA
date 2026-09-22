"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import UploaderSubmitFooter from "@/components/uploader/UploaderSubmitFooter";
import ErrorReportModal from "@/components/report/ErrorReportModal";
import AspectRatioPicker from "@/components/uploader/AspectRatioPicker";
import PromoShortFields from "@/components/uploader/PromoShortFields";
import PromoCropFrameEditor from "@/components/uploader/PromoCropFrameEditor";
import SubmissionSurfacePreviews from "@/components/uploader/SubmissionSurfacePreviews";
import ThumbnailPreviewStages from "@/components/uploader/ThumbnailPreviewStages";
import UploaderCropPreviewGrid from "@/components/uploader/UploaderCropPreviewGrid";
import UploaderFormSection from "@/components/uploader/UploaderFormSection";
import UploaderFormShell from "@/components/uploader/UploaderFormShell";
import UploadWizardStepper, {
  type UploadWizardStepMeta,
} from "@/components/uploader/UploadWizardStepper";
import { uploaderInputClass } from "@/components/uploader/uploaderFormStyles";
import ThumbnailUploadField from "@/components/uploader/ThumbnailUploadField";
import VideoUploadDropzone from "@/components/uploader/VideoUploadDropzone";
import type { PromoTrimRange } from "@/lib/works/promo-clip";
import WorkTagInput from "@/components/uploader/WorkTagInput";
import SchoolPicker, { type SchoolPickerValue } from "@/components/uploader/SchoolPicker";
import CreditTagInput, {
  type PendingEmailInvite,
  type TaggedCredit,
} from "@/components/network/CreditTagInput";
import { useLocale, useTranslations } from "@/context/LocaleContext";
import { useImageFileMetadata } from "@/hooks/useImageFileMetadata";
import { useVideoFileMetadata } from "@/hooks/useVideoFileMetadata";
import {
  aspectRatioMessageKey,
  aspectRatioNumeric,
  closestVideoAspectRatio,
  defaultAspectRatioForSection,
  videoDimensionsMatchAspectRatio,
} from "@/lib/works/aspect-ratio";
import {
  formatApiError,
  formatClientError,
  readResponseJson,
  type ApiErrorBody,
} from "@/lib/clientErrors";
import { patchWorkStagingMeta } from "@/lib/works/patch-work-staging";
import { useUploadLeaveGuard } from "@/hooks/useUploadLeaveGuard";
import {
  applySubmitProgress,
  uploadPercentForPhase,
  uploadPercentForThumbnail,
  type UploadPhase,
} from "@/lib/works/upload-progress";
import { submitStagedWorkForReview } from "@/lib/works/submit-for-review";
import { uploadStagingVideo } from "@/lib/works/work-video-staging";
import { defaultPromoFrameCrop, normalizePromoFrameCrop } from "@/lib/works/promo-crop";
import { CATALOG_THUMBNAIL_FRAME_ASPECT } from "@/lib/works/promo-crop-interaction";
import {
  patchPromoThumbnailUrl,
  uploadPromoThumbnail,
  validatePromoThumbnailFile,
} from "@/lib/works/promoThumbnailUpload";
import { getPromoFileValidationError } from "@/lib/works/promo-file-validation";
import { validatePromoClipRange } from "@/lib/works/promo-clip";
import { PROMO_MAX_DURATION_SEC } from "@/lib/works/promo-video";
import {
  classifySourceVideoQuality,
  sourceVideoQualityLabel,
} from "@/lib/works/source-video-quality";
import { getPrologueFileValidationError } from "@/lib/works/prologue-file-validation";
import PrologueUploadChoiceTiles, {
  type PrologueUploadChoice,
} from "@/components/uploader/PrologueUploadChoiceTiles";
import { normalizeTags } from "@/lib/works/label-utils";
import {
  clearNamedUploadDraftFiles,
  clearNamedUploadDraftState,
  readNamedUploadDraftFile,
  readNamedUploadDraftState,
  writeNamedUploadDraftFile,
  writeNamedUploadDraftState,
} from "@/lib/upload-draft-store";
import {
  WORK_SECTIONS,
  type PromoFrameCrop,
  type VideoAspectRatio,
  type WorkSection,
} from "@/types/work";
import type { User } from "firebase/auth";

type UploadStepId = "fullWork" | "catalog" | "prologue" | "promo" | "preview";

const UPLOAD_STEPS: UploadStepId[] = ["fullWork", "catalog", "prologue", "promo", "preview"];

const UPLOAD_STEP_META: UploadWizardStepMeta[] = [
  {
    id: "fullWork",
    titleKey: "uploader.uploadZoneFullWorkTitle",
    hintKey: "uploader.uploadZoneFullWorkHint",
  },
  {
    id: "catalog",
    titleKey: "uploader.uploadZoneCatalogTitle",
    hintKey: "uploader.uploadZoneCatalogHint",
  },
  {
    id: "prologue",
    titleKey: "uploader.uploadZonePrologueTitle",
    hintKey: "uploader.uploadZonePrologueHint",
  },
  {
    id: "promo",
    titleKey: "uploader.uploadZonePromoTitle",
    hintKey: "uploader.uploadZonePromoHint",
  },
  {
    id: "preview",
    titleKey: "uploader.uploadZonePreviewTitle",
    hintKey: "uploader.uploadZonePreviewHint",
  },
];

type Props = {
  user: User;
  draftId: string;
  restoreDraft: boolean;
  initialDirector?: string | null;
  initialSchoolNameHint?: string | null;
  onSuccess: (payload: { workId: string; message: string }) => void;
  onError: (message: string) => void;
};

type CollabInvitePostResponse = {
  emailSent?: boolean;
  emailFallbackUrl?: string;
  emailSendReason?: "not_configured" | "provider_error";
  emailErrorHint?: string;
  message?: string;
  error?: string;
};

type UploadDraftState = {
  stepIndex: number;
  title: string;
  section: WorkSection;
  aspectRatio: VideoAspectRatio;
  aspectRatioManuallyChanged: boolean;
  contentCategory: string;
  tags: string[];
  school: SchoolPickerValue;
  credits: TaggedCredit[];
  pendingEmailInvites: PendingEmailInvite[];
  director: string;
  description: string;
  thumbnailCrop: PromoFrameCrop;
  prologueChoice: PrologueUploadChoice | null;
  prologueTitle: string;
  prologueDescription: string;
  promoCrop: PromoFrameCrop;
  promoTitle: string;
  promoDescription: string;
  promoTrimRange: PromoTrimRange | null;
};

type DraftStatus = "idle" | "saving" | "saved" | "restored" | "error";
type RequiredFieldTarget =
  | "fullFile"
  | "title"
  | "description"
  | "thumbnail"
  | "prologueChoice"
  | "prologueFile"
  | "promoFile"
  | "promoTrim"
  | "promoTitle";

export default function UploaderUploadForm({
  user,
  draftId,
  restoreDraft,
  initialDirector,
  initialSchoolNameHint,
  onSuccess,
  onError,
}: Props) {
  const { t } = useTranslations();
  const { locale } = useLocale();
  const [stepIndex, setStepIndex] = useState(0);
  const [requiredFieldError, setRequiredFieldError] = useState<{
    target: RequiredFieldTarget;
    message: string;
  } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fullVideoMeta = useVideoFileMetadata(file);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailCrop, setThumbnailCrop] = useState<PromoFrameCrop>(defaultPromoFrameCrop());
  const thumbnailImageMeta = useImageFileMetadata(thumbnailFile ?? thumbnailPreview);
  const [thumbnailFieldError, setThumbnailFieldError] = useState<string | null>(null);
  const [prologueChoice, setPrologueChoice] = useState<PrologueUploadChoice | null>(null);
  const [prologueFile, setPrologueFile] = useState<File | null>(null);
  const prologueMeta = useVideoFileMetadata(prologueFile);
  const [prologueTitle, setPrologueTitle] = useState("");
  const [prologueDescription, setPrologueDescription] = useState("");
  const [promoFile, setPromoFile] = useState<File | null>(null);
  const promoMeta = useVideoFileMetadata(promoFile);
  const [promoTrimRange, setPromoTrimRange] = useState<PromoTrimRange | null>(null);
  const [promoCrop, setPromoCrop] = useState<PromoFrameCrop>(defaultPromoFrameCrop());
  const [title, setTitle] = useState("");
  const [section, setSection] = useState<WorkSection>("movies");
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("16:9");
  const [aspectRatioManuallyChanged, setAspectRatioManuallyChanged] = useState(false);
  const [contentCategory, setContentCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [school, setSchool] = useState<SchoolPickerValue>(null);
  const [credits, setCredits] = useState<TaggedCredit[]>([]);
  const [pendingEmailInvites, setPendingEmailInvites] = useState<PendingEmailInvite[]>([]);
  const directorLocked = Boolean(initialDirector?.trim());
  const lockedDirectorName = initialDirector?.trim() ?? "";
  const [director, setDirector] = useState(lockedDirectorName);
  const [description, setDescription] = useState("");
  const [promoTitle, setPromoTitle] = useState("");
  const [promoDescription, setPromoDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadErrorCode, setUploadErrorCode] = useState<string | null>(null);
  const [uploadErrorReportable, setUploadErrorReportable] = useState(false);
  const [uploadErrorService, setUploadErrorService] = useState<string | null>(null);
  const [errorReportOpen, setErrorReportOpen] = useState(false);
  const [inviteEmailSummaryLines, setInviteEmailSummaryLines] = useState<string[]>([]);
  const footerRef = useRef<HTMLDivElement>(null);
  const [fullPlaybackUrl, setFullPlaybackUrl] = useState<string | null>(null);
  const [promoPlaybackUrl, setPromoPlaybackUrl] = useState<string | null>(null);
  const [prologuePlaybackUrl, setProloguePlaybackUrl] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("idle");
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullFileRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const prologueChoiceRef = useRef<HTMLDivElement>(null);
  const prologueFileRef = useRef<HTMLDivElement>(null);
  const promoFileRef = useRef<HTMLDivElement>(null);
  const promoTitleRef = useRef<HTMLDivElement>(null);

  const currentStep = UPLOAD_STEPS[stepIndex] ?? "fullWork";
  const isLastStep = stepIndex === UPLOAD_STEPS.length - 1;
  const progress = ((stepIndex + 1) / UPLOAD_STEPS.length) * 100;

  const draftSnapshot = useMemo<UploadDraftState>(
    () => ({
      stepIndex,
      title,
      section,
      aspectRatio,
      aspectRatioManuallyChanged,
      contentCategory,
      tags,
      school,
      credits,
      pendingEmailInvites,
      director,
      description,
      thumbnailCrop,
      prologueChoice,
      prologueTitle,
      prologueDescription,
      promoCrop,
      promoTitle,
      promoDescription,
      promoTrimRange,
    }),
    [
      stepIndex,
      title,
      section,
      aspectRatio,
      aspectRatioManuallyChanged,
      contentCategory,
      tags,
      school,
      credits,
      pendingEmailInvites,
      director,
      description,
      thumbnailCrop,
      prologueChoice,
      prologueTitle,
      prologueDescription,
      promoCrop,
      promoTitle,
      promoDescription,
      promoTrimRange,
    ]
  );

  const draftSummary = useMemo(
    () => ({
      title: title.trim(),
      section,
      stepIndex,
      fileName: file?.name,
    }),
    [file?.name, section, stepIndex, title]
  );

  const hasMeaningfulDraft = Boolean(
    file ||
      thumbnailFile ||
      prologueFile ||
      promoFile ||
      title.trim() ||
      description.trim() ||
      contentCategory.trim() ||
      tags.length ||
      credits.length
  );

  const reportError = useCallback(
    (
      message: string,
      options?: { code?: string; reportable?: boolean; service?: string }
    ) => {
      setUploadError(message);
      setUploadErrorCode(options?.code ?? null);
      setUploadErrorReportable(Boolean(options?.reportable));
      setUploadErrorService(options?.service ?? null);
      onError(message);
    },
    [onError]
  );

  useEffect(() => {
    let active = true;

    const restoreSavedDraft = async () => {
      try {
        if (!restoreDraft) {
          if (active) setDraftReady(true);
          return;
        }
        const stored = readNamedUploadDraftState<UploadDraftState>(user.uid, draftId);
        const [storedFull, storedThumbnail, storedPrologue, storedPromo] = await Promise.all([
          readNamedUploadDraftFile(user.uid, draftId, "full"),
          readNamedUploadDraftFile(user.uid, draftId, "thumbnail"),
          readNamedUploadDraftFile(user.uid, draftId, "prologue"),
          readNamedUploadDraftFile(user.uid, draftId, "promo"),
        ]);
        if (!active) return;

        if (stored) {
          const draft = stored.state;
          setStepIndex(Math.max(0, Math.min(draft.stepIndex ?? 0, UPLOAD_STEPS.length - 1)));
          setTitle(draft.title ?? "");
          setSection(draft.section ?? "movies");
          setAspectRatio(draft.aspectRatio ?? "16:9");
          setAspectRatioManuallyChanged(Boolean(draft.aspectRatioManuallyChanged));
          setContentCategory(draft.contentCategory ?? "");
          setTags(draft.tags ?? []);
          setSchool(draft.school ?? null);
          setCredits(draft.credits ?? []);
          setPendingEmailInvites(draft.pendingEmailInvites ?? []);
          if (!directorLocked) setDirector(draft.director ?? "");
          setDescription(draft.description ?? "");
          setThumbnailCrop(normalizePromoFrameCrop(draft.thumbnailCrop));
          setPrologueChoice(draft.prologueChoice ?? null);
          setPrologueTitle(draft.prologueTitle ?? "");
          setPrologueDescription(draft.prologueDescription ?? "");
          setPromoCrop(normalizePromoFrameCrop(draft.promoCrop));
          setPromoTitle(draft.promoTitle ?? "");
          setPromoDescription(draft.promoDescription ?? "");
          setPromoTrimRange(draft.promoTrimRange ?? null);
          setDraftSavedAt(stored.savedAt);
        }

        setFile(storedFull);
        setThumbnailFile(storedThumbnail);
        setThumbnailPreview(storedThumbnail ? URL.createObjectURL(storedThumbnail) : null);
        setPrologueFile(storedPrologue);
        setPromoFile(storedPromo);

        if (stored || storedFull || storedThumbnail || storedPrologue || storedPromo) {
          setDraftStatus("restored");
        }
      } catch {
        if (active) setDraftStatus("error");
      } finally {
        if (active) setDraftReady(true);
      }
    };

    void restoreSavedDraft();
    return () => {
      active = false;
    };
  }, [directorLocked, draftId, restoreDraft, user.uid]);

  useEffect(() => {
    if (!draftReady || busy || uploadComplete || !hasMeaningfulDraft) return;
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    setDraftStatus("saving");
    draftSaveTimerRef.current = setTimeout(() => {
      try {
        const savedAt = writeNamedUploadDraftState(
          user.uid,
          draftId,
          draftSnapshot,
          draftSummary
        );
        setDraftSavedAt(savedAt);
        setDraftStatus("saved");
      } catch {
        setDraftStatus("error");
      }
    }, 700);
    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [busy, draftId, draftReady, draftSnapshot, draftSummary, hasMeaningfulDraft, uploadComplete, user.uid]);

  useEffect(() => {
    if (!draftReady || !hasMeaningfulDraft) return;
    void writeNamedUploadDraftFile(user.uid, draftId, "full", file).catch(() => setDraftStatus("error"));
  }, [draftId, draftReady, file, hasMeaningfulDraft, user.uid]);

  useEffect(() => {
    if (!draftReady || !hasMeaningfulDraft) return;
    void writeNamedUploadDraftFile(user.uid, draftId, "thumbnail", thumbnailFile).catch(() =>
      setDraftStatus("error")
    );
  }, [draftId, draftReady, hasMeaningfulDraft, thumbnailFile, user.uid]);

  useEffect(() => {
    if (!draftReady || !hasMeaningfulDraft) return;
    void writeNamedUploadDraftFile(user.uid, draftId, "prologue", prologueFile).catch(() =>
      setDraftStatus("error")
    );
  }, [draftId, draftReady, hasMeaningfulDraft, prologueFile, user.uid]);

  useEffect(() => {
    if (!draftReady || !hasMeaningfulDraft) return;
    void writeNamedUploadDraftFile(user.uid, draftId, "promo", promoFile).catch(() =>
      setDraftStatus("error")
    );
  }, [draftId, draftReady, hasMeaningfulDraft, promoFile, user.uid]);

  const saveDraftNow = useCallback(async () => {
    if (busy || uploadComplete) return;
    setDraftStatus("saving");
    try {
      const savedAt = writeNamedUploadDraftState(
        user.uid,
        draftId,
        draftSnapshot,
        draftSummary
      );
      await Promise.all([
        writeNamedUploadDraftFile(user.uid, draftId, "full", file),
        writeNamedUploadDraftFile(user.uid, draftId, "thumbnail", thumbnailFile),
        writeNamedUploadDraftFile(user.uid, draftId, "prologue", prologueFile),
        writeNamedUploadDraftFile(user.uid, draftId, "promo", promoFile),
      ]);
      setDraftSavedAt(savedAt);
      setDraftStatus("saved");
    } catch {
      setDraftStatus("error");
    }
  }, [busy, draftId, draftSnapshot, draftSummary, file, prologueFile, promoFile, thumbnailFile, uploadComplete, user.uid]);

  const resetUploadForm = useCallback(
    (clearPersisted: boolean) => {
      setStepIndex(0);
      setRequiredFieldError(null);
      setFile(null);
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setThumbnailCrop(defaultPromoFrameCrop());
      setThumbnailFieldError(null);
      setPrologueChoice(null);
      setPrologueFile(null);
      setPrologueTitle("");
      setPrologueDescription("");
      setPromoFile(null);
      setPromoTrimRange(null);
      setPromoCrop(defaultPromoFrameCrop());
      setTitle("");
      setSection("movies");
      setAspectRatio("16:9");
      setAspectRatioManuallyChanged(false);
      setContentCategory("");
      setTags([]);
      setSchool(null);
      setCredits([]);
      setPendingEmailInvites([]);
      setDirector(lockedDirectorName);
      setDescription("");
      setPromoTitle("");
      setPromoDescription("");
      setUploadError(null);
      if (clearPersisted) {
        clearNamedUploadDraftState(user.uid, draftId);
        void clearNamedUploadDraftFiles(user.uid, draftId).catch(() => undefined);
        setDraftSavedAt(null);
        setDraftStatus("idle");
      }
    },
    [draftId, lockedDirectorName, user.uid]
  );

  useEffect(() => {
    if (!uploadError) return;
    footerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [uploadError]);

  useUploadLeaveGuard(busy || uploadComplete);

  const stepLabels: Record<UploadStepId, string> = useMemo(
    () => ({
      fullWork: t("uploader.uploadZoneFullWorkTitle"),
      catalog: t("uploader.uploadZoneCatalogTitle"),
      prologue: t("uploader.uploadZonePrologueTitle"),
      promo: t("uploader.uploadZonePromoTitle"),
      preview: t("uploader.uploadZonePreviewTitle"),
    }),
    [t]
  );

  const stepHints: Record<UploadStepId, string> = useMemo(
    () => ({
      fullWork: t("uploader.uploadZoneFullWorkHint"),
      catalog: t("uploader.uploadZoneCatalogHint"),
      prologue: t("uploader.uploadZonePrologueHint"),
      promo: t("uploader.uploadZonePromoHint"),
      preview: t("uploader.uploadZonePreviewHint"),
    }),
    [t]
  );

  useEffect(() => {
    if (!fullVideoMeta && !file) {
      setAspectRatio(defaultAspectRatioForSection(section));
    }
  }, [section, fullVideoMeta, file]);

  useEffect(() => {
    if (!fullVideoMeta || aspectRatioManuallyChanged) return;
    setAspectRatio(closestVideoAspectRatio(fullVideoMeta.width, fullVideoMeta.height));
    setAspectRatioManuallyChanged(false);
  }, [aspectRatioManuallyChanged, fullVideoMeta]);

  const detectedAspectRatio = fullVideoMeta
    ? closestVideoAspectRatio(fullVideoMeta.width, fullVideoMeta.height)
    : null;

  useEffect(() => {
    if (initialDirector?.trim()) {
      setDirector(initialDirector.trim());
    }
  }, [initialDirector]);

  useEffect(() => {
    if (title.trim() && !promoTitle.trim()) {
      setPromoTitle(title.trim());
    }
  }, [title, promoTitle]);

  const promoFileError = getPromoFileValidationError(Boolean(promoFile), promoMeta);
  const promoNeedsTrim = Boolean(
    promoMeta && promoMeta.duration > PROMO_MAX_DURATION_SEC
  );
  const promoTrimError =
    promoNeedsTrim && promoTrimRange && promoMeta
      ? validatePromoClipRange(
          promoTrimRange.startSec,
          promoTrimRange.endSec,
          promoMeta.duration
        )
      : promoNeedsTrim
        ? "invalid_clip"
        : null;
  const prologueFileError = getPrologueFileValidationError(
    Boolean(prologueFile),
    prologueMeta
  );

  useEffect(() => {
    if (!promoFile) {
      setPromoCrop(defaultPromoFrameCrop());
      return;
    }
    setPromoCrop((prev) => normalizePromoFrameCrop(prev));
  }, [promoFile, promoMeta]);

  useEffect(() => {
    if (!promoMeta || promoMeta.duration <= PROMO_MAX_DURATION_SEC) {
      setPromoTrimRange(null);
      return;
    }
    setPromoTrimRange((current) => {
      if (
        current &&
        !validatePromoClipRange(current.startSec, current.endSec, promoMeta.duration)
      ) {
        return current;
      }
      return { startSec: 0, endSec: PROMO_MAX_DURATION_SEC };
    });
  }, [promoMeta]);

  useEffect(() => {
    if (!file) {
      setFullPlaybackUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFullPlaybackUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!promoFile) {
      setPromoPlaybackUrl(null);
      return;
    }
    const url = URL.createObjectURL(promoFile);
    setPromoPlaybackUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [promoFile]);

  const scrollWizardTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const requiredFieldRef = (target: RequiredFieldTarget) => {
    switch (target) {
      case "fullFile":
        return fullFileRef;
      case "title":
        return titleRef;
      case "description":
        return descriptionRef;
      case "thumbnail":
        return thumbnailRef;
      case "prologueChoice":
        return prologueChoiceRef;
      case "prologueFile":
        return prologueFileRef;
      case "promoFile":
        return promoFileRef;
      case "promoTrim":
        return promoFileRef;
      case "promoTitle":
        return promoTitleRef;
    }
  };

  const showRequiredFieldError = (target: RequiredFieldTarget, message: string) => {
    setRequiredFieldError({ target, message });
    window.requestAnimationFrame(() => {
      requiredFieldRef(target).current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return false;
  };

  const clearRequiredFieldError = (target: RequiredFieldTarget) => {
    setRequiredFieldError((current) => (current?.target === target ? null : current));
  };

  const fieldHasError = (target: RequiredFieldTarget) =>
    requiredFieldError?.target === target;

  const renderRequiredFieldError = (target: RequiredFieldTarget) => {
    const message =
      requiredFieldError?.target === target ? requiredFieldError.message : null;
    return message ? (
      <p className="mt-2 text-xs leading-relaxed text-red-400" role="alert">
        {message}
      </p>
    ) : null;
  };

  const validateStep = (step: UploadStepId): boolean => {
    switch (step) {
      case "fullWork":
        if (!file) {
          return showRequiredFieldError("fullFile", t("uploader.errorNoFile"));
        }
        if (!title.trim()) {
          return showRequiredFieldError("title", t("uploader.errorTitleRequired"));
        }
        if (!description.trim()) {
          return showRequiredFieldError(
            "description",
            t("uploader.errorDescriptionRequired")
          );
        }
        return true;
      case "catalog":
        if (!thumbnailFile) {
          return showRequiredFieldError("thumbnail", t("uploader.errorThumbnailRequired"));
        }
        return true;
      case "prologue":
        if (!prologueChoice) {
          return showRequiredFieldError(
            "prologueChoice",
            t("uploader.errorPrologueChoiceRequired")
          );
        }
        if (prologueChoice === "skip") return true;
        if (!prologueFile) {
          return showRequiredFieldError(
            "prologueFile",
            t("uploader.errorPrologueVideoRequired")
          );
        }
        if (prologueFileError === "loading") {
          return showRequiredFieldError(
            "prologueFile",
            t("uploader.errorPrologueVideoLoading")
          );
        }
        if (prologueFileError) {
          return showRequiredFieldError(
            "prologueFile",
            t("uploader.errorPrologueVideoInvalid")
          );
        }
        return true;
      case "promo":
        if (!promoFile) {
          return showRequiredFieldError("promoFile", t("uploader.errorPromoVideoRequired"));
        }
        if (promoFileError === "loading") {
          return showRequiredFieldError("promoFile", t("uploader.errorPromoVideoLoading"));
        }
        if (promoFileError === "too_small") {
          return showRequiredFieldError("promoFile", t("uploader.errorPromoTooSmall"));
        }
        if (promoFileError === "too_short") {
          return showRequiredFieldError("promoFile", t("uploader.errorPromoTooShort"));
        }
        if (promoFileError === "too_long") {
          if (promoTrimError) {
            return showRequiredFieldError("promoTrim", t("uploader.errorPromoTrimInvalid"));
          }
        }
        if (promoFileError && promoFileError !== "too_long") {
          return showRequiredFieldError("promoFile", t("uploader.errorPromoVideoInvalid"));
        }
        if (!promoTitle.trim()) {
          return showRequiredFieldError("promoTitle", t("uploader.errorPromoTitleRequired"));
        }
        return true;
      case "preview":
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    setRequiredFieldError(null);
    if (!validateStep(currentStep)) return;
    setStepIndex((i) => Math.min(i + 1, UPLOAD_STEPS.length - 1));
    scrollWizardTop();
  };

  const handleBack = () => {
    setRequiredFieldError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
    scrollWizardTop();
  };

  const handleStepClick = (index: number) => {
    if (busy || index >= stepIndex) return;
    setRequiredFieldError(null);
    setStepIndex(index);
    scrollWizardTop();
  };

  const handleThumbnailChange = (next: File | null, preview: string | null) => {
    if (!next) {
      setThumbnailFieldError(null);
      setThumbnailFile(null);
      setThumbnailPreview(preview);
      return;
    }
    const validation = validatePromoThumbnailFile(next);
    if (validation === "type") {
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setThumbnailFieldError(t("uploader.errorThumbnailInvalidType"));
      return;
    }
    if (validation === "size") {
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setThumbnailFieldError(t("uploader.errorThumbnailTooLarge"));
      return;
    }
    setThumbnailFieldError(null);
    setThumbnailFile(next);
    setThumbnailPreview(preview);
    setThumbnailCrop(defaultPromoFrameCrop());
  };

  const renderAspectRatioControl = () => (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-xs text-xiio-muted">{t("uploader.uploadAspectRatioLabel")}</p>
        {fullVideoMeta && detectedAspectRatio ? (
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] ${
              aspectRatioManuallyChanged
                ? "border-white/15 bg-white/[0.04] text-white/55"
                : "border-xiio-accent/35 bg-xiio-accent/10 text-xiio-accent"
            }`}
          >
            {t(
              aspectRatioManuallyChanged
                ? "uploader.aspectRatioManualSelected"
                : "uploader.aspectRatioAutoDetected"
            )}
          </span>
        ) : null}
      </div>
      {fullVideoMeta && detectedAspectRatio ? (
        <p className="mb-3 text-xs leading-relaxed text-white/55">
          {aspectRatioManuallyChanged
            ? t("uploader.aspectRatioManualSelectedHint", {
                width: fullVideoMeta.width,
                height: fullVideoMeta.height,
                detected: t(aspectRatioMessageKey(detectedAspectRatio)),
                selected: t(aspectRatioMessageKey(aspectRatio)),
              })
            : t("uploader.aspectRatioAutoDetectedHint", {
                width: fullVideoMeta.width,
                height: fullVideoMeta.height,
                ratio: t(aspectRatioMessageKey(detectedAspectRatio)),
              })}
        </p>
      ) : (
        <p className="mb-3 text-xs leading-relaxed text-white/45">
          {t("uploader.uploadAspectRatioHint")}
        </p>
      )}
      <AspectRatioPicker
        value={aspectRatio}
        onChange={(next) => {
          setAspectRatio(next);
          setAspectRatioManuallyChanged(true);
        }}
        disabled={busy}
        showHint={false}
      />
      {fullVideoMeta &&
      !videoDimensionsMatchAspectRatio(
        fullVideoMeta.width,
        fullVideoMeta.height,
        aspectRatio
      ) ? (
        <p className="mt-2 text-xs leading-relaxed text-amber-300/80">
          {t("uploader.aspectRatioMismatchPreviewHint", {
            width: fullVideoMeta.width,
            height: fullVideoMeta.height,
          })}
        </p>
      ) : null}
    </div>
  );

  const handleUpload = async () => {
    if (
      !validateStep("fullWork") ||
      !validateStep("catalog") ||
      !validateStep("prologue") ||
      !validateStep("promo")
    ) {
      return;
    }
    if (!file) {
      reportError(t("uploader.errorNoFile"));
      return;
    }
    if (!file.size || !Number.isFinite(file.size)) {
      reportError(t("uploader.errorUploadLengthRequired"));
      return;
    }
    if (!title.trim()) {
      reportError(t("uploader.errorTitleRequired"));
      return;
    }
    if (!description.trim()) {
      reportError(t("uploader.errorDescriptionRequired"));
      return;
    }
    if (!thumbnailFile) {
      reportError(t("uploader.errorThumbnailRequired"));
      return;
    }
    if (!promoTitle.trim()) {
      reportError(t("uploader.errorPromoTitleRequired"));
      return;
    }
    if (!promoFile) {
      reportError(t("uploader.errorPromoVideoRequired"));
      return;
    }

    setBusy(true);
    setUploadComplete(false);
    setUploadError(null);
    setUploadErrorCode(null);
    setUploadErrorReportable(false);
    setUploadErrorService(null);
    setUploadPhase("creating");
    setUploadPercent(0);
    setRequiredFieldError(null);

    let stagingComplete = false;
    let succeeded = false;
    let keepProgressOnExit = false;

    try {
      let token: string;
      try {
        token = await user.getIdToken();
      } catch (authErr) {
        reportError(formatClientError(t, authErr, { titleKey: "uploader.errorUploadAuth" }), {
          code: "AUTH_TOKEN_FAILED",
          reportable: true,
          service: "Authentication",
        });
        return;
      }

      const tagList = normalizeTags(tags);
      const trimmedDescription = description.trim();
      let sessionRes: Response;
      try {
        sessionRes = await fetch("/api/stream/upload-url", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            section,
            aspectRatio,
            uploadLength: file.size,
            contentCategory: contentCategory.trim() || undefined,
            tags: tagList.length > 0 ? tagList : undefined,
            schoolId: school?.id || undefined,
            schoolName: school?.name || undefined,
            director: (directorLocked ? lockedDirectorName : director.trim()) || undefined,
            description: trimmedDescription,
            promoDraft: {
              title: promoTitle.trim(),
              description: promoDescription.trim() || undefined,
            },
            prologueDraft:
              prologueChoice === "upload"
                ? {
                    title: prologueTitle.trim() || title.trim() || undefined,
                    description: prologueDescription.trim() || undefined,
                  }
                : undefined,
            credits: credits.map(({ userId, role, sortOrder }) => ({
              userId,
              role,
              sortOrder,
            })),
          }),
        });
      } catch (fetchErr) {
        reportError(formatClientError(t, fetchErr, { titleKey: "uploader.errorUploadFailed" }), {
          code: "UPLOAD_SESSION_NETWORK",
          reportable: true,
          service: "Upload session",
        });
        return;
      }

      const { data: sessionData, raw: sessionRaw } = await readResponseJson<{
        workId?: string;
        staged?: boolean;
        error?: string;
        message?: string;
        detail?: string;
      }>(sessionRes);

      if (!sessionRes.ok) {
        const body: ApiErrorBody = sessionData.error || sessionData.message
          ? sessionData
          : { message: sessionRaw.slice(0, 800) || `HTTP ${sessionRes.status}` };
        reportError(formatApiError(t, sessionRes.status, body), {
          code: `UPLOAD_SESSION_HTTP_${sessionRes.status}`,
          reportable: sessionRes.status >= 500 || sessionRes.status === 401 || sessionRes.status === 403,
          service: "Upload session",
        });
        return;
      }

      const workId = sessionData.workId;
      if (!workId) {
        reportError(
          [
            t("uploader.errorNoUploadUrl"),
            sessionData.message
              ? `${t("common.errorDetail")}: ${sessionData.message}`
              : sessionRaw
                ? `${t("common.errorDetail")}: ${sessionRaw.slice(0, 300)}`
                : "",
          ]
            .filter(Boolean)
            .join("\n"),
          { code: "UPLOAD_SESSION_MISSING_WORK_ID", reportable: true, service: "Upload session" }
        );
        return;
      }

      setUploadPercent(uploadPercentForPhase("creating"));

      try {
        setUploadPhase("thumbnail");
        setUploadPercent(uploadPercentForPhase("creating"));
        const thumbUrl = await uploadPromoThumbnail(user.uid, workId, thumbnailFile, (ratio) => {
          setUploadPercent(uploadPercentForThumbnail(ratio));
        });
        await patchPromoThumbnailUrl(token, workId, {
          thumbnailUrl: thumbUrl,
          thumbnailCrop,
        });
        setUploadPercent(uploadPercentForPhase("thumbnail"));
      } catch (thumbErr) {
        reportError(
          formatClientError(t, thumbErr, { titleKey: "uploader.errorThumbnailUploadFailed" }),
          { code: "THUMBNAIL_UPLOAD_FAILED", reportable: true, service: "Media storage" }
        );
        return;
      }

      try {
        setUploadPhase("full");
        setUploadPercent(uploadPercentForPhase("full", 0));
        const fullStaged = await uploadStagingVideo(user.uid, workId, "full", file, (ratio) => {
          setUploadPercent(uploadPercentForPhase("full", ratio));
        });
        let prologueStaged: { path: string; bytes: number; contentType: string } | null = null;
        if (prologueChoice === "upload" && prologueFile) {
          setUploadPhase("prologue");
          setUploadPercent(uploadPercentForPhase("prologue", 0));
          prologueStaged = await uploadStagingVideo(
            user.uid,
            workId,
            "prologue",
            prologueFile,
            (ratio) => {
              setUploadPercent(uploadPercentForPhase("prologue", ratio));
            }
          );
        }
        setUploadPhase("promo");
        setUploadPercent(uploadPercentForPhase("promo", 0));
        const promoStaged = await uploadStagingVideo(user.uid, workId, "promo", promoFile, (ratio) => {
          setUploadPercent(uploadPercentForPhase("promo", ratio));
        });
        setUploadPhase("finalizing");
        setUploadPercent(uploadPercentForPhase("finalizing"));
        await patchWorkStagingMeta(token, workId, {
          full: {
            path: fullStaged.path,
            bytes: fullStaged.bytes,
            contentType: fullStaged.contentType,
            originalFileName: file.name,
            width: fullVideoMeta?.width,
            height: fullVideoMeta?.height,
            durationSec: fullVideoMeta?.duration,
          },
          ...(prologueStaged
            ? {
                prologue: {
                  path: prologueStaged.path,
                  bytes: prologueStaged.bytes,
                  contentType: prologueStaged.contentType,
                },
              }
            : {}),
          promo: {
            path: promoStaged.path,
            bytes: promoStaged.bytes,
            contentType: promoStaged.contentType,
            ...(promoNeedsTrim && promoTrimRange
              ? {
                  trimStartSec: promoTrimRange.startSec,
                  trimEndSec: promoTrimRange.endSec,
                }
              : {}),
          },
        });
        setUploadPercent(uploadPercentForPhase("finalizing"));
        stagingComplete = true;
      } catch (stageErr) {
        reportError(formatClientError(t, stageErr, { titleKey: "uploader.errorStagingUploadFailed" }), {
          code: "STORAGE_STAGING_FAILED",
          reportable: true,
          service: "Media storage",
        });
        return;
      }

      const inviteSummaryLines: string[] = [];
      if (pendingEmailInvites.length > 0) {
        for (const inv of pendingEmailInvites) {
          try {
            const inviteRes = await fetch(
              `/api/me/works/${encodeURIComponent(workId)}/collab-invites`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email: inv.email,
                  role: inv.role,
                  locale,
                }),
              }
            );
            const { data: inviteBody, raw: inviteRaw } =
              await readResponseJson<CollabInvitePostResponse>(inviteRes);
            if (!inviteRes.ok) {
              inviteSummaryLines.push(
                t("uploader.inviteEmailFailed", {
                  email: inv.email,
                  message:
                    (inviteBody.message ??
                      inviteBody.error ??
                      inviteRaw.slice(0, 200)) ||
                    `HTTP ${inviteRes.status}`,
                })
              );
              continue;
            }
            if (inviteBody.emailSent) {
              inviteSummaryLines.push(t("uploader.inviteEmailSent", { email: inv.email }));
            } else if (inviteBody.emailFallbackUrl) {
              inviteSummaryLines.push(
                t("uploader.inviteEmailShareLink", {
                  email: inv.email,
                  url: inviteBody.emailFallbackUrl,
                })
              );
            } else {
              inviteSummaryLines.push(
                t("uploader.inviteEmailFailed", {
                  email: inv.email,
                  message: inviteBody.emailErrorHint ?? inviteBody.message ?? "unknown",
                })
              );
            }
          } catch (inviteErr) {
            inviteSummaryLines.push(
              t("uploader.inviteEmailFailed", {
                email: inv.email,
                message: formatClientError(t, inviteErr, { titleKey: "myWorks.errorGeneric" }),
              })
            );
          }
        }
      }
      setInviteEmailSummaryLines(inviteSummaryLines);

      try {
        setUploadPhase("streamFull");
        await submitStagedWorkForReview({
          token,
          workId,
          frameCrop: promoCrop,
          fullFile: file,
          prologueFile: prologueChoice === "upload" ? prologueFile : null,
          promoFile,
          includePrologue: prologueChoice === "upload",
          promoTrimRange: promoNeedsTrim ? promoTrimRange : null,
          onProgress: (p) => applySubmitProgress(p, setUploadPhase, setUploadPercent),
        });
        setUploadPercent(100);
        setUploadPhase("encoding");
      } catch (submitErr) {
        const base = formatClientError(t, submitErr, {
          titleKey: "uploader.errorSubmitReviewFailed",
        });
        const detail = stagingComplete ? `\n\n${t("uploader.errorSubmitReviewStagedSaved")}` : "";
        reportError(`${base}${detail}`, {
          code: "MEDIA_PROCESSING_SUBMIT_FAILED",
          reportable: true,
          service: "Media processing",
        });
        keepProgressOnExit = stagingComplete;
        return;
      }

      setUploadError(null);
      setUploadErrorCode(null);
      setUploadErrorReportable(false);
      setUploadErrorService(null);
      setUploadPercent(100);
      setUploadComplete(true);
      clearNamedUploadDraftState(user.uid, draftId);
      void clearNamedUploadDraftFiles(user.uid, draftId).catch(() => undefined);
      succeeded = true;
      onSuccess({ workId, message: t("uploader.uploadSuccess") });
    } catch (unexpected) {
      reportError(formatClientError(t, unexpected, { titleKey: "uploader.errorUploadFailed" }), {
        code: "UPLOAD_UNEXPECTED",
        reportable: true,
        service: "Uploader",
      });
    } finally {
      if (succeeded) return;
      setBusy(false);
      if (!keepProgressOnExit) {
        setUploadPhase(null);
        setUploadPercent(0);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    // Block implicit Enter submit inside step inputs.
    e.preventDefault();
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <ErrorReportModal
        open={errorReportOpen && Boolean(uploadError)}
        onClose={() => setErrorReportOpen(false)}
        errorMessage={uploadError ?? ""}
        errorCode={uploadErrorCode ?? undefined}
        service={uploadErrorService ?? undefined}
        context={{
          stepId: currentStep,
          uploadPhase: uploadPhase ?? undefined,
          locale,
        }}
      />
      {uploadComplete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-xiio-bg/90 backdrop-blur-sm px-6"
          role="status"
          aria-live="polite"
        >
          <div className="max-w-md w-full rounded-2xl border border-emerald-500/30 bg-xiio-surface p-8 text-center space-y-4 shadow-xl shadow-black/40">
            <p className="text-lg font-semibold text-white">{t("uploader.uploadSuccess")}</p>
            {inviteEmailSummaryLines.length > 0 ? (
              <div className="text-left rounded-xl border border-white/10 bg-black/30 px-4 py-3 space-y-2 max-h-48 overflow-y-auto">
                <p className="text-xs font-medium text-white/80">
                  {t("uploader.inviteEmailSummaryTitle")}
                </p>
                {inviteEmailSummaryLines.map((line, i) => (
                  <p
                    key={i}
                    className="text-xs text-xiio-muted whitespace-pre-wrap break-all leading-relaxed"
                  >
                    {line}
                  </p>
                ))}
              </div>
            ) : null}
            <p className="text-sm text-xiio-muted">{t("uploader.uploadRedirecting")}</p>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-full bg-xiio-accent animate-pulse" />
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-6 lg:hidden">
        <div className="flex justify-between text-xs text-xiio-muted mb-1">
          <span className="font-medium text-white">{stepLabels[currentStep]}</span>
          <span>
            {t("uploader.uploadStepProgress", {
              current: stepIndex + 1,
              total: UPLOAD_STEPS.length,
            })}
          </span>
        </div>
        <p className="text-xs text-xiio-muted mb-2 leading-relaxed">{stepHints[currentStep]}</p>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-xiio-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mb-9 hidden lg:block">
        <UploadWizardStepper
          steps={UPLOAD_STEP_META}
          currentIndex={stepIndex}
          onStepClick={handleStepClick}
          disabled={busy || uploadComplete}
          orientation="horizontal"
        />
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#101013] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                draftStatus === "error"
                  ? "bg-red-400"
                  : draftStatus === "saving"
                    ? "animate-pulse bg-amber-300"
                    : "bg-emerald-400"
              }`}
            />
            <p className="text-[13px] font-medium text-white/80">
              {t(`uploader.draftStatus.${draftStatus}`)}
            </p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-white/35">
            {draftSavedAt
              ? t("uploader.draftSavedAt", {
                  time: new Intl.DateTimeFormat(locale, {
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(draftSavedAt),
                })
              : t("uploader.draftSaveHint")}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={!draftReady || busy || uploadComplete}
            onClick={() => void saveDraftNow()}
            className="inline-flex h-9 items-center rounded-full border border-white/25 bg-white/[0.025] px-4 text-[12px] font-semibold text-white/85 transition hover:border-white/45 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          >
            {t("uploader.saveDraft")}
          </button>
          <button
            type="button"
            disabled={!draftReady || busy || uploadComplete}
            onClick={() => {
              if (window.confirm(t("uploader.clearDraftConfirm"))) {
                resetUploadForm(true);
              }
            }}
            className="inline-flex h-9 items-center rounded-full border border-white/10 px-4 text-[12px] font-medium text-white/40 transition hover:border-red-400/35 hover:text-red-300 disabled:opacity-40"
          >
            {t("uploader.clearDraft")}
          </button>
        </div>
      </div>

      <div className="min-w-0">
        <div className="min-w-0">
          <UploaderFormShell
            layout="stacked"
            footer={
              <UploaderSubmitFooter
                footerRef={footerRef}
                busy={busy}
                uploadComplete={uploadComplete}
                uploadPercent={uploadPercent}
                uploadPhase={uploadPhase}
                uploadError={uploadError}
                uploadErrorCode={uploadErrorCode}
                uploadErrorReportable={uploadErrorReportable}
                stepIndex={stepIndex}
                isLastStep={isLastStep}
                onBack={handleBack}
                onPrimary={() => {
                  if (busy || uploadComplete) return;
                  if (isLastStep) {
                    void handleUpload();
                    return;
                  }
                  handleNext();
                }}
                onReportError={() => setErrorReportOpen(true)}
                onRetry={() => void handleUpload()}
              />
            }
          >
        {currentStep === "fullWork" && (
          <UploaderFormSection
            title={t("uploader.uploadZoneFullWorkTitle")}
            hint={t("uploader.uploadZoneFullWorkHint")}
          >
            <div
              ref={fullFileRef}
              className={`scroll-mt-28 rounded-xl ${
                fieldHasError("fullFile") ? "ring-1 ring-red-400/70" : ""
              }`}
            >
              <div className="min-h-[320px] md:min-h-[400px]">
                <VideoUploadDropzone
                  file={file}
                  onFileChange={(next) => {
                    setFile(next);
                    setAspectRatioManuallyChanged(false);
                    if (next) clearRequiredFieldError("fullFile");
                  }}
                  meta={fullVideoMeta}
                  previewAspectRatio={aspectRatioNumeric(aspectRatio)}
                  onRemoveFile={(mode) => {
                    if (mode === "clear-edits") {
                      resetUploadForm(true);
                      return;
                    }
                    setFile(null);
                    setAspectRatioManuallyChanged(false);
                  }}
                  disabled={busy}
                />
              </div>
              {renderRequiredFieldError("fullFile")}
            </div>
            {file ? (
              <div className="rounded-xl border border-xiio-accent/20 bg-xiio-accent/[0.06] p-4 md:p-5">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {t("uploader.masterPreservationTitle")}
                    </p>
                    {fullVideoMeta ? (
                      <p className="mt-1 text-xs text-white/65">
                        {t("uploader.masterPreservationMeta", {
                          width: fullVideoMeta.width,
                          height: fullVideoMeta.height,
                          quality: sourceVideoQualityLabel(
                            classifySourceVideoQuality(
                              fullVideoMeta.width,
                              fullVideoMeta.height
                            )
                          ),
                        })}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-xs leading-relaxed text-white/45">
                      {t("uploader.masterPreservationHint")}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 md:p-5">
              {renderAspectRatioControl()}
            </div>
            <div ref={titleRef} className="scroll-mt-28">
              <label className="block text-xs text-xiio-muted mb-1.5" htmlFor="upload-title">
                {t("uploader.uploadTitleLabel")}{" "}
                <span className="text-xiio-accent" aria-hidden>
                  *
                </span>
              </label>
              <input
                id="upload-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (e.target.value.trim()) clearRequiredFieldError("title");
                }}
                required
                maxLength={200}
                placeholder={t("uploader.uploadTitlePlaceholder")}
                disabled={busy}
                className={`${uploaderInputClass} py-3 text-lg font-semibold ${
                  fieldHasError("title")
                    ? "border-red-400/70 ring-1 ring-red-400/25"
                    : ""
                }`}
                aria-invalid={fieldHasError("title")}
              />
              {renderRequiredFieldError("title")}
            </div>
            {directorLocked ? (
              <div>
                <p className="text-xs text-xiio-muted mb-1.5">{t("uploader.uploadDirectorLabel")}</p>
                <p className="text-base font-semibold text-white">
                  {t("uploader.uploadDirectorDisplayValue", { name: lockedDirectorName })}
                </p>
                <p className="text-xs text-xiio-muted mt-1.5">{t("uploader.uploadDirectorReadOnlyHint")}</p>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-xiio-muted mb-1.5" htmlFor="upload-director-main">
                  {t("uploader.uploadDirectorLabel")}
                </label>
                <input
                  id="upload-director-main"
                  type="text"
                  value={director}
                  onChange={(e) => setDirector(e.target.value)}
                  placeholder={t("uploader.uploadDirectorPlaceholder")}
                  disabled={busy}
                  className={uploaderInputClass}
                  maxLength={120}
                />
              </div>
            )}
            <div ref={descriptionRef} className="scroll-mt-28">
              <label className="block text-xs text-xiio-muted mb-1.5" htmlFor="upload-description">
                {t("uploader.uploadDescriptionLabel")}{" "}
                <span className="text-xiio-accent" aria-hidden>
                  *
                </span>
              </label>
              <textarea
                id="upload-description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (e.target.value.trim()) clearRequiredFieldError("description");
                }}
                rows={4}
                required
                placeholder={t("uploader.uploadDescriptionPlaceholder")}
                disabled={busy}
                className={`${uploaderInputClass} min-h-[6rem] resize-y ${
                  fieldHasError("description")
                    ? "border-red-400/70 ring-1 ring-red-400/25"
                    : ""
                }`}
                aria-invalid={fieldHasError("description")}
              />
              {renderRequiredFieldError("description")}
            </div>
          </UploaderFormSection>
        )}

        {currentStep === "catalog" && (
          <UploaderFormSection
            title={t("uploader.uploadZoneCatalogTitle")}
            hint={t("uploader.uploadZoneCatalogHint")}
          >
            <div>
              <p className="text-xs text-xiio-muted mb-2">{t("uploader.uploadSectionLabel")}</p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-thin">
                {WORK_SECTIONS.map((s) => {
                  const selected = section === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={busy}
                      onClick={() => setSection(s)}
                      className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition disabled:opacity-40 ${
                        selected
                          ? "bg-xiio-accent text-white"
                          : "bg-white/5 border border-white/15 text-xiio-muted hover:text-white hover:border-white/30"
                      }`}
                    >
                      {t(`myWorks.section.${s}`)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs text-xiio-muted mb-1.5">
                {t("uploader.schoolPickerLabel")}
              </label>
              <SchoolPicker
                value={school}
                onChange={setSchool}
                disabled={busy}
                user={user}
                inputClassName={uploaderInputClass}
                initialQuery={initialSchoolNameHint?.trim() ?? ""}
              />
              <p className="mt-1.5 text-xs text-xiio-muted">{t("uploader.schoolPickerHint")}</p>
            </div>
            <div>
              <label className="block text-xs text-xiio-muted mb-1.5" htmlFor="upload-category">
                {t("uploader.uploadContentCategoryLabel")}
              </label>
              <input
                id="upload-category"
                type="text"
                value={contentCategory}
                onChange={(e) => setContentCategory(e.target.value)}
                placeholder={t("uploader.uploadContentCategoryPlaceholder")}
                disabled={busy}
                className={uploaderInputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-xiio-muted mb-1.5" htmlFor="upload-tags">
                {t("uploader.uploadTagsLabel")}
              </label>
              <WorkTagInput
                value={tags}
                onChange={setTags}
                disabled={busy}
                user={user}
                inputClassName={uploaderInputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-xiio-muted mb-1.5">
                {t("network.credits.sectionTitle")}
              </label>
              <CreditTagInput
                value={credits}
                onChange={setCredits}
                disabled={busy}
                mode="draft"
                pendingEmailInvites={pendingEmailInvites}
                onPendingEmailInvitesChange={setPendingEmailInvites}
              />
            </div>
            <div
              ref={thumbnailRef}
              className={`scroll-mt-28 rounded-xl ${
                fieldHasError("thumbnail") ? "ring-1 ring-red-400/70" : ""
              }`}
            >
              <ThumbnailUploadField
                file={thumbnailFile}
                previewUrl={thumbnailPreview}
                onFileChange={(next, preview) => {
                  handleThumbnailChange(next, preview);
                  if (next) clearRequiredFieldError("thumbnail");
                }}
                disabled={busy}
                error={
                  fieldHasError("thumbnail")
                    ? requiredFieldError?.message
                    : thumbnailFieldError
                }
              />
            </div>
            {thumbnailPreview ? (
              <UploaderCropPreviewGrid
                cropHint={t("uploader.thumbnailCropHint")}
                leftLabel={t("uploader.promoRawPreview")}
                left={
                  <PromoCropFrameEditor
                    previewUrl={thumbnailPreview}
                    crop={thumbnailCrop}
                    onCropChange={(next) => setThumbnailCrop(normalizePromoFrameCrop(next))}
                    meta={thumbnailImageMeta}
                    frameAspect={CATALOG_THUMBNAIL_FRAME_ASPECT}
                    isImage
                    disabled={busy}
                  />
                }
                rightLabel={t("uploader.catalogThumbnailPreviewTitle")}
                right={
                  <ThumbnailPreviewStages
                    embedded
                    src={thumbnailPreview}
                    crop={thumbnailCrop}
                    sourceWidth={thumbnailImageMeta?.width}
                    sourceHeight={thumbnailImageMeta?.height}
                    title={t("uploader.catalogThumbnailPreviewTitle")}
                    hint={t("uploader.catalogThumbnailPreviewHint")}
                  />
                }
              />
            ) : null}
          </UploaderFormSection>
        )}

        {currentStep === "prologue" && (
          <UploaderFormSection
            title={t("uploader.uploadZonePrologueTitle")}
            hint={t("uploader.uploadZonePrologueHint")}
          >
            <div
              ref={prologueChoiceRef}
              className={`scroll-mt-28 rounded-xl ${
                fieldHasError("prologueChoice") ? "ring-1 ring-red-400/70" : ""
              }`}
            >
              <PrologueUploadChoiceTiles
                value={prologueChoice}
                onChange={(choice) => {
                  setPrologueChoice(choice);
                  clearRequiredFieldError("prologueChoice");
                  if (choice === "skip") {
                    setPrologueFile(null);
                    clearRequiredFieldError("prologueFile");
                  }
                }}
                disabled={busy}
              />
              {renderRequiredFieldError("prologueChoice")}
            </div>
            {prologueChoice === "upload" ? (
              <div className="mt-6 space-y-4">
                <p className="text-xs text-xiio-muted leading-relaxed">
                  {t("uploader.prologueVideoFileHint", {
                    ratio: t(aspectRatioMessageKey(aspectRatio)),
                  })}
                </p>
                <div
                  ref={prologueFileRef}
                  className={`scroll-mt-28 rounded-xl ${
                    fieldHasError("prologueFile") ? "ring-1 ring-red-400/70" : ""
                  }`}
                >
                  <div className="min-h-[280px] md:min-h-[320px]">
                    <VideoUploadDropzone
                      file={prologueFile}
                      onFileChange={(next) => {
                        setPrologueFile(next);
                        if (next) clearRequiredFieldError("prologueFile");
                      }}
                      onRemoveFile={(mode) => {
                        setPrologueFile(null);
                        if (mode === "clear-edits") {
                          setPrologueChoice(null);
                          setPrologueTitle("");
                          setPrologueDescription("");
                        }
                      }}
                      meta={prologueMeta}
                      disabled={busy}
                    />
                  </div>
                  {renderRequiredFieldError("prologueFile")}
                </div>
                {prologueFile && prologueFileError && (
                  <p className="text-xs text-red-400">{t("uploader.errorPrologueVideoInvalid")}</p>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-xiio-muted mb-1.5" htmlFor="prologue-title">
                      {t("uploader.prologueTitleLabel")}
                    </label>
                    <input
                      id="prologue-title"
                      type="text"
                      value={prologueTitle}
                      onChange={(e) => setPrologueTitle(e.target.value)}
                      placeholder={title || t("uploader.uploadTitlePlaceholder")}
                      disabled={busy}
                      className={uploaderInputClass}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs text-xiio-muted mb-1.5"
                      htmlFor="prologue-description"
                    >
                      {t("uploader.prologueDescriptionLabel")}
                    </label>
                    <textarea
                      id="prologue-description"
                      value={prologueDescription}
                      onChange={(e) => setPrologueDescription(e.target.value)}
                      rows={3}
                      disabled={busy}
                      className={`${uploaderInputClass} resize-y min-h-[4rem]`}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </UploaderFormSection>
        )}

        {currentStep === "promo" && (
          <UploaderFormSection
            title={t("uploader.uploadZonePromoTitle")}
            hint={t("uploader.uploadZonePromoHint")}
          >
            <p className="text-xs text-xiio-muted leading-relaxed">{t("uploader.promoVideoFileHint")}</p>
            <div
              ref={promoFileRef}
              className={`scroll-mt-28 rounded-xl ${
                fieldHasError("promoFile") ? "ring-1 ring-red-400/70" : ""
              }`}
            >
              <VideoUploadDropzone
                file={promoFile}
                onFileChange={(next) => {
                  setPromoFile(next);
                  setPromoTrimRange(null);
                  if (next) clearRequiredFieldError("promoFile");
                }}
                onRemoveFile={(mode) => {
                  setPromoFile(null);
                  setPromoTrimRange(null);
                  setPromoCrop(defaultPromoFrameCrop());
                  if (mode === "clear-edits") {
                    setPromoTitle("");
                    setPromoDescription("");
                  }
                }}
                crop={promoCrop}
                onCropChange={(next) => setPromoCrop(normalizePromoFrameCrop(next))}
                meta={promoMeta}
                showPortraitPreview
                disabled={busy}
                trimRange={promoNeedsTrim ? promoTrimRange : null}
                onTrimRangeChange={(next) => {
                  setPromoTrimRange(next);
                  clearRequiredFieldError("promoTrim");
                }}
                trimError={
                  fieldHasError("promoTrim") ? requiredFieldError?.message : null
                }
              />
              {renderRequiredFieldError("promoFile")}
            </div>
            {promoFile && promoFileError === "too_small" && (
              <p className="text-xs text-red-400">{t("uploader.errorPromoTooSmall")}</p>
            )}
            {promoFile && promoFileError === "invalid_dimensions" && (
              <p className="text-xs text-red-400">{t("uploader.errorPromoVideoInvalid")}</p>
            )}
            {promoFile && promoFileError === "invalid_duration" && (
              <p className="text-xs text-red-400">{t("uploader.errorPromoVideoInvalid")}</p>
            )}
            {promoFile && promoMeta && promoFileError === "too_short" && (
              <p className="text-xs text-red-400">{t("uploader.errorPromoTooShort")}</p>
            )}
            <div ref={promoTitleRef} className="scroll-mt-28">
              <PromoShortFields
                title={promoTitle}
                onTitleChange={(next) => {
                  setPromoTitle(next);
                  if (next.trim()) clearRequiredFieldError("promoTitle");
                }}
                titleError={
                  fieldHasError("promoTitle") ? requiredFieldError?.message : null
                }
                description={promoDescription}
                onDescriptionChange={setPromoDescription}
                disabled={busy}
              />
            </div>
          </UploaderFormSection>
        )}

        {currentStep === "preview" && (
          <UploaderFormSection
            title={t("uploader.uploadZonePreviewTitle")}
            hint={t("uploader.uploadZonePreviewHint")}
          >
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 md:p-5">
              {renderAspectRatioControl()}
            </div>
            <SubmissionSurfacePreviews
              workTitle={title.trim() || promoTitle.trim()}
              liveThumbnailUrl={thumbnailPreview}
              thumbnailCrop={thumbnailCrop}
              title={promoTitle}
              description={promoDescription}
              director={(directorLocked ? lockedDirectorName : director).trim()}
              frameCrop={promoCrop}
              promoPlaybackUrl={promoPlaybackUrl}
              promoTrimRange={promoNeedsTrim ? promoTrimRange : null}
              fullPlaybackUrl={fullPlaybackUrl}
              fullAspectRatio={aspectRatio}
              ownerUid={user.uid}
            />
          </UploaderFormSection>
        )}
          </UploaderFormShell>
        </div>
      </div>
    </form>
  );
}
