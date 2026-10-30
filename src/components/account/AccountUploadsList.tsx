"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { useMyWorks } from "@/hooks/useMyWorks";
import { watchHref } from "@/lib/works/catalog-ui";
import AccountActivityCard from "@/components/account/AccountActivityCard";
import AccountEmptyState from "@/components/account/AccountEmptyState";
import styles from "@/components/settings/SettingsPage.module.css";

export default function AccountUploadsList() {
  const { user } = useAuth();
  const { t } = useTranslations();
  const { works, loading, error } = useMyWorks();

  if (loading) {
    return <p className={styles.status}>{t("common.loading")}</p>;
  }

  if (error) {
    return <p className={styles.error}>{error}</p>;
  }

  if (works.length === 0) {
    return (
      <AccountEmptyState
        message={t("accountProfile.uploadsEmpty")}
        ctaLabel={t("accountProfile.emptyUploadCta")}
        ctaHref="/uploader/upload"
      />
    );
  }

  return (
    <div>
      <ul className={styles.list}>
        {works.map((work) => (
          <AccountActivityCard
            key={work.id}
            title={work.title}
            section={work.section}
            meta={`${t(`myWorks.section.${work.section}`)} · ${t(`myWorks.status.${work.platformStatus}`)}`}
            href={user ? watchHref(user.uid, work.id) : "#"}
            watchLabel={t("accountProfile.watchLink")}
            watchDisabled={work.platformStatus !== "published"}
            thumbnailUrl={work.promo?.thumbnailUrl}
          />
        ))}
      </ul>
      <div className={styles.actions}>
        <Link href="/uploader/works" className={styles.btn}>
          {t("accountProfile.manageUploads")}
        </Link>
      </div>
    </div>
  );
}
