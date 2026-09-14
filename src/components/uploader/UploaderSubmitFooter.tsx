"use client";

import type { RefObject } from "react";
import { useTranslations } from "@/context/LocaleContext";
import type { UploadPhase } from "@/lib/works/upload-progress";

type Props = {
  footerRef?: RefObject<HTMLDivElement | null>;
  busy: boolean;
  uploadComplete?: boolean;
  uploadPercent: number;
  uploadPhase: UploadPhase | null;
  uploadError: string | null;
  uploadErrorCode?: string | null;
  uploadErrorReportable?: boolean;
  stepIndex: number;
  isLastStep: boolean;
  onBack: () => void;
  onPrimary: () => void;
  onReportError: () => void;
  onRetry?: () => void;
};

export default function UploaderSubmitFooter({
  footerRef,
  busy,
  uploadComplete = false,
  uploadPercent,
  uploadPhase,
  uploadError,
  uploadErrorCode,
  uploadErrorReportable = false,
  stepIndex,
  isLastStep,
  onBack,
  onPrimary,
  onReportError,
  onRetry,
}: Props) {
  const { t } = useTranslations();

  const phaseLabel = uploadPhase != null ? t(`uploader.uploadPhase.${uploadPhase}`) : null;
  const showProgress = busy && !uploadComplete;

  return (
    <div
      ref={footerRef}
      className="sticky bottom-0 z-20 -mx-1 border-t border-white/[0.08] bg-[#080808]/95 px-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md"
    >
      <div className="space-y-4 bg-[#080808] p-4 md:px-5">
        {uploadError ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="whitespace-pre-wrap break-words text-sm text-red-300">{uploadError}</p>
              {uploadErrorCode ? <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-red-200/45">Error code: {uploadErrorCode}</p> : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {uploadErrorReportable && onRetry ? (
                <button type="button" onClick={onRetry} className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 px-4 text-xs font-semibold text-white/70 transition hover:border-white/40 hover:text-white">Try again</button>
              ) : null}
              {uploadErrorReportable ? (
                <button
                  type="button"
                  onClick={onReportError}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-red-300/35 px-4 text-xs font-semibold text-red-200 transition hover:border-red-200/65 hover:bg-red-300/10 hover:text-white"
                >
                  Report system error
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {uploadComplete ? (
          <div className="space-y-2" role="status">
            <p className="text-sm text-emerald-300/95 leading-relaxed">{t("uploader.uploadSuccess")}</p>
            <p className="text-xs text-xiio-muted">{t("uploader.uploadRedirecting")}</p>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-full bg-xiio-accent animate-pulse" />
            </div>
          </div>
        ) : null}

        {showProgress ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-xiio-muted">
              <span className="text-white/90 truncate pr-2">{phaseLabel}</span>
              <span className="tabular-nums shrink-0">
                {t("uploader.uploadProgress", { percent: uploadPercent })}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-xiio-accent transition-all duration-300"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed" role="status">
              {t("uploader.uploadLeaveWarning")}
            </p>
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={onBack}
              disabled={busy || uploadComplete}
              className="inline-flex h-11 min-w-32 items-center justify-center rounded-full border border-white/20 px-6 text-[13px] font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
            >
              {t("common.previous")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onPrimary}
            disabled={busy || uploadComplete}
            className="inline-flex h-11 min-w-36 items-center justify-center rounded-full border border-[#76d8ff]/80 bg-transparent px-7 text-[13px] font-semibold text-white transition hover:bg-[#76d8ff]/10 hover:shadow-[0_0_24px_rgba(79,194,246,0.15)] disabled:opacity-40"
          >
            {uploadComplete
              ? t("uploader.uploadRedirecting")
              : busy
                ? t("uploader.uploadProgress", { percent: uploadPercent })
                : isLastStep
                  ? t("uploader.uploadSubmitReview")
                  : t("common.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
