"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { formatApiError, formatClientError, readResponseJson } from "@/lib/clientErrors";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";
import { useTranslations } from "@/context/LocaleContext";

type Props = {
  open: boolean;
  onClose: () => void;
  errorMessage: string;
  errorCode?: string;
  service?: string;
  context?: { stepId?: string; uploadPhase?: string; locale?: string };
};

export default function ErrorReportModal({ open, onClose, errorMessage, errorCode, service, context }: Props) {
  const _copy = useUiCopy();
  const { locale, t } = useTranslations();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const submittedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      submittedKey.current = null;
      return;
    }
    const key = `${errorCode ?? "UNKNOWN"}:${errorMessage}`;
    if (submittedKey.current === key) return;
    submittedKey.current = key;
    setBusy(true);
    setError(null);
    setReportId(null);
    void (async () => {
      try {
        if (!user) throw new Error("Sign in to report a system error.");
        const token = await user.getIdToken();
        const response = await fetch("/api/error-reports", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            errorMessage,
            errorCode,
            service,
            pagePath: `${window.location.pathname}${window.location.search}`,
            stepId: context?.stepId,
            uploadPhase: context?.uploadPhase,
            locale,
            userAgent: navigator.userAgent,
            occurredAt: new Date().toISOString(),
          }),
        });
        const { data, raw } = await readResponseJson<{ reportId?: string; message?: string; error?: string }>(response);
        if (!response.ok) {
          throw new Error(formatApiError(t, response.status, { ...data, message: data.message ?? raw.slice(0, 500) }));
        }
        setReportId(data.reportId ?? "received");
      } catch (submitError) {
        setError(formatClientError(t, submitError));
      } finally {
        setBusy(false);
      }
    })();
  }, [context?.stepId, context?.uploadPhase, errorCode, errorMessage, open, service, user, locale, t]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="error-report-title">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111114] p-5 shadow-2xl shadow-black/60 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-300/70"><UiText text={"System error report"} /></p>
            <h2 id="error-report-title" className="mt-2 text-xl font-semibold text-white">
              {busy ? _copy("Sending diagnostic report…") : reportId ? _copy("Report received") : _copy("Could not send report")}
            </h2>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label={_copy("Close")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:border-white/25 hover:text-white disabled:opacity-40">×</button>
        </div>

        <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.055] px-4 py-3">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-red-100/90">{errorMessage}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-red-200/45">
            <span><UiText text={"Code:"} />{" "}{errorCode ?? "UPLOAD_UNKNOWN"}</span>
            <span><UiText text={"Service:"} />{" "}{service ?? "Uploader"}</span>
            <span><UiText text={"Step:"} />{" "}{context?.stepId ?? "unknown"}</span>
          </div>
        </div>

        {busy ? <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-1/2 animate-pulse rounded-full bg-xiio-accent" /></div> : null}
        {reportId ? (
          <>
            <p className="mt-5 text-sm leading-relaxed text-white/55"><UiText text={"The XIIO admin team received the account, time, page, uploader step, browser, service, and error code automatically. We will contact your account email if needed."} /></p>
            <p className="mt-3 text-xs text-white/30"><UiText text={"Reference #"} />{reportId}</p>
          </>
        ) : null}
        {error ? <p className="mt-5 whitespace-pre-wrap break-words text-sm text-red-400" role="alert">{error}</p> : null}
        {!busy ? <button type="button" onClick={onClose} className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-black transition hover:bg-white/90"><UiText text={"Close"} /></button> : null}
      </div>
    </div>
  );
}
