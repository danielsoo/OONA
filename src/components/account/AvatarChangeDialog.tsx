"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import AvatarPresetPicker from "@/components/profile/AvatarPresetPicker";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { uploadUserProfileAvatar } from "@/lib/userAvatar";
import { isDemoVisit } from "@/lib/demo-flags";
import { formatApiError, formatClientError, readResponseJson } from "@/lib/clientErrors";
import styles from "@/components/settings/SettingsPage.module.css";

/** What the person has picked but not saved yet. */
type Pending =
  | { kind: "preset"; src: string }
  | { kind: "file"; file: File; preview: string }
  | { kind: "remove" };

type Props = {
  open: boolean;
  onClose: () => void;
  displayName: string;
  currentUrl?: string | null;
  /** A photo dropped on the avatar: opens with it ready to save. */
  initialFile?: File | null;
  onSaved: (avatarUrl: string | null) => void;
};

/** The demo uploads nothing: the photo stays in this page as a data URL. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Changing the profile picture (the pencil on the account's avatar): upload a
 * photo or pick one of the presets, see it, then save. Nothing changes until
 * Save.
 */
export default function AvatarChangeDialog({ open, onClose, displayName, currentUrl, initialFile, onSaved }: Props) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const copy = useUiCopy();
  const box = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr(t("profile.photo.invalidType"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr(t("profile.photo.tooLarge"));
      return;
    }
    setErr(null);
    setPending({ kind: "file", file, preview: URL.createObjectURL(file) });
  }

  const close = () => {
    if (!busy) onClose();
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [open]);

  // Each opening starts from what is saved (or the photo just dropped).
  useEffect(() => {
    if (!open) return;
    setErr(null);
    setPending(null);
    if (initialFile) pickFile(initialFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFile]);

  // A picked photo's preview is a blob URL; let it go when it is replaced.
  useEffect(() => {
    if (pending?.kind !== "file") return;
    const url = pending.preview;
    return () => URL.revokeObjectURL(url);
  }, [pending]);

  if (!open) return null;

  const patchAvatarUrl = async (next: string | null) => {
    if (!user) return false;
    const token = await user.getIdToken();
    const res = await fetch("/api/me/professional-profile", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ avatarUrl: next }),
    });
    const { data: body, raw } = await readResponseJson<{ message?: string; error?: string }>(res);
    if (!res.ok) {
      setErr(formatApiError(t, res.status, { ...body, message: body.message ?? raw.slice(0, 500) }));
      return false;
    }
    return true;
  };

  const save = async () => {
    if (!user || !pending || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const next =
        pending.kind === "file"
          ? isDemoVisit()
            ? await readAsDataUrl(pending.file)
            : await uploadUserProfileAvatar(user.uid, pending.file)
          : pending.kind === "preset"
            ? pending.src
            : null;
      if (!(await patchAvatarUrl(next))) return;
      onSaved(next);
    } catch (e) {
      setErr(formatClientError(t, e, { titleKey: "profile.photo.uploadFailed" }));
    } finally {
      setBusy(false);
    }
  };

  const shown =
    pending?.kind === "file" ? pending.preview : pending?.kind === "preset" ? pending.src : pending?.kind === "remove" ? null : currentUrl;
  const unchanged = !pending || (pending.kind === "preset" && pending.src === currentUrl) || (pending.kind === "remove" && !currentUrl);

  return (
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={box} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="avatar-change-title" tabIndex={-1}>
        <button type="button" className={styles.close} onClick={close} disabled={busy} aria-label={copy("Close")}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className={styles.dialogHead}>
          <h2 id="avatar-change-title" className={styles.dialogTitle}>{t("profile.photo.title")}</h2>
        </div>

        <div className={styles.dialogBody}>
          <div className={styles.photoRow}>
            <ProfileAvatar displayName={displayName || "?"} avatarUrl={shown} className={`${styles.avatar} ${styles.avatarLarge}`} imgClassName="h-full w-full object-cover" />
            <div>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button type="button" className={`${styles.btn} ${styles.small}`} disabled={busy} onClick={() => inputRef.current?.click()}>
                <UiText text={"Upload a photo"} />
              </button>
              <p className={`${styles.help} ${styles.avatarNote}`}>{t("profile.photo.hint")}</p>
              {currentUrl && pending?.kind !== "remove" ? (
                <p className={`${styles.quiet} ${styles.avatarNote}`}>
                  <button type="button" disabled={busy} onClick={() => setPending({ kind: "remove" })}>
                    {t("profile.photo.removePhoto")}
                  </button>
                </p>
              ) : null}
            </div>
          </div>

          <div className={styles.presets}>
            <AvatarPresetPicker
              current={pending?.kind === "preset" ? pending.src : pending ? null : currentUrl}
              disabled={busy}
              onPick={(src) => {
                setErr(null);
                setPending({ kind: "preset", src });
              }}
            />
          </div>
          {err && <p className={`${styles.error} ${styles.presets}`}>{err}</p>}
        </div>

        <div className={styles.dialogFoot}>
          <div className={`${styles.actions} ${styles.flush}`}>
            <button type="button" className={styles.btn} onClick={close} disabled={busy}>
              {t("profile.edit.cancel")}
            </button>
            <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={() => void save()} disabled={busy || unchanged}>
              {busy && pending?.kind === "file" ? t("profile.photo.uploading") : t("profile.edit.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
