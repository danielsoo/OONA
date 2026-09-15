"use client";

import { useDmInbox } from "@/components/messages/DmInboxContext";
import type { DmMainTab } from "@/components/messages/types";
import { useTranslations } from "@/context/LocaleContext";
import styles from "./MessagesEditorial.module.css";

const TABS: DmMainTab[] = ["messages", "groups", "requests", "invites"];

export default function DmInboxTabs() {
  const { mainTab, setMainTab } = useDmInbox();
  const { t } = useTranslations();

  const labels: Record<DmMainTab, string> = { messages: "All", groups: "Projects", requests: "Requests", invites: "Invites" };

  return (
    <div className={styles.inboxTabs}>
      {TABS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => setMainTab(id)}
          className={`${
            mainTab === id
              ? styles.activeTab
              : ""
          }`}
        >
          {labels[id]}
        </button>
      ))}
    </div>
  );
}
