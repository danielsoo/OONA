"use client";

import Link from "next/link";
import { useState, type DragEvent } from "react";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import AvatarChangeDialog from "@/components/account/AvatarChangeDialog";
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
  const [photoOpen, setPhotoOpen] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const canEditAvatar = Boolean(user);

  const openPhoto = (file: File | null = null) => {
    setDroppedFile(file);
    setAvatarMsg(null);
    setPhotoOpen(true);
  };

  // A photo dropped on the avatar opens the picture dialog with it ready.
  const onAvatarDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (!canEditAvatar) return;
    const file = e.dataTransfer.files?.[0];
    if (file) openPhoto(file);
  };

  return (
    <section className={styles.identity}>
      <div>
        <button
          type="button"
          disabled={!canEditAvatar}
          onClick={() => openPhoto()}
          onDragEnter={(e) => {
            e.preventDefault();
            if (canEditAvatar) setDragOver(true);
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
          aria-haspopup="dialog"
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
        <AvatarChangeDialog
          open={photoOpen}
          onClose={() => setPhotoOpen(false)}
          displayName={profile.displayName}
          currentUrl={profile.avatarUrl}
          initialFile={droppedFile}
          onSaved={(url) => {
            setPhotoOpen(false);
            onAvatarUpdated?.(url);
            setAvatarMsg(t("profile.photo.photoUpdated"));
          }}
        />
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
