"use client";

import { useMemo, useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User,
} from "firebase/auth";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import styles from "@/components/settings/SettingsPage.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const REMOVED_KEYS = [
  "itemProfileRemoved",
  "itemPeopleHidden",
  "itemPiiRemoved",
  "itemWatchProfilesRemoved",
  "itemUnpublishedWorksDeleted",
  "itemPortfolioSharesRemoved",
  "itemActivityRemoved",
  "itemFollowsRemoved",
  "itemBlocksRemoved",
  "itemDmRemoved",
  "itemAvatarStorageRemoved",
  "itemBillingRemoved",
  "itemPendingRequestsCancelled",
] as const;

const RETAINED_KEYS = [
  "itemPublishedWorksRemain",
  "itemWatchUrlsRemain",
  "itemDirectorCreditNamesRemain",
  "itemCreditsOnOthersWorksRemain",
  "itemPaymentEventsRetained",
  "itemReportsAuditRetained",
  "itemModerationRetained",
] as const;

function DisclosureSection({
  title,
  items,
  t,
  variant,
}: {
  title: string;
  items: readonly string[];
  t: (key: string) => string;
  variant: "removed" | "retained" | "default";
}) {
  const tone =
    variant === "retained" ? styles.disclosureRetained : variant === "removed" ? styles.disclosureRemoved : "";
  return (
    <section className={`${styles.disclosure} ${tone}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((key) => (
          <li key={key}>{t(`settings.deleteAccount.${key}`)}</li>
        ))}
      </ul>
    </section>
  );
}

function isEmailPasswordUser(user: User): boolean {
  return user.providerData.some((p) => p.providerId === "password");
}

export default function AccountDeleteDialog({ open, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const [agreed, setAgreed] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expectedPhrase = t("settings.deleteAccount.confirmPhraseExpected");
  const phraseOk = phrase.trim() === expectedPhrase;
  const needsPassword = user ? isEmailPasswordUser(user) : false;
  const canSubmit = agreed && phraseOk && (!needsPassword || password.length > 0) && !busy;

  const accountItems = useMemo(
    () => ["itemAuthDeleted", "itemAuthLinksRemoved", "itemNoServiceAccess"],
    []
  );
  const recoveryItems = useMemo(
    () => ["itemNoRecovery", "itemReregisterRequired", "itemHandleMayBeReused"],
    []
  );
  const notesItems = useMemo(
    () => ["itemAdminCannotDelete", "itemPartialFailure", "itemLogoutAfterDelete"],
    []
  );

  if (!open) return null;

  const resetForm = () => {
    setAgreed(false);
    setPhrase("");
    setPassword("");
    setError(null);
  };

  const handleClose = () => {
    if (busy) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    setBusy(true);
    setError(null);

    try {
      if (needsPassword) {
        if (!user.email) {
          setError(t("settings.deleteAccount.errorGeneric"));
          setBusy(false);
          return;
        }
        const cred = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, cred);
      }

      const token = await user.getIdToken();
      const res = await fetch("/api/me/account/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmPhrase: phrase.trim() }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        if (body.error === "admin_cannot_delete") {
          setError(t("settings.deleteAccount.errorAdmin"));
        } else if (body.error === "auth_delete_failed") {
          setError(body.message ?? t("settings.deleteAccount.errorGeneric"));
        } else {
          setError(body.message ?? t("settings.deleteAccount.errorGeneric"));
        }
        setBusy(false);
        return;
      }

      resetForm();
      onSuccess();
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "auth/requires-recent-login") {
        setError(t("settings.deleteAccount.errorRecentLogin"));
      } else if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError(t("settings.deleteAccount.errorWrongPassword"));
      } else {
        setError(t("settings.deleteAccount.errorGeneric"));
      }
      setBusy(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="account-delete-title">
      <div className={styles.dialog}>
        <div className={styles.dialogHead}>
          <h2 id="account-delete-title" className={styles.dialogTitle}>
            {t("settings.deleteAccount.dialogTitle")}
          </h2>
        </div>

        <div className={styles.dialogBody}>
          <p>{t("settings.deleteAccount.dialogLead")}</p>
          <DisclosureSection
            title={t("settings.deleteAccount.sectionAccount")}
            items={accountItems}
            t={t}
            variant="default"
          />
          <DisclosureSection
            title={t("settings.deleteAccount.sectionRemoved")}
            items={REMOVED_KEYS}
            t={t}
            variant="removed"
          />
          <DisclosureSection
            title={t("settings.deleteAccount.sectionRetained")}
            items={RETAINED_KEYS}
            t={t}
            variant="retained"
          />
          <DisclosureSection
            title={t("settings.deleteAccount.sectionRecovery")}
            items={recoveryItems}
            t={t}
            variant="default"
          />
          <DisclosureSection
            title={t("settings.deleteAccount.sectionNotes")}
            items={notesItems}
            t={t}
            variant="default"
          />
        </div>

        <div className={`${styles.dialogFoot} ${styles.stack}`}>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={busy}
            />
            <span>{t("settings.deleteAccount.confirmCheckbox")}</span>
          </label>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="account-delete-phrase">
              {t("settings.deleteAccount.confirmPhraseLabel")}
            </label>
            <input
              id="account-delete-phrase"
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={t("settings.deleteAccount.confirmPhrasePlaceholder")}
              disabled={busy}
              autoComplete="off"
              className={styles.input}
            />
          </div>

          {needsPassword && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="account-delete-password">
                {t("settings.deleteAccount.passwordLabel")}
              </label>
              <PasswordInput
                id="account-delete-password"
                className={`${styles.input} pr-11`}
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={busy}
              />
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleClose}
              disabled={busy}
              className={styles.btn}
            >
              {t("settings.deleteAccount.cancel")}
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
              className={`${styles.btn} ${styles.wipe}`}
            >
              {busy ? t("settings.deleteAccount.submitting") : t("settings.deleteAccount.submit")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
