"use client";

import { useDmInbox } from "@/components/messages/DmInboxContext";
import { useTranslations } from "@/context/LocaleContext";
import styles from "./MessagesSupplement.module.css";

export default function DmEmptyPane() {
  const { openNewMessage } = useDmInbox();
  const { t } = useTranslations();

  return (
    <div className={styles.emptyPane}>
      <div className={styles.emptyGlyph}>
        <svg
          className="w-12 h-12 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      </div>
      <p>OONA MESSAGES</p>
      <h2>{t("dm.inbox.emptyTitle")}</h2>
      <span>{t("dm.inbox.emptyLead")}</span>
      <button
        type="button"
        onClick={openNewMessage}
        className={styles.emptyAction}
      >
        {t("dm.inbox.sendMessageCta")}
      </button>
    </div>
  );
}
