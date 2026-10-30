"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { validGraduationMonth, type SchoolVerificationStatus } from "@/lib/school-verification";

export default function SchoolEmailVerification({ schoolId, disabled = false, onEligibilityChange }: {
  schoolId: string;
  disabled?: boolean;
  onEligibilityChange?: (status: SchoolVerificationStatus | null) => void;
}) {
  const { user } = useAuth();
  const { t, locale } = useTranslations();
  const id = useId();
  const callback = useRef(onEligibilityChange);
  callback.current = onEligibilityChange;
  const [status, setStatus] = useState<SchoolVerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [month, setMonth] = useState("");
  const [enrolled, setEnrolled] = useState(false);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const locked = busy || disabled;
  const inputClass = "w-full min-h-[44px] rounded-lg border border-[rgba(179,206,230,0.22)] bg-[rgba(4,17,28,0.5)] px-4 text-sm text-white outline-none transition focus:border-[rgba(119,203,255,0.8)] focus:shadow-[0_0_0_3px_rgba(61,163,232,0.16)] disabled:opacity-50 [color-scheme:dark]";
  const buttonClass = "inline-flex h-10 items-center justify-center rounded-full border border-[rgba(179,206,230,0.24)] bg-[rgba(4,17,28,0.36)] px-5 text-[13px] text-white/90 transition hover:bg-[rgba(49,119,168,0.24)] hover:text-white disabled:opacity-40";

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setStatus(null); callback.current?.(null);
    if (!user) { setLoading(false); return; }
    void user.getIdToken().then(token => fetch(`/api/me/school-verification?schoolId=${encodeURIComponent(schoolId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }))
      .then(async res => { if (!res.ok) throw Error(); return res.json() as Promise<SchoolVerificationStatus>; })
      .then(data => { if (!cancelled) { setStatus(data); setMonth(data.graduationMonth ?? ""); callback.current?.(data); } })
      .catch(() => { if (!cancelled) setError("school_mail_unavailable"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, schoolId]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function act(action: "send" | "verify" | "leave") {
    if (!user || locked) return;
    if (action === "send" && (!enrolled || !validGraduationMonth(month))) { setError("school_enrollment_required"); return; }
    setBusy(true); setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/me/school-verification", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action, schoolId, email, enrolled, graduationMonth: month, code, locale }) });
      const data = await res.json();
      if (!res.ok) { setError(typeof data.error === "string" && data.error.startsWith("school_") ? data.error : "school_mail_unavailable"); return; }
      if (action === "send") { setSent(true); setCode(""); setCooldown(60); }
      if (action === "verify") { setStatus(data); callback.current?.(data); setEditing(false); setSent(false); setCode(""); setEmail(""); }
      if (action === "leave") { setStatus(prev => prev ? { ...prev, eligible: false, reason: "school_enrollment_expired", maskedEmail: null } : null); callback.current?.(null); setEnrolled(false); setEditing(false); setSent(false); setCode(""); }
    } catch { setError("school_mail_unavailable"); }
    finally { setBusy(false); }
  }

  if (loading) return <p className="mt-3 text-sm text-white/60" role="status">{t("schoolVerification.checking")}</p>;
  const unavailable = !status || status.reason === "school_unavailable" || status.reason === "school_review_required";
  return <section className="mt-4 space-y-3 rounded-lg border border-[rgba(150,190,230,0.16)] bg-[rgba(3,15,24,0.5)] p-5" aria-label={t("schoolVerification.title")}>
    {status?.eligible && !editing ? <>
      <p className="text-sm text-[#bfe6ff]">{t("schoolVerification.verified")} · {status.maskedEmail}</p>
      <p className="text-xs text-white/65">{t("schoolVerification.validUntil", { month: status.graduationMonth ?? "" })}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={locked} className={buttonClass} onClick={() => { setEditing(true); setEnrolled(false); callback.current?.(null); }}>{t("schoolVerification.edit")}</button>
        <button type="button" disabled={locked} className={buttonClass} onClick={() => void act("leave")}>{t("schoolVerification.leave")}</button>
      </div>
    </> : <>
      {status?.reason && status.reason !== "school_verification_required" ? <p className="text-sm text-white/70">{t(`schoolVerification.${status.reason}`)}</p> : null}
      {!unavailable ? <>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-[18px] w-[18px] accent-[#5fbfff]" checked={enrolled} disabled={locked || sent} onChange={e => setEnrolled(e.target.checked)} />{t("schoolVerification.enrolled")}</label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-white/65" htmlFor={`${id}-month`}><span>{t("schoolVerification.graduation")}</span><input id={`${id}-month`} type="month" value={month} disabled={locked || sent} min={new Date().toISOString().slice(0, 7)} className={inputClass} onChange={e => setMonth(e.target.value)} /></label>
          <label className="space-y-1 text-xs text-white/65" htmlFor={`${id}-email`}><span>{t("schoolVerification.email")}</span><input id={`${id}-email`} type="email" autoComplete="email" value={email} disabled={locked || sent} maxLength={254} className={inputClass} onChange={e => setEmail(e.target.value)} /></label>
        </div>
        <p className="text-xs text-white/50">{t("schoolVerification.domains", { domains: status.domains.map(d => `@${d}`).join(", ") })}</p>
        <button type="button" className={buttonClass} disabled={locked || cooldown > 0 || !email || !enrolled || !month} onClick={() => void act("send")}>{cooldown > 0 ? t("schoolVerification.wait", { seconds: cooldown }) : t(sent ? "schoolVerification.resend" : "schoolVerification.send")}</button>
        {sent ? <>
          <p className="text-xs text-[#bfe6ff]" role="status">{t("schoolVerification.sent")}</p>
          <label className="block text-xs text-white/65" htmlFor={`${id}-code`}>{t("schoolVerification.code")}</label>
          <div className="flex gap-2"><input id={`${id}-code`} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} disabled={locked} className={inputClass} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} /><button type="button" disabled={locked || code.length !== 6} className={`${buttonClass} shrink-0`} onClick={() => void act("verify")}>{t("schoolVerification.verify")}</button></div>
          <button type="button" disabled={locked} className="text-xs text-[#8fcfff] hover:text-white" onClick={() => { setSent(false); setCode(""); }}>{t("schoolVerification.changeEmail")}</button>
        </> : null}
      </> : null}
    </>}
    <p className="text-xs leading-relaxed text-white/45">{t("schoolVerification.disclaimer")}</p>
    {error ? <p className="text-sm text-amber-200" role="alert">{t(`schoolVerification.${error}`)}</p> : null}
  </section>;
}
