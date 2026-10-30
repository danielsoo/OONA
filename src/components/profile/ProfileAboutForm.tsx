"use client";

import { useEffect } from "react";
import type { PublicProfileData } from "@/components/profile/PublicProfileCard";
import {
  useProfessionalProfileSave,
  type ProfessionalProfileSaved,
} from "@/hooks/useProfessionalProfileSave";
import { sanitizeHandleInput } from "@/lib/handle";
import { useTranslations } from "@/context/LocaleContext";
import styles from "@/components/settings/SettingsPage.module.css";

type Props = {
  profile: PublicProfileData;
  handleLocked: boolean;
  onSaved?: (saved: ProfessionalProfileSaved) => void;
};

export default function ProfileAboutForm({ profile, handleLocked, onSaved }: Props) {
  const { t } = useTranslations();
  const { fields, applyFields, save, busy, err, msg, msgIsDemo, fieldErrors, clearMessages } =
    useProfessionalProfileSave({
    handleLocked,
  });

  const viewHandle = profile.handle;
  const canSetHandleOnce = !handleLocked && !viewHandle?.trim();

  useEffect(() => {
    applyFields({
      handle: profile.handle,
      headline: profile.headline ?? "",
      bio: profile.bio ?? "",
      profileLink: profile.profileLink ?? "",
      openToCollaborate: profile.openToCollaborate === true,
      collaborationNote: profile.collaborationNote ?? "",
    });
    clearMessages();
  }, [
    profile.handle,
    profile.headline,
    profile.bio,
    profile.profileLink,
    profile.openToCollaborate,
    profile.collaborationNote,
    applyFields,
    clearMessages,
  ]);

  const handleSave = async () => {
    const saved = await save();
    if (!saved) return;
    onSaved?.(saved);
  };

  const resetFields = () => {
    applyFields({
      handle: profile.handle,
      headline: profile.headline ?? "",
      bio: profile.bio ?? "",
      profileLink: profile.profileLink ?? "",
      openToCollaborate: profile.openToCollaborate === true,
      collaborationNote: profile.collaborationNote ?? "",
    });
    clearMessages();
  };

  return (
    <div>
      {canSetHandleOnce && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="about-handle">{t("profile.edit.handle")}</label>
          <input
            id="about-handle"
            type="text"
            value={fields.handle}
            onChange={(e) => applyFields({ handle: sanitizeHandleInput(e.target.value) })}
            placeholder="your_name"
            className={`${styles.input} ${fieldErrors.handle ? styles.inputError : ""}`}
          />
          {fieldErrors.handle ? (
            <p className={styles.fieldError}>{fieldErrors.handle}</p>
          ) : (
            <p className={styles.help}>{t("profile.edit.handleHint")}</p>
          )}
        </div>
      )}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="about-headline">{t("profile.edit.headline")}</label>
        <input
          id="about-headline"
          type="text"
          value={fields.headline}
          onChange={(e) => applyFields({ headline: e.target.value })}
          placeholder={t("profile.edit.headlinePlaceholder")}
          className={styles.input}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="about-bio">{t("profile.edit.bio")}</label>
        <textarea
          id="about-bio"
          value={fields.bio}
          onChange={(e) => applyFields({ bio: e.target.value })}
          rows={5}
          placeholder={t("profile.edit.bioPlaceholder")}
          className={styles.input}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="about-link">{t("profile.edit.profileLink")}</label>
        <input
          id="about-link"
          type="url"
          value={fields.profileLink}
          onChange={(e) => applyFields({ profileLink: e.target.value })}
          placeholder="https://linktr.ee/yourname"
          className={`${styles.input} ${fieldErrors.profileLink ? styles.inputError : ""}`}
        />
        {fieldErrors.profileLink ? (
          <p className={styles.fieldError}>{fieldErrors.profileLink}</p>
        ) : (
          <p className={styles.help}>{t("profile.edit.profileLinkHint")}</p>
        )}
      </div>
      <div className={styles.field}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={fields.openToCollaborate}
            onChange={(e) => applyFields({ openToCollaborate: e.target.checked })}
          />
          <span>{t("profile.edit.openToCollaborate")}</span>
        </label>
        {fields.openToCollaborate && (
          <input
            type="text"
            value={fields.collaborationNote}
            onChange={(e) => applyFields({ collaborationNote: e.target.value })}
            placeholder={t("profile.edit.collaborationNotePlaceholder")}
            aria-label={t("profile.edit.collaborationNotePlaceholder")}
            className={styles.input}
          />
        )}
      </div>
      {err && <p className={`${styles.error} ${styles.avatarNote}`}>{err}</p>}
      {/* In the demo the save went nowhere, so it is not a green confirmation. */}
      {msg && <p className={`${msgIsDemo ? styles.quiet : styles.ok} ${styles.avatarNote}`}>{msg}</p>}
      <div className={styles.actions}>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSave()}
          className={`${styles.btn} ${styles.primary}`}
        >
          {t("profile.edit.save")}
        </button>
        <button type="button" disabled={busy} onClick={resetFields} className={styles.btn}>
          {t("profile.edit.cancel")}
        </button>
      </div>
    </div>
  );
}
