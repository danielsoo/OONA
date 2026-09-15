"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDmInbox } from "@/components/messages/DmInboxContext";
import DmProfileLink from "@/components/messages/DmProfileLink";
import MessageActionsToolbar from "@/components/messages/MessageActionsToolbar";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import {
  formatClockTime,
  formatDateDivider,
  isSameCalendarDay,
  isSameClockMinute,
} from "@/lib/dm/formatDmTime";
import styles from "./MessagesEditorial.module.css";

type Message = {
  id: string;
  senderUid: string;
  text: string;
  createdAt: string | null;
  pending?: boolean;
  failed?: boolean;
  reactions?: Record<string, string>;
  replyToMessageId?: string;
  replyToSenderUid?: string;
  replyToText?: string;
};
type Member = { uid: string; handle: string | null; displayName: string; avatarUrl: string | null };

type ReplyingTo = {
  messageId: string;
  senderUid: string;
  senderName: string;
  text: string;
};

type Props = {
  roomId: string;
};

export default function RoomConversationPane({ roomId }: Props) {
  const { user } = useAuth();
  const { t, locale } = useTranslations();
  const router = useRouter();
  const { refreshRooms } = useDmInbox();
  const [messages, setMessages] = useState<Message[]>([]);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !roomId) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/me/rooms/${roomId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 403 || res.status === 404) setNotFound(true);
      return;
    }
    const data = (await res.json()) as {
      messages?: Message[];
      name?: string;
      members?: Member[];
    };
    setMessages(data.messages ?? []);
    setName(data.name ?? "");
    setMembers(data.members ?? []);
  }, [user, roomId]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 8000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const lastId = messages.length > 0 ? messages[messages.length - 1].id : null;
    if (lastId === lastMessageIdRef.current) return;
    const isFirstLoad = lastMessageIdRef.current === null;
    lastMessageIdRef.current = lastId;
    scrollContainerRef.current?.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: isFirstLoad ? "auto" : "smooth",
    });
  }, [messages]);

  const memberMap = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members) map.set(m.uid, m);
    return map;
  }, [members]);

  const otherMembers = useMemo(
    () => members.filter((m) => m.uid !== user?.uid),
    [members, user]
  );

  const send = () => {
    if (!user || !roomId) return;
    const payload = text.trim();
    if (!payload) return;

    // Show the message immediately — the network call happens in the background,
    // so sending never blocks on Firestore round-trip latency.
    setText("");
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const nowIso = new Date().toISOString();
    const replyPayload = replyingTo
      ? { messageId: replyingTo.messageId, senderUid: replyingTo.senderUid, text: replyingTo.text }
      : undefined;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        senderUid: user.uid,
        text: payload,
        createdAt: nowIso,
        pending: true,
        replyToMessageId: replyPayload?.messageId,
        replyToSenderUid: replyPayload?.senderUid,
        replyToText: replyPayload?.text,
      },
    ]);
    setReplyingTo(null);

    void (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/me/rooms/${roomId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: payload, replyTo: replyPayload }),
        });
        if (res.ok) {
          const data = (await res.json()) as { messageId?: string };
          if (data.messageId) {
            const messageId = data.messageId;
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? { ...m, id: messageId, pending: false } : m))
            );
          }
          // Background sync — reconciles unread badges / room list ordering with
          // what's already shown optimistically; doesn't block anything above.
          void load();
          void refreshRooms();
        } else {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
        }
      } catch {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
      }
    })();
  };

  const handleReact = (messageId: string, emoji: string) => {
    if (!user) return;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = { ...(m.reactions ?? {}) };
        if (reactions[user.uid] === emoji) {
          delete reactions[user.uid];
        } else {
          reactions[user.uid] = emoji;
        }
        return { ...m, reactions };
      })
    );
    void (async () => {
      const token = await user.getIdToken();
      await fetch(`/api/me/rooms/${roomId}/messages/${messageId}/react`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      void load();
    })();
  };

  const handleReply = (m: Message) => {
    setReplyingTo({
      messageId: m.id,
      senderUid: m.senderUid,
      senderName:
        m.senderUid === user?.uid ? t("dm.actions.you") : memberMap.get(m.senderUid)?.displayName ?? "—",
      text: m.text,
    });
  };

  const handleCopy = (value: string) => {
    void navigator.clipboard.writeText(value);
  };

  const handleDelete = (messageId: string) => {
    if (!user) return;
    if (!window.confirm(t("dm.actions.deleteConfirm"))) return;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    void (async () => {
      const token = await user.getIdToken();
      await fetch(`/api/me/rooms/${roomId}/messages/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      void load();
      void refreshRooms();
    })();
  };

  const leave = async () => {
    if (!user || busy) return;
    if (!window.confirm(t("dm.rooms.leaveConfirm"))) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      await fetch(`/api/me/rooms/${roomId}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      await refreshRooms();
      router.push("/messages");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send();
  };

  if (!user) return null;

  if (notFound) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-xiio-muted">{t("dm.rooms.errorGeneric")}</p>
      </div>
    );
  }

  return (
    <div className={styles.conversation}>
      <header className={styles.conversationHeader}>
        <Link
          href="/messages"
          className="md:hidden text-sm text-xiio-muted hover:text-white shrink-0"
          aria-label={t("dm.back")}
        >
          ←
        </Link>
        <div className="relative w-10 h-10 shrink-0">
          {otherMembers.slice(0, 3).map((m, i) => (
            <div
              key={m.uid}
              className="absolute"
              style={
                i === 0
                  ? { left: 0, top: 0, zIndex: 3 }
                  : i === 1
                    ? { left: 10, top: 10, zIndex: 2 }
                    : { left: 20, top: 0, zIndex: 1 }
              }
            >
              <ProfileAvatar
                displayName={m.displayName}
                avatarUrl={m.avatarUrl}
                className="w-7 h-7 rounded-full bg-white/10 ring-2 ring-xiio-bg flex items-center justify-center text-[9px] font-bold text-white overflow-hidden"
                imgClassName="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white truncate">{name}</p>
          <p className="text-xs text-xiio-muted truncate">
            {t("dm.rooms.membersCount", { count: members.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void leave()}
          disabled={busy}
          className="text-xs text-red-400 hover:underline shrink-0 disabled:opacity-40"
        >
          {t("dm.rooms.leaveRoom")}
        </button>
      </header>

      <div ref={scrollContainerRef} className={styles.messageStream}>
        {messages.length === 0 ? (
          <p className="text-center text-sm text-xiio-muted py-12">{t("dm.threadEmpty")}</p>
        ) : (
          messages.map((m, i) => {
            const mine = m.senderUid === user.uid;
            const sender = memberMap.get(m.senderUid);
            const prev = i > 0 ? messages[i - 1] : null;
            const next = i < messages.length - 1 ? messages[i + 1] : null;
            const groupedWithPrev =
              prev !== null && prev.senderUid === m.senderUid && isSameClockMinute(prev.createdAt, m.createdAt);
            const isLastInGroup =
              next === null || next.senderUid !== m.senderUid || !isSameClockMinute(next.createdAt, m.createdAt);
            const showDateDivider = i === 0 || !isSameCalendarDay(prev?.createdAt, m.createdAt);
            const marginTop = i === 0 || showDateDivider ? "" : groupedWithPrev ? "mt-1" : "mt-3";

            const reactionSet = Array.from(new Set(Object.values(m.reactions ?? {})));

            const replyQuote = m.replyToMessageId && (
              <div className="max-w-full mb-1 px-2 py-1 rounded-lg bg-white/5 border-l-2 border-xiio-accent/60 text-[11px] text-xiio-muted truncate">
                {m.replyToSenderUid === user.uid
                  ? t("dm.actions.you")
                  : memberMap.get(m.replyToSenderUid ?? "")?.displayName ?? "—"}
                : {m.replyToText}
              </div>
            );

            const bubble = mine ? (
              <div className={`flex flex-col min-w-0 max-w-[75%] ml-auto items-end ${marginTop}`}>
                {replyQuote}
                <div className="group flex items-end gap-1 justify-end">
                  <MessageActionsToolbar
                    active={activeMessageId === m.id}
                    onReact={(emoji) => handleReact(m.id, emoji)}
                    onReply={() => handleReply(m)}
                    onCopy={() => handleCopy(m.text)}
                    onDelete={() => handleDelete(m.id)}
                  />
                  <div
                    onClick={() => setActiveMessageId((v) => (v === m.id ? null : m.id))}
                    className={`${styles.bubble} ${styles.mineBubble} ${
                      m.pending ? "opacity-60" : ""
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
                {reactionSet.length > 0 && (
                  <div className="mt-0.5 px-1 text-xs">{reactionSet.join(" ")}</div>
                )}
                {m.failed && (
                  <p className="text-[11px] text-red-400 mt-0.5 px-1">{t("dm.sendFailed")}</p>
                )}
              </div>
            ) : (
              <div className={`flex flex-col min-w-0 max-w-[75%] items-start ${marginTop}`}>
                <p className="text-[11px] text-xiio-muted mb-0.5 px-1">{sender?.displayName ?? "—"}</p>
                {replyQuote}
                {/* Avatar and bubble share one row so they're always the same height —
                    the timestamp lives outside this row so it can't skew that alignment. */}
                <div className="group flex gap-2 min-w-0 w-full items-end">
                  {isLastInGroup ? (
                    <DmProfileLink handle={sender?.handle ?? null} uid={m.senderUid} className="shrink-0">
                      <ProfileAvatar
                        displayName={sender?.displayName || "?"}
                        avatarUrl={sender?.avatarUrl ?? null}
                        className={styles.messageAvatar}
                        imgClassName="w-full h-full object-cover"
                      />
                    </DmProfileLink>
                  ) : (
                    <div className="w-8 h-8 shrink-0" aria-hidden />
                  )}
                  <div
                    onClick={() => setActiveMessageId((v) => (v === m.id ? null : m.id))}
                    className={`${styles.bubble} ${styles.theirBubble}`}
                  >
                    {m.text}
                  </div>
                  <MessageActionsToolbar
                    active={activeMessageId === m.id}
                    onReact={(emoji) => handleReact(m.id, emoji)}
                    onReply={() => handleReply(m)}
                    onCopy={() => handleCopy(m.text)}
                  />
                </div>
                {reactionSet.length > 0 && (
                  <div className="mt-0.5 pl-10 text-xs">{reactionSet.join(" ")}</div>
                )}
                {isLastInGroup && (
                  <p className="text-[11px] text-xiio-muted mt-0.5 pl-10">
                    {formatClockTime(m.createdAt, locale)}
                  </p>
                )}
              </div>
            );

            return (
              <Fragment key={m.id}>
                {showDateDivider && (
                  <div className="flex justify-center my-4">
                    <span className="text-[11px] text-xiio-muted">{formatDateDivider(m.createdAt, locale)}</span>
                  </div>
                )}
                {bubble}
              </Fragment>
            );
          })
        )}
      </div>

      {replyingTo && (
        <div className="flex items-center gap-2 border-t border-white/10 px-4 py-2 bg-white/[0.02] shrink-0">
          <div className="flex-1 min-w-0 pl-2 border-l-2 border-xiio-accent/60">
            <p className="text-[11px] text-xiio-accent">
              {t("dm.actions.replyingTo", { name: replyingTo.senderName })}
            </p>
            <p className="text-xs text-xiio-muted truncate">{replyingTo.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="text-xs text-xiio-muted hover:text-white px-2 shrink-0"
            aria-label={t("dm.actions.cancelReply")}
          >
            ×
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={styles.composer}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("dm.placeholder")}
          className={styles.composerInput}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className={styles.sendButton}
        >
          {t("dm.send")}
        </button>
      </form>
    </div>
  );
}
