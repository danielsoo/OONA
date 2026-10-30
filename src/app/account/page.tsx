"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import AccountProfileContent from "@/components/account/AccountProfileContent";
import styles from "@/components/settings/SettingsPage.module.css";

function AccountProfileFallback() {
  const { t } = useTranslations();
  return <p className={styles.status}>{t("common.loading")}</p>;
}

export default function AccountPage() {
  const { user } = useAuth();
  const { t } = useTranslations();

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
      <div className={styles.inner}>
        <Suspense fallback={<AccountProfileFallback />}>
          <AccountProfileContent />
        </Suspense>
      </div>
    </main>
  );
}
