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

type Props = {
  onClose: () => void;
};

export default function RoomComposerModal({ onClose }: Props) {
  const _copy = useUiCopy();
  const { refreshRooms } = useDmInbox();
  const { user } = useAuth();
  const { t } = useTranslations();
  const router = useRouter();

  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<PersonHit[]>([]);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const search = useCallback(
    async (q: string) => {
      if (!user || q.trim().length < 1) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/discover/people?q=${encodeURIComponent(q.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = (await res.json()) as { people?: PersonHit[] };
        setResults((data.people ?? []).filter((p) => p.uid !== user.uid).slice(0, 12));
      } finally {
        setSearching(false);
      }
    },
    [user]
  );

  useEffect(() => {
    const id = setTimeout(() => void search(query), 300);
    return () => clearTimeout(id);
  }, [query, search]);

  const toggleSelect = (person: PersonHit) => {
    setSelected((prev) =>
      prev.some((p) => p.uid === person.uid)
        ? prev.filter((p) => p.uid !== person.uid)
        : [...prev, person]
    );
  };

  const create = async () => {
    if (!user || creating) return;
    if (!name.trim()) {
      setErr(t("dm.rooms.errorNameRequired"));
      return;
    }
    if (selected.length === 0) {
      setErr(t("dm.rooms.errorMembersRequired"));
      return;
    }
    setCreating(true);
    setErr(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/me/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          memberUids: selected.map((p) => p.uid),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; roomId?: string; message?: string };
      if (!res.ok || !data.ok || !data.roomId) {
        setErr(data.message ?? t("dm.rooms.errorGeneric"));
        return;
      }
      await refreshRooms();
      onClose();
      router.push(`/messages/rooms/${data.roomId}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70"
      role="dialog"
      aria-modal
      aria-labelledby="room-composer-title"
    >
      <button type="button" className="absolute inset-0" aria-label={_copy("Close")} onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-xiio-surface border border-white/10 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <h2 id="room-composer-title" className="text-lg font-semibold text-white">
            {t("dm.rooms.composerTitle")}
          </h2>
          <button type="button" onClick={onClose} className="text-xiio-muted hover:text-white p-1" aria-label={_copy("Close")}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto min-h-0">
          <div>
            <label htmlFor="room-name" className="text-xs text-xiio-muted mb-2 block">
              {t("dm.rooms.nameLabel")}
            </label>
            <input
              id="room-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("dm.rooms.namePlaceholder")}
              maxLength={100}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-xiio-muted focus:outline-none focus:border-xiio-accent/50"
            />
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((p) => (
                <button
                  key={p.uid}
                  type="button"
                  onClick={() => toggleSelect(p)}
                  className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-white/10 text-xs text-white hover:bg-white/15 transition"
                >
                  <ProfileAvatar
                    displayName={p.displayName}
                    className="w-5 h-5 rounded-full bg-xiio-accent/20 flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  />
                  {p.displayName}
                  <span aria-hidden>×</span>
                </button>
              ))}
            </div>
          )}

          <div>
            <label htmlFor="room-members-search" className="text-xs text-xiio-muted mb-2 block">
              {t("dm.rooms.membersLabel")}
            </label>
            <input
              id="room-members-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("dm.rooms.membersSearchPlaceholder")}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-xiio-muted focus:outline-none focus:border-xiio-accent/50"
            />
            <ul className="max-h-48 overflow-y-auto mt-2 border border-white/10 rounded-xl divide-y divide-white/5">
              {searching && (
                <li className="px-4 py-4 text-sm text-xiio-muted text-center">{t("common.loading")}</li>
              )}
              {!searching && query.trim() && results.length === 0 && (
                <li className="px-4 py-4 text-sm text-xiio-muted text-center">
                  {t("dm.rooms.membersNoResults")}
                </li>
              )}
              {results.map((p) => {
                const isSelected = selected.some((s) => s.uid === p.uid);
                return (
                  <li key={p.uid}>
                    <button
                      type="button"
                      onClick={() => toggleSelect(p)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition text-left ${
                        isSelected ? "bg-white/5" : ""
                      }`}
                    >
                      <ProfileAvatar
                        displayName={p.displayName}
                        className="w-9 h-9 rounded-full bg-xiio-accent/20 flex items-center justify-center text-xs font-bold text-white shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{p.displayName}</p>
                        <p className="text-xs text-xiio-accent">@{p.handle}</p>
                      </div>
                      {isSelected && <span className="text-xs text-xiio-accent shrink-0">✓</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {err && <p className="text-red-400 text-sm">{err}</p>}
        </div>

        <div className="px-4 py-3 border-t border-white/10 shrink-0">
          <button
            type="button"
            disabled={creating}
            onClick={() => void create()}
            className="w-full px-4 py-2.5 rounded-lg bg-xiio-accent text-white text-sm font-semibold disabled:opacity-40"
          >
            {creating ? t("dm.rooms.creating") : t("dm.rooms.create")}
          </button>
        </div>
      </div>
    </div>
  );
}
