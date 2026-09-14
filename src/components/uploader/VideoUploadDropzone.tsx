"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "@/context/LocaleContext";
import type { VideoFileMetadata } from "@/hooks/useVideoFileMetadata";
import ExposurePreviewFrame from "@/components/uploader/ExposurePreviewFrame";
import PromoCropFrameEditor from "@/components/uploader/PromoCropFrameEditor";
import UploaderCropPreviewGrid from "@/components/uploader/UploaderCropPreviewGrid";
import { defaultPromoFrameCrop, normalizePromoFrameCrop } from "@/lib/works/promo-crop";
import type { PromoTrimRange } from "@/lib/works/promo-clip";
import type { PromoFrameCrop } from "@/types/work";
import PromoTrimControls from "@/components/uploader/PromoTrimControls";

type Props = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  crop?: PromoFrameCrop | null;
  onCropChange?: (next: PromoFrameCrop | null) => void;
  meta?: VideoFileMetadata | null;
  showPortraitPreview?: boolean;
  previewAspectRatio?: number;
  onRemoveFile?: (mode: "keep-edits" | "clear-edits") => void;
  trimRange?: PromoTrimRange | null;
  onTrimRangeChange?: (next: PromoTrimRange) => void;
  trimError?: string | null;
};

export default function VideoUploadDropzone({
  file,
  onFileChange,
  disabled,
  crop,
  onCropChange,
  meta,
  showPortraitPreview = false,
  previewAspectRatio,
  onRemoveFile,
  trimRange,
  onTrimRangeChange,
  trimError,
}: Props) {
  const { t } = useTranslations();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [removeDialogStep, setRemoveDialogStep] = useState<"confirm" | "edits" | null>(null);
  const effectiveCrop = normalizePromoFrameCrop(crop ?? defaultPromoFrameCrop());
  const previewMaxWidth = previewAspectRatio
    ? previewAspectRatio < 0.75
      ? "min(360px, 100%)"
      : previewAspectRatio <= 1.05
        ? "min(620px, 100%)"
        : previewAspectRatio < 1.5
          ? "min(900px, 100%)"
          : "100%"
    : undefined;

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = useCallback(
    (next: File | null) => {
      if (disabled) return;
      if (next && !next.type.startsWith("video/")) return;
      onFileChange(next);
      if (!next) onCropChange?.(null);
    },
    [disabled, onFileChange, onCropChange]
  );

  const finishRemove = (mode: "keep-edits" | "clear-edits") => {
    if (onRemoveFile) {
      onRemoveFile(mode);
    } else {
      onFileChange(null);
      onCropChange?.(null);
    }
    if (inputRef.current) inputRef.current.value = "";
    setRemoveDialogStep(null);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) pickFile(dropped);
    },
    [pickFile]
  );

  return (
    <div className="flex flex-col min-h-[280px] lg:min-h-[360px]">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="video/*"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          pickFile(e.target.files?.[0] ?? null);
        }}
      />

      {file && previewUrl ? (
        <div
          className="mx-auto flex w-full flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition-[max-width] duration-300"
          style={{ maxWidth: previewMaxWidth }}
        >
          <div
            className={`relative bg-black ${previewAspectRatio ? "w-full" : "min-h-[200px] flex-1"}`}
            style={previewAspectRatio ? { aspectRatio: previewAspectRatio } : undefined}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => setRemoveDialogStep("confirm")}
              className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-red-300/40 bg-red-600 text-white shadow-lg shadow-black/40 transition hover:bg-red-500 disabled:opacity-40"
              aria-label={t("uploader.removeVideo")}
              title={t("uploader.removeVideo")}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <video
              ref={videoRef}
              src={previewUrl}
              className="absolute inset-0 w-full h-full object-contain"
              controls
              playsInline
              preload="metadata"
            />
          </div>
          <div className="shrink-0 px-4 py-3 border-t border-white/10 bg-xiio-surface/80">
            <p className="text-xs text-xiio-muted mb-0.5">{t("uploader.dropzoneFileSelected")}</p>
            <p className="text-sm text-white truncate font-medium" title={file.name}>
              {file.name}
            </p>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.value = "";
                  inputRef.current.click();
                }
              }}
              className="mt-2 text-sm text-xiio-accent hover:underline disabled:opacity-40"
            >
              {t("uploader.dropzoneChangeFile")}
            </button>
            {meta ? (
              <p className="mt-1 text-xs text-xiio-muted">
                {t("uploader.promoSourceMeta", {
                  width: meta.width,
                  height: meta.height,
                  sec: Math.max(0, meta.duration).toFixed(1),
                })}
              </p>
            ) : null}
          </div>
          {trimRange && onTrimRangeChange && meta ? (
            <PromoTrimControls
              durationSec={meta.duration}
              value={trimRange}
              onChange={onTrimRangeChange}
              videoRef={videoRef}
              disabled={disabled}
              error={trimError}
            />
          ) : null}
          {showPortraitPreview && onCropChange ? (
            <div className="border-t border-white/10 px-4 py-4 bg-xiio-surface/90">
              <UploaderCropPreviewGrid
                cropHint={t("uploader.promoCropHint")}
                leftLabel={t("uploader.promoRawPreview")}
                left={
                  <PromoCropFrameEditor
                    previewUrl={previewUrl}
                    crop={effectiveCrop}
                    onCropChange={onCropChange}
                    disabled={disabled}
                    meta={meta}
                  />
                }
                rightLabel={t("uploader.promoShortsPreview")}
                right={
                  <ExposurePreviewFrame
                    src={previewUrl}
                    crop={effectiveCrop}
                    innerAspect="9/16"
                    media="video"
                    sourceWidth={meta?.width}
                    sourceHeight={meta?.height}
                  />
                }
              />
            </div>
          ) : null}
          {!showPortraitPreview ? null : (
            <div className="border-t border-white/10 px-4 py-2 bg-xiio-surface/80">
              <p className="text-xs text-xiio-muted">{t("uploader.promoPortraitNotice")}</p>
            </div>
          )}
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragEnter={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className={`flex flex-1 flex-col items-center justify-center gap-3 rounded-control border border-dashed px-6 py-10 text-center cursor-pointer transition ${
            disabled
              ? "opacity-40 cursor-not-allowed border-white/10 bg-white/5"
              : dragOver
                ? "border-xiio-accent bg-xiio-accent/10"
                : "border-white/28 bg-transparent hover:border-[#76d8ff]/60 hover:bg-white/[0.025]"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-12 h-12 text-xiio-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <div>
            <p className="text-base font-semibold text-white">{t("uploader.dropzoneTitle")}</p>
            <p className="text-sm text-xiio-muted mt-1">{t("uploader.dropzoneHint")}</p>
          </div>
        </label>
      )}

      {removeDialogStep ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 px-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${inputId}-remove-title`}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#141416] p-6 shadow-2xl shadow-black/60">
            {removeDialogStep === "confirm" ? (
              <>
                <h2 id={`${inputId}-remove-title`} className="text-lg font-semibold text-white">
                  {t("uploader.removeVideoConfirmTitle")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-xiio-muted">
                  {t("uploader.removeVideoConfirmBody", { name: file?.name ?? "" })}
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setRemoveDialogStep(null)}
                    className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/75 hover:border-white/30 hover:text-white"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoveDialogStep("edits")}
                    className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                  >
                    {t("uploader.removeVideoContinue")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id={`${inputId}-remove-title`} className="text-lg font-semibold text-white">
                  {t("uploader.removeEditsTitle")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-xiio-muted">
                  {t("uploader.removeEditsBody")}
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => finishRemove("keep-edits")}
                    className="rounded-xl border border-xiio-accent/50 bg-xiio-accent/10 px-4 py-3 text-sm font-semibold text-white hover:bg-xiio-accent/20"
                  >
                    {t("uploader.removeKeepEdits")}
                  </button>
                  <button
                    type="button"
                    onClick={() => finishRemove("clear-edits")}
                    className="rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/20"
                  >
                    {t("uploader.removeClearEdits")}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoveDialogStep(null)}
                  className="mt-4 w-full text-center text-sm text-white/50 hover:text-white"
                >
                  {t("common.cancel")}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
