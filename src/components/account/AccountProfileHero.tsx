"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { uploadUserProfileAvatar } from "@/lib/userAvatar";
import AvatarPresetPicker from "@/components/profile/AvatarPresetPicker";
import { formatApiError, formatClientError, readResponseJson } from "@/lib/clientErrors";
import type { UserProfileDoc } from "@/types/user";
import type { PlatformPurpose } from "@/types/user";
import styles from "@/components/settings/SettingsPage.module.css";

export type AccountProfileMetaItem = {
  label: string;
  value: string;
};

type Props = {
  profile: UserProfileDoc;
  email: string | null;
  metaItems?: AccountProfileMetaItem[];
  onAvatarUpdated?: (avatarUrl: string | null) => void;
};

export default function AccountProfileHero({
  profile,
  email,
  metaItems = [],
  onAvatarUpdated,
}: Props) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const verified = profile.emailVerified;
  const pendingReq = profile.directorNameChangeRequest?.status === "pending";
  const showUpload =
    profile.platformPurpose === "upload" || profile.platformPurpose === "both";
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const canEditAvatar = Boolean(user);

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
      setAvatarErr(formatApiError(t, res.status, { ...body, message: body.message ?? raw.slice(0, 500) }));
      return false;
    }
    return true;
  };

  const handleAvatarFile = async (file: File | undefined) => {
    if (!user || !file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarErr(t("profile.photo.invalidType"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarErr(t("profile.photo.tooLarge"));
      return;
    }
    setAvatarBusy(true);
    setAvatarErr(null);
    setAvatarMsg(null);
    try {
      const url = await uploadUserProfileAvatar(user.uid, file);
      const ok = await patchAvatarUrl(url);
      if (!ok) return;
      onAvatarUpdated?.(url);
      setAvatarMsg(t("profile.photo.photoUpdated"));
    } catch (e) {
      setAvatarErr(formatClientError(t, e, { titleKey: "profile.photo.uploadFailed" }));
    } finally {
      setAvatarBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // A preset is already on the site, so there is nothing to upload.
  const pickAvatarPreset = async (src: string) => {
    if (!user || src === profile.avatarUrl) return;
    setAvatarBusy(true);
    setAvatarErr(null);
    setAvatarMsg(null);
    try {
      const ok = await patchAvatarUrl(src);
      if (!ok) return;
      onAvatarUpdated?.(src);
      setAvatarMsg(t("profile.photo.photoUpdated"));
    } catch (e) {
      setAvatarErr(formatClientError(t, e, { titleKey: "profile.photo.uploadFailed" }));
    } finally {
      setAvatarBusy(false);
    }
  };

  const onAvatarDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (!canEditAvatar || avatarBusy) return;
    void handleAvatarFile(e.dataTransfer.files?.[0]);
  };

  return (
    <section className={styles.identity}>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={!canEditAvatar || avatarBusy}
          onChange={(e) => void handleAvatarFile(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={!canEditAvatar || avatarBusy}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            if (canEditAvatar && !avatarBusy) setDragOver(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={onAvatarDrop}
          className={`${styles.avatarButton} ${dragOver ? styles.avatarDrag : ""}`}
          style={{ cursor: canEditAvatar ? "pointer" : "default" }}
          aria-label={canEditAvatar ? t("profile.photo.changePhoto") : undefined}
        >
          <ProfileAvatar
            displayName={profile.displayName || "?"}
            avatarUrl={profile.avatarUrl}
            className={styles.avatar}
            imgClassName="h-full w-full object-cover"
          />
          {canEditAvatar && (
            <span className={styles.avatarEdit} aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4" /></svg>
            </span>
          )}
        </button>
      </div>

      <div className={styles.who}>
        <h2 className={styles.name}>{profile.displayName || "—"}</h2>
        <div className={styles.handleLine}>
          {profile.handle && (
            <Link href={`/people/${profile.handle}`} className={styles.textLink}>
              @{profile.handle}
            </Link>
          )}
          {email && <span>{email}</span>}
        </div>

        <div className={styles.badges}>
          <span className={`${styles.badge} ${verified ? styles.badgeOn : styles.badgeWarn}`}>
            {verified ? t("settings.emailVerified") : t("settings.emailNotVerified")}
          </span>
          <span className={styles.badge}>
            {t(`admin.userProfile.purpose.${profile.platformPurpose as PlatformPurpose}`)}
          </span>
          {profile.defaultDirectorName && (
            <span className={`${styles.badge} ${styles.badgeOn}`}>
              {t("accountProfile.directorName")}: {profile.defaultDirectorName}
            </span>
          )}
          {pendingReq && profile.directorNameChangeRequest && (
            <span className={`${styles.badge} ${styles.badgeWarn}`}>
              {t("accountProfile.directorChangePending", {
                name: profile.directorNameChangeRequest.requestedName,
              })}
            </span>
          )}
        </div>

        <div className={styles.actions}>
          <Link href="/settings" className={`${styles.btn} ${styles.small}`}>
            {t("accountProfile.linkSettings")}
          </Link>
          {showUpload && (
            <Link href="/uploader/upload" className={`${styles.btn} ${styles.small} ${styles.primary}`}>
              {t("accountProfile.quickUpload")}
            </Link>
          )}
        </div>
        {canEditAvatar && (
          <div className={styles.presets}>
            <AvatarPresetPicker
              current={profile.avatarUrl}
              disabled={avatarBusy}
              onPick={(src) => void pickAvatarPreset(src)}
            />
          </div>
        )}
        {avatarErr && <p className={`${styles.error} ${styles.avatarNote}`}>{avatarErr}</p>}
        {avatarMsg && <p className={`${styles.ok} ${styles.avatarNote}`}>{avatarMsg}</p>}
      </div>

      {metaItems.length > 0 && (
        <dl className={styles.facts}>
          {metaItems.map((item) => (
            <div key={`${item.label}-${item.value}`}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
