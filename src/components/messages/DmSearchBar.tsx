"use client";

import { useDmInbox } from "@/components/messages/DmInboxContext";
import { useTranslations } from "@/context/LocaleContext";
import styles from "./MessagesSupplement.module.css";

export default function DmSearchBar() {
  const { search, setSearch } = useDmInbox();
  const { t } = useTranslations();

  return (
    <div className={styles.searchBox}>
      <label className="relative block">
        <span className="sr-only">{t("dm.inbox.searchPlaceholder")}</span>
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-xiio-muted pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("dm.inbox.searchPlaceholder")}
          className={styles.searchInput}
        />
      </label>
    </div>
  );
}
