"use client";

import { useEffect, useState } from "react";
import BusinessInviteList from "@/components/messages/BusinessInviteList";
import { useDmInbox } from "@/components/messages/DmInboxContext";
import DmInboxTabs from "@/components/messages/DmInboxTabs";
import DmSearchBar from "@/components/messages/DmSearchBar";
import DmThreadList from "@/components/messages/DmThreadList";
import RoomList from "@/components/messages/RoomList";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { getUserProfile } from "@/lib/userProfile";
import styles from "./MessagesEditorial.module.css";

export default function DmSidebar() {
  const { mainTab, openNewMessage, openRoomComposer } = useDmInbox();
  const { user } = useAuth();
  const { t } = useTranslations();
  const [handle, setHandle] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getUserProfile(user.uid).then((p) => {
      if (cancelled) return;
      setHandle(p?.handle ?? null);
      setDisplayName(p?.displayName?.trim() || user.displayName || "");
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const headerLabel = handle ? `@${handle}` : displayName || t("dm.inboxTitle");

  return (
    <div className={styles.sidebarInner}>
      <div className={styles.inboxHeader}>
        <div><h1>Messages</h1><p>{headerLabel}</p></div>
        <button
          type="button"
          onClick={mainTab === "groups" ? openRoomComposer : openNewMessage}
          className={styles.composeButton}
          aria-label={mainTab === "groups" ? t("dm.rooms.newRoom") : t("dm.inbox.newMessage")}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
      </div>
      <DmInboxTabs />
      {mainTab === "invites" ? (
        <BusinessInviteList />
      ) : mainTab === "groups" ? (
        <RoomList />
      ) : (
        <>
          <DmSearchBar />
          <div className="flex-1 overflow-y-auto min-h-0">
            <DmThreadList />
          </div>
        </>
      )}
    </div>
  );
}
