"use client";

import { useTranslations } from "@/context/LocaleContext";
import { watchHref } from "@/lib/works/catalog-ui";
import type { AccountActivityItem } from "@/types/account-activity";
import AccountActivityCard from "@/components/account/AccountActivityCard";
import AccountEmptyState from "@/components/account/AccountEmptyState";
import styles from "@/components/settings/SettingsPage.module.css";

type Props = {
  items: AccountActivityItem[];
  emptyMessage: string;
  emptyCtaLabel: string;
  emptyCtaHref: string;
  showTarget?: boolean;
};

export default function AccountWorkActivityList({
  items,
  emptyMessage,
  emptyCtaLabel,
  emptyCtaHref,
  showTarget,
}: Props) {
  const { t, formatDateTime } = useTranslations();

  if (items.length === 0) {
    return (
      <AccountEmptyState message={emptyMessage} ctaLabel={emptyCtaLabel} ctaHref={emptyCtaHref} />
    );
  }

  return (
    <ul className={styles.list}>
      {items.map((item) => {
        const metaParts: string[] = [t(`myWorks.section.${item.section}`)];
        if (showTarget && item.target) {
          metaParts.push(
            item.target === "promo" ? t("accountProfile.targetPromo") : t("accountProfile.targetFull")
          );
        }
        if (item.at != null) {
          metaParts.push(formatDateTime(item.at));
        }
        return (
          <AccountActivityCard
            key={`${item.ownerUid}_${item.workId}_${item.target ?? "work"}`}
            title={item.title}
            section={item.section}
            meta={metaParts.join(" · ")}
            href={watchHref(item.ownerUid, item.workId)}
            watchLabel={t("accountProfile.watchLink")}
            thumbnailUrl={item.thumbnailUrl}
          />
        );
      })}
    </ul>
  );
}
