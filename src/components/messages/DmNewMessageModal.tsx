"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDmInbox } from "@/components/messages/DmInboxContext";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { useUiCopy } from "@/components/i18n/UiText";

type PersonHit = {
  uid: string;
  handle: string;
  displayName: string;
};

export default function DmNewMessageModal() {
  const _copy = useUiCopy();
  const { newMessageOpen, closeNewMessage, refresh } = useDmInbox();
  const { user } = useAuth();
  const { t } = useTranslations();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyHandle, setBusyHandle] = useState<string | null>(null);

  useEffect(() => {
    if (!newMessageOpen) {
      setQuery("");
      setResults([]);
    }
  }, [newMessageOpen]);

  const search = useCallback(
    async (q: string) => {
      if (!user || q.trim().length < 1) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `/api/discover/people?q=${encodeURIComponent(q.trim())}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = (await res.json()) as { people?: PersonHit[] };
        setResults(
          (data.people ?? []).filter((p) => p.uid !== user.uid).slice(0, 12)
        );
      } finally {
        setSearching(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!newMessageOpen) return;
    const id = setTimeout(() => void search(query), 300);
    return () => clearTimeout(id);
  }, [query, newMessageOpen, search]);

  const startChat = async (handle: string) => {
    if (!user || busyHandle) return;
    setBusyHandle(handle);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/me/dm/threads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ handle }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { threadId?: string };
      if (data.threadId) {
        closeNewMessage();
        await refresh();
        router.push(`/messages/${data.threadId}`);
      }
    } finally {
      setBusyHandle(null);
    }
  };

  if (!newMessageOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70"
      role="dialog"
      aria-modal
      aria-labelledby="dm-new-message-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={_copy("Close")}
        onClick={closeNewMessage}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-xiio-surface border border-white/10 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 id="dm-new-message-title" className="text-lg font-semibold text-white">
            {t("dm.newMessage.title")}
          </h2>
          <button
            type="button"
            onClick={closeNewMessage}
            className="text-xiio-muted hover:text-white p-1"
            aria-label={_copy("Close")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("dm.newMessage.searchPlaceholder")}
            autoFocus
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-xiio-muted focus:outline-none focus:border-xiio-accent/50"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto border-t border-white/10">
          {searching && (
            <li className="px-4 py-6 text-sm text-xiio-muted text-center">{t("common.loading")}</li>
          )}
          {!searching && query.trim() && results.length === 0 && (
            <li className="px-4 py-6 text-sm text-xiio-muted text-center">
              {t("dm.newMessage.noResults")}
            </li>
          )}
          {results.map((p) => (
            <li key={p.uid}>
              <button
                type="button"
                disabled={busyHandle !== null}
                onClick={() => void startChat(p.handle)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left disabled:opacity-50"
              >
                <ProfileAvatar
                  displayName={p.displayName}
                  className="w-11 h-11 rounded-full bg-xiio-accent/20 flex items-center justify-center text-sm font-bold text-white shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{p.displayName}</p>
                  <p className="text-xs text-xiio-accent">@{p.handle}</p>
                </div>
                <span className="text-xs text-xiio-muted shrink-0">
                  {busyHandle === p.handle ? t("dm.newMessage.starting") : t("dm.newMessage.start")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
