"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { formatApiError, formatClientError, readResponseJson } from "@/lib/clientErrors";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";
import { useTranslations } from "@/context/LocaleContext";

const CATEGORIES = [
  { value: "usability", label: "Something is hard to use" },
  { value: "display", label: "Something looks wrong" },
  { value: "feature", label: "Feature request" },
  { value: "other", label: "Other feedback" },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  area?: string;
};

export default function UploaderFeedbackModal({ open, onClose, area }: Props) {
  const _copy = useUiCopy();
  const { locale, t } = useTranslations();
  const { user } = useAuth();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("usability");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCategory("usability");
    setMessage("");
    setError(null);
    setReceiptId(null);
  }, [open]);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      setError("Sign in to send feedback.");
      return;
    }
    if (message.trim().length < 5) {
      setError("Tell us a little more so we can understand the feedback.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/uploader-feedback", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          message: message.trim(),
          area,
          pagePath: `${window.location.pathname}${window.location.search}`,
          locale,
          userAgent: navigator.userAgent,
        }),
      });
      const { data, raw } = await readResponseJson<{
        feedbackId?: string;
        message?: string;
        error?: string;
      }>(response);
      if (!response.ok) {
        setError(formatApiError(t, response.status, {
          ...data,
          message: data.message ?? raw.slice(0, 500),
        }));
        return;
      }
      setReceiptId(data.feedbackId ?? "received");
    } catch (submitError) {
      setError(formatClientError(t, submitError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="uploader-feedback-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111114] p-5 shadow-2xl shadow-black/60 md:p-6">
        {receiptId ? (
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
              </svg>
            </div>
            <h2 id="uploader-feedback-title" className="mt-4 text-xl font-semibold text-white"><UiText text={"Feedback received"} /></h2>
            <p className="mt-2 text-sm leading-relaxed text-white/55"><UiText text={"Thank you. The XIIO team will review it as soon as possible and contact you if we need more information."} /></p>
            <p className="mt-3 text-xs text-white/30"><UiText text={"Reference #"} />{receiptId}</p>
            <button type="button" onClick={onClose} className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-black transition hover:bg-white/90"><UiText text={"Close"} /></button>
          </div>
        ) : (
          <form onSubmit={(event) => void submit(event)}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="uploader-feedback-title" className="text-xl font-semibold text-white"><UiText text={"Send feedback"} /></h2>
                <p className="mt-2 text-sm leading-relaxed text-white/50"><UiText text={"Tell us what felt unclear or what would make uploading easier."} /></p>
              </div>
              <button type="button" onClick={onClose} disabled={busy} aria-label={_copy("Close")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:border-white/25 hover:text-white disabled:opacity-40">×</button>
            </div>

            <label htmlFor="feedback-category" className="mt-6 block text-sm font-medium text-white/80"><UiText text={"Category"} /></label>
            <select id="feedback-category" value={category} onChange={(event) => setCategory(event.target.value as typeof category)} disabled={busy} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.035] px-3 text-sm text-white outline-none focus:border-xiio-accent/70">
              {CATEGORIES.map((item) => <option key={item.value} value={item.value} className="bg-[#111114]">{_copy(item.label)}</option>)}
            </select>

            <label htmlFor="feedback-message" className="mt-5 block text-sm font-medium text-white/80"><UiText text={"Your feedback"} /></label>
            <textarea id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value)} disabled={busy} autoFocus rows={6} maxLength={4000} placeholder={_copy("What happened, and what did you expect?")} className="mt-2 min-h-36 w-full resize-y rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-xiio-accent/70 focus:ring-1 focus:ring-xiio-accent/25 disabled:opacity-50" />

            <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs leading-relaxed text-white/40"><UiText text={"Your account, current page, uploader section, browser, and time are attached automatically. Never include passwords or payment information."} /></div>
            {error ? <p className="mt-4 whitespace-pre-wrap break-words text-sm text-red-400" role="alert">{_copy(error)}</p> : null}
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={onClose} disabled={busy} className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-white/20 text-sm font-semibold text-white/70 transition hover:border-white/40 hover:text-white disabled:opacity-40"><UiText text={"Cancel"} /></button>
              <button type="submit" disabled={busy} className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-40">{busy ? _copy("Sending…") : _copy("Send feedback")}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
