"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { formatApiError, formatClientError, readResponseJson } from "@/lib/clientErrors";
import type { DirectorNameChangeRequest } from "@/types/user";
import styles from "@/components/settings/SettingsPage.module.css";

type UploaderSettingsResponse = {
  defaultDirectorName: string | null;
  directorNameChangeRequest: DirectorNameChangeRequest | null;
};

export default function DirectorNameSettingsSection() {
  const { user } = useAuth();
  const { t } = useTranslations();
  const [loading, setLoading] = useState(true);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [pendingRequest, setPendingRequest] = useState<DirectorNameChangeRequest | null>(null);
  const [requestedName, setRequestedName] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/me/uploader-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { data: body, raw } = await readResponseJson<UploaderSettingsResponse & {
        message?: string;
        error?: string;
      }>(res);
      if (!res.ok) {
        setError(formatApiError(t, res.status, { ...body, message: body.message ?? raw.slice(0, 500) }));
        return;
      }
      setCurrentName(body.defaultDirectorName);
      const req = body.directorNameChangeRequest;
      setPendingRequest(req?.status === "pending" ? req : null);
    } catch (e) {
      setError(formatClientError(t, e, { titleKey: "settings.directorNameRequestFailed" }));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !currentName) return null;

  const isPending = !!pendingRequest;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isPending) return;
    const trimmed = requestedName.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/me/director-name-change-request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestedName: trimmed,
          reason: reason.trim() || undefined,
        }),
      });
      const { data: body, raw } = await readResponseJson<{
        message?: string;
        error?: string;
        directorNameChangeRequest?: DirectorNameChangeRequest;
      }>(res);
      if (!res.ok) {
        setError(formatApiError(t, res.status, { ...body, message: body.message ?? raw.slice(0, 500) }));
        return;
      }
      setSuccess(true);
      setRequestedName("");
      setReason("");
      if (body.directorNameChangeRequest?.status === "pending") {
        setPendingRequest(body.directorNameChangeRequest);
      } else {
        await load();
      }
    } catch (err) {
      setError(formatClientError(t, err, { titleKey: "settings.directorNameRequestFailed" }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${styles.section} ${styles.row}`}>
      <div>
        <h2 className={styles.sectionTitle}>{t("settings.directorNameSection")}</h2>
        <p className={styles.sectionHint}>{t("settings.directorNameLockedHint")}</p>
      </div>

      <div className={styles.stack}>
        <p className={styles.readout}>
          <span>{t("settings.directorNameCurrent")}</span>
          <strong>{currentName}</strong>
        </p>

        {isPending && (
          <div className={styles.notice}>
            {t("settings.directorNamePending")}
            <small>
              {pendingRequest.requestedName}
              {pendingRequest.reason ? ` — ${pendingRequest.reason}` : ""}
            </small>
          </div>
        )}

        {success && !isPending && <p className={styles.ok}>{t("settings.directorNameSuccess")}</p>}

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={(e) => void submit(e)}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="director-change-name">
              {t("settings.directorNameRequestLabel")}
            </label>
            <input
              id="director-change-name"
              type="text"
              value={requestedName}
              onChange={(e) => setRequestedName(e.target.value)}
              disabled={busy || isPending}
              className={styles.input}
              maxLength={120}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="director-change-reason">
              {t("settings.directorNameReasonLabel")}
            </label>
            <textarea
              id="director-change-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy || isPending}
              placeholder={t("settings.directorNameReasonPlaceholder")}
              className={styles.input}
              maxLength={500}
            />
          </div>
          <div className={styles.actions}>
            <button
              type="submit"
              disabled={busy || isPending || !requestedName.trim()}
              className={`${styles.btn} ${styles.primary}`}
            >
              {busy ? t("settings.directorNameSubmitting") : t("settings.directorNameSubmit")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
