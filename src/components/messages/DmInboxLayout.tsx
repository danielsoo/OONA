"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import BusinessInviteComposerModal from "@/components/messages/BusinessInviteComposerModal";
import DmSidebar from "@/components/messages/DmSidebar";
import { useDmInbox } from "@/components/messages/DmInboxContext";
import DmNewMessageModal from "@/components/messages/DmNewMessageModal";
import RoomComposerModal from "@/components/messages/RoomComposerModal";
import styles from "./MessagesEditorial.module.css";

type Props = {
  children: ReactNode;
};

export default function DmInboxLayout({ children }: Props) {
  const pathname = usePathname();
  const hasThread =
    /^\/messages\/[^/]+$/.test(pathname) || /^\/messages\/rooms\/[^/]+$/.test(pathname);
  const { businessInviteComposerOpen, closeBusinessInviteComposer, roomComposerOpen, closeRoomComposer } =
    useDmInbox();

  return (
    <>
      <div className={styles.messagesPage}>
        <div className={styles.sectionLabel}><span>02</span> MESSAGES &amp; PROJECT CHAT <small>Ideas. Notes. Progress.</small></div>
      <div className={styles.frame}>
        <aside
          className={`${styles.sidebar} ${
            hasThread ? "hidden md:flex" : "flex"
          }`}
        >
          <DmSidebar />
        </aside>
        <section
          className={`${styles.pane} ${
            hasThread ? "flex" : "hidden md:flex"
          }`}
        >
          {children}
        </section>
      </div>
      </div>
      <DmNewMessageModal />
      {businessInviteComposerOpen && (
        <BusinessInviteComposerModal onClose={closeBusinessInviteComposer} />
      )}
      {roomComposerOpen && <RoomComposerModal onClose={closeRoomComposer} />}
    </>
  );
}
