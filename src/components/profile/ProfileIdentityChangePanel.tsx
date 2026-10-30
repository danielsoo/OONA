"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { formatApiError, formatClientError, readResponseJson } from "@/lib/clientErrors";
import {
  getHandleErrorMessage,
  getHandleValidationError,
  mapHandleApiError,
  sanitizeHandleInput,
} from "@/lib/handle";
import type { DirectorNameChangeRequest } from "@/types/user";
import styles from "@/components/settings/SettingsPage.module.css";

type Kind = "displayName" | "handle";

type Props = {
  kind: Kind;
  currentValue: string;
  pendingRequest: DirectorNameChangeRequest | null;
  onSubmitted?: (req: DirectorNameChangeRequest) => void;
};

const COPY: Record<
  Kind,
  {
    titleKey: string;
    hintKey: string;
    currentKey: string;
    requestLabelKey: string;
    pendingKey: string;
    successKey: string;
    failedKey: string;
    submitKey: string;
    submittingKey: string;
    apiPath: string;
    bodyField: "requestedName" | "requestedHandle";
    responseField: "displayNameChangeRequest" | "handleChangeRequest";
    inputPlaceholder?: string;
  }
> = {
  displayName: {
    titleKey: "profile.identity.displayNameSection",
    hintKey: "profile.identity.displayNameLockedHint",
    currentKey: "profile.identity.displayNameCurrent",
    requestLabelKey: "profile.identity.displayNameRequestLabel",
    pendingKey: "profile.identity.displayNamePending",
    successKey: "profile.identity.displayNameSuccess",
    failedKey: "profile.identity.displayNameRequestFailed",
    submitKey: "profile.identity.displayNameSubmit",
    submittingKey: "profile.identity.displayNameSubmitting",
    apiPath: "/api/me/display-name-change-request",
    bodyField: "requestedName",
    responseField: "displayNameChangeRequest",
  },
  handle: {
    titleKey: "profile.identity.handleSection",
    hintKey: "profile.identity.handleLockedHint",
    currentKey: "profile.identity.handleCurrent",
    requestLabelKey: "profile.identity.handleRequestLabel",
    pendingKey: "profile.identity.handlePending",
    successKey: "profile.identity.handleSuccess",
    failedKey: "profile.identity.handleRequestFailed",
    submitKey: "profile.identity.handleSubmit",
    submittingKey: "profile.identity.handleSubmitting",
    apiPath: "/api/me/handle-change-request",
    bodyField: "requestedHandle",
    responseField: "handleChangeRequest",
    inputPlaceholder: "your_name",
  },
};

export default function ProfileIdentityChangePanel({
  kind,
  currentValue,
  pendingRequest,
  onSubmitted,
}: Props) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const copy = COPY[kind];
  const [requested, setRequested] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isPending = pendingRequest?.status === "pending";
  const trimmedCurrent = currentValue.trim();
  if (!trimmedCurrent) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isPending) return;
    const trimmed = requested.trim().replace(/^@/, "");
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    setFieldError(null);
    setSuccess(false);

    if (kind === "handle") {
      const validationErr = getHandleValidationError(trimmed, t);
      if (validationErr) {
        setFieldError(validationErr);
        setBusy(false);
        return;
      }
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch(copy.apiPath, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [copy.bodyField]: trimmed,
          reason: reason.trim() || undefined,
        }),
      });
      const { data: body, raw } = await readResponseJson<
        Record<string, unknown> & { message?: string; error?: string }
      >(res);
      if (!res.ok) {
        if (kind === "handle") {
          const handleCode = mapHandleApiError(body.error);
          if (handleCode) {
            setFieldError(getHandleErrorMessage(handleCode, t));
            return;
          }
        }
        setError(formatApiError(t, res.status, { ...body, message: body.message ?? raw.slice(0, 500) }));
        return;
      }
      setSuccess(true);
      setRequested("");
      setReason("");
      const req = body[copy.responseField] as DirectorNameChangeRequest | undefined;
      if (req?.status === "pending") {
        onSubmitted?.(req);
      }
    } catch (err) {
      setError(formatClientError(t, err, { titleKey: copy.failedKey }));
    } finally {
      setBusy(false);
    }
  };

  const inputId = `identity-${kind}-request`;
  const reasonId = `identity-${kind}-reason`;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{t(copy.titleKey)}</h2>
        <p className={styles.sectionHint}>{t(copy.hintKey)}</p>
      </div>

      <div className={styles.stack}>
        <p className={styles.readout}>
          <span>{t(copy.currentKey)}</span>
          <strong>{kind === "handle" ? `@${trimmedCurrent}` : trimmedCurrent}</strong>
        </p>

        {isPending && pendingRequest && (
          <div className={styles.notice}>
            {t(copy.pendingKey)}
            <small>
              {kind === "handle" ? `@${pendingRequest.requestedName}` : pendingRequest.requestedName}
              {pendingRequest.reason ? ` — ${pendingRequest.reason}` : ""}
            </small>
          </div>
        )}

        {success && !isPending && <p className={styles.ok}>{t(copy.successKey)}</p>}
        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={(e) => void submit(e)}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={inputId}>{t(copy.requestLabelKey)}</label>
            <input
              id={inputId}
              type="text"
              value={requested}
              onChange={(e) => {
                const next =
                  kind === "handle"
                    ? sanitizeHandleInput(e.target.value)
                    : e.target.value.replace(/^@/, "");
                setRequested(next);
                if (kind === "handle") setFieldError(null);
              }}
              disabled={busy || isPending}
              placeholder={copy.inputPlaceholder}
              className={`${styles.input} ${fieldError ? styles.inputError : ""}`}
              maxLength={120}
            />
            {kind === "handle" && fieldError && <p className={styles.fieldError}>{fieldError}</p>}
            {kind === "handle" && !fieldError && <p className={styles.help}>{t("profile.edit.handleHint")}</p>}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={reasonId}>
              {t("profile.identity.reasonLabel")}
            </label>
            <textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy || isPending}
              placeholder={t("profile.identity.reasonPlaceholder")}
              className={styles.input}
              maxLength={500}
            />
          </div>
          <div className={styles.actions}>
            <button
              type="submit"
              disabled={busy || isPending || !requested.trim()}
              className={`${styles.btn} ${styles.primary}`}
            >
              {busy ? t(copy.submittingKey) : t(copy.submitKey)}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
