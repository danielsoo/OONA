"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { formatApiError, formatClientError, readResponseJson } from "@/lib/clientErrors";
import styles from "@/components/settings/SettingsPage.module.css";

type Props = {
  className?: string;
  initialDiscoverable?: boolean;
};

export default function ProfileDiscoverSettings({
  className = "",
  initialDiscoverable,
}: Props) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const [discoverable, setDiscoverable] = useState(initialDiscoverable ?? true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (initialDiscoverable !== undefined) setDiscoverable(initialDiscoverable);
  }, [initialDiscoverable]);

  const save = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/me/professional-profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isDiscoverable: discoverable }),
      });
      const { data: body, raw } = await readResponseJson<{ message?: string; error?: string }>(res);
      if (!res.ok) {
        setErr(formatApiError(t, res.status, { ...body, message: body.message ?? raw.slice(0, 500) }));
        return;
      }
      setMsg(t("profile.edit.saved"));
    } catch (e) {
      setErr(formatClientError(t, e, { titleKey: "profile.edit.saveError" }));
    } finally {
      setBusy(false);
    }
  }, [user, discoverable, t]);

  return (
    <section className={`${styles.section} ${className}`.trim()}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{t("profile.edit.boothTitle")}</h2>
        <p className={styles.sectionHint}>{t("profile.edit.boothHint")}</p>
      </div>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={discoverable}
          onChange={(e) => setDiscoverable(e.target.checked)}
          disabled={busy}
        />
        <span>{t("profile.edit.discoverable")}</span>
      </label>
      {err && <p className={`${styles.error} ${styles.avatarNote}`}>{err}</p>}
      {msg && <p className={`${styles.ok} ${styles.avatarNote}`}>{msg}</p>}
      <div className={styles.actions}>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className={`${styles.btn} ${styles.primary}`}
        >
          {t("profile.edit.save")}
        </button>
      </div>
    </section>
  );
}
