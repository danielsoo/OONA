"use client";

import { usePathname, useRouter } from "next/navigation";
import type { RoomListItem as RoomListItemType } from "@/components/messages/types";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { formatDmTime } from "@/lib/dm/formatDmTime";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import styles from "./MessagesEditorial.module.css";

type Props = {
  room: RoomListItemType;
};

export default function RoomListItem({ room }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { t, locale } = useTranslations();
  const active = pathname === `/messages/rooms/${room.roomId}`;

  const preview =
    room.lastSenderUid === user?.uid && room.lastMessagePreview
      ? `${t("dm.inbox.youPrefix")}${room.lastMessagePreview}`
      : room.lastMessagePreview;

  const openRoom = () => router.push(`/messages/rooms/${room.roomId}`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openRoom}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openRoom();
        }
      }}
      className={`${styles.threadRow} ${
        active ? styles.activeThread : ""
      }`}
    >
      <div className="relative w-12 h-12 shrink-0">
        {room.memberPreview.slice(0, 3).map((m, i) => (
          <div
            key={m.uid}
            className="absolute"
            style={
              i === 0
                ? { left: 0, top: 0, zIndex: 3 }
                : i === 1
                  ? { left: 12, top: 12, zIndex: 2 }
                  : { left: 24, top: 0, zIndex: 1 }
            }
          >
            <ProfileAvatar
              displayName={m.displayName}
              avatarUrl={m.avatarUrl}
              className="w-8 h-8 rounded-full bg-white/10 ring-2 ring-xiio-bg flex items-center justify-center text-[10px] font-bold text-white overflow-hidden"
              imgClassName="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
      <div className={styles.threadCopy}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-semibold text-sm text-white truncate min-w-0">{room.name}</p>
          <span className="flex items-center gap-1.5 shrink-0">
            {room.unread && <span className="w-2 h-2 rounded-full bg-xiio-accent" aria-hidden />}
            {room.lastMessageAt && (
              <span className="text-[11px] text-xiio-muted tabular-nums">
                {formatDmTime(room.lastMessageAt, locale)}
              </span>
            )}
          </span>
        </div>
        <p
          className={`text-sm truncate mt-0.5 ${room.unread ? "text-white font-medium" : "text-xiio-muted"}`}
        >
          {preview || t("dm.threadEmpty")}
        </p>
      </div>
    </div>
  );
}
