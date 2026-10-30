"use client";

import Link from "next/link";
import styles from "@/components/settings/SettingsPage.module.css";

type Props = {
  message: string;
  ctaLabel: string;
  ctaHref: string;
};

export default function AccountEmptyState({ message, ctaLabel, ctaHref }: Props) {
  return (
    <div className={styles.empty}>
      <p>{message}</p>
      <Link href={ctaHref} className={`${styles.btn} ${styles.primary}`}>
        {ctaLabel}
      </Link>
    </div>
  );
}
