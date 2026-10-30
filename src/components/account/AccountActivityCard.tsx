"use client";

import Link from "next/link";
import type { WorkSection } from "@/types/work";
import styles from "@/components/settings/SettingsPage.module.css";

type Props = {
  title: string;
  section: WorkSection;
  meta: string;
  href: string;
  watchLabel: string;
  watchDisabled?: boolean;
  thumbnailUrl?: string | null;
};

export default function AccountActivityCard({
  title,
  meta,
  href,
  watchLabel,
  watchDisabled,
  thumbnailUrl,
}: Props) {
  return (
    <li className={styles.item}>
      <div className={styles.thumb} aria-hidden>
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt="" loading="lazy" />
        ) : (
          <span>{title}</span>
        )}
      </div>
      <div className={styles.itemText}>
        <span className={styles.itemTitle}>{title}</span>
        <span className={styles.itemMeta}>{meta}</span>
      </div>
      {watchDisabled ? (
        <span className={`${styles.btn} ${styles.small}`} aria-disabled="true">
          {watchLabel}
        </span>
      ) : (
        <Link href={href} className={`${styles.btn} ${styles.small}`}>
          {watchLabel}
        </Link>
      )}
    </li>
  );
}
