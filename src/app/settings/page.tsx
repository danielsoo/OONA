"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { LOCALES, type Locale } from "@/i18n";
import type { XiioTimezoneId } from "@/lib/timezone";
import AccountProfileNav from "@/components/account/AccountProfileNav";
import UiText from "@/components/i18n/UiText";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { getUserProfile } from "@/lib/userProfile";
import type { UserProfileDoc } from "@/types/user";
import AccountDeleteDialog from "@/components/settings/AccountDeleteDialog";
import DirectorNameSettingsSection from "@/components/settings/DirectorNameSettingsSection";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import styles from "@/components/settings/SettingsPage.module.css";

const TIMEZONE_OPTIONS: { id: XiioTimezoneId; labelKey: string }[] = [
  { id: "auto", labelKey: "settings.timezoneAuto" },
  { id: "korea", labelKey: "settings.timezoneKorea" },
  { id: "us_eastern", labelKey: "settings.timezoneUsEastern" },
  { id: "us_pacific", labelKey: "settings.timezoneUsPacific" },
  { id: "utc", labelKey: "settings.timezoneUtc" },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { isAdmin, checked: adminChecked } = useAdminAccess();
  const { t, locale, setLocale, timezone, setTimezone } = useTranslations();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [accountProfile, setAccountProfile] = useState<UserProfileDoc | null>(null);

  useEffect(() => {
    if (!user) {
      setAccountProfile(null);
      return;
    }
    let cancelled = false;
    void getUserProfile(user.uid).then((profile) => {
      if (!cancelled) setAccountProfile(profile);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (!user) {
    return (
      <main className={`${styles.page} ${styles.signedOut}`}>
        <Link href="/login" className={styles.textLink}>
          {t("common.loginRequired")}
        </Link>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={`${styles.inner} ${styles.workspace}`}>
        <aside className={styles.side}>
          <AccountProfileNav variant="sidebar" place="settings" />
        </aside>

        <div className={styles.main}>
          <div className={styles.mobileNav}>
            <AccountProfileNav variant="mobile" place="settings" />
          </div>

          <header className={styles.head}>
            <p className={styles.eyebrow}><UiText text={"ACCOUNT & SETTINGS"} /></p>
            <h1 className={styles.title}>{t("settings.title")}</h1>
            <p className={styles.lede}>{t("settings.pageLead")}</p>
          </header>

          {accountProfile && (
            <section className={`${styles.section} ${styles.row}`}>
              <div>
                <h2 className={styles.sectionTitle}>{t("settings.accountSection")}</h2>
              </div>
              <div className={styles.cardTop}>
                <ProfileAvatar
                  displayName={accountProfile.displayName || "?"}
                  avatarUrl={accountProfile.avatarUrl}
                  className={styles.cardAvatar}
                  imgClassName="h-full w-full object-cover"
                />
                <div className={styles.who}>
                  <p className={styles.cardName}>{accountProfile.displayName || "—"}</p>
                  {accountProfile.handle ? <p className={styles.cardHandle}>@{accountProfile.handle}</p> : null}
                  <div className={styles.actions}>
                    <Link href="/account" className={`${styles.btn} ${styles.small}`}>
                      {t("settings.viewAccountProfile")}
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className={`${styles.section} ${styles.row}`}>
            <div>
              <h2 className={styles.sectionTitle}>{t("settings.language")}</h2>
              <p className={styles.sectionHint}>{t("settings.languageHint")}</p>
            </div>
            <div className={styles.choices}>
              {LOCALES.map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={locale === code}
                  onClick={() => setLocale(code as Locale)}
                  className={`${styles.choice} ${locale === code ? styles.choiceOn : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {adminChecked && isAdmin && (
            <section className={`${styles.section} ${styles.row}`}>
              <div>
                <h2 className={styles.sectionTitle}>{t("settings.timezone")}</h2>
                <p className={styles.sectionHint}>{t("settings.timezoneHint")}</p>
              </div>
              <div className={styles.choices}>
                {TIMEZONE_OPTIONS.map(({ id, labelKey }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={timezone === id}
                    onClick={() => setTimezone(id)}
                    className={`${styles.choice} ${timezone === id ? styles.choiceOn : ""}`}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </section>
          )}

          <DirectorNameSettingsSection />

          <section className={`${styles.section} ${styles.actions} ${styles.flush}`}>
            <button type="button" onClick={() => void handleLogout()} className={`${styles.btn} ${styles.danger}`}>
              {t("settings.logout")}
            </button>
            <p className={styles.quiet}>
              {t("settings.deleteAccount.hint")}{" "}
              <button type="button" onClick={() => setDeleteOpen(true)}>
                {t("settings.deleteAccount.link")}
              </button>
            </p>
          </section>
        </div>
      </div>

      <AccountDeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onSuccess={async () => {
          setDeleteOpen(false);
          await logout();
          router.push("/");
        }}
      />
    </main>
  );
}
