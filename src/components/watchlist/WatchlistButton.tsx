"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { invalidateCache } from "@/lib/feedCache";
import { buttonClass } from "@/components/ui/Button";
import LoginPromptDialog from "@/components/auth/LoginPromptDialog";
import { watchHref } from "@/lib/works/catalog-ui";

type Props = {
  ownerUid: string;
  workId: string;
  variant?: "compact" | "hero";
};

function ListIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function WatchlistButton({ ownerUid, workId, variant = "compact" }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslations();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => { setLoginOpen(false); }, [user?.uid]);

  useEffect(() => {
    if (authLoading || !user) {
      setSaved(false);
      setLoaded(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const token = await user.getIdToken();
        const params = new URLSearchParams({ ownerUid, workId });
        const res = await fetch(`/api/me/watchlist?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json().catch(() => ({}))) as { saved?: boolean };
        if (!cancelled && res.ok) {
          setSaved(Boolean(data.saved));
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, ownerUid, workId]);

  const toggle = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setLoginOpen(true);
      return;
    }
    if (busy) return;

    const nextSaved = !saved;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/me/watchlist", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ownerUid, workId, saved: nextSaved }),
      });
      const data = (await res.json().catch(() => ({}))) as { saved?: boolean };
      if (res.ok) {
        setSaved(Boolean(data.saved ?? nextSaved));
        invalidateCache(`watchlist:${user.uid}`);
      }
    } finally {
      setBusy(false);
    }
  }, [authLoading, busy, ownerUid, saved, user, workId]);

  const label = saved ? t("watchlist.inList") : t("watchlist.add");
  const title = !user && !authLoading ? t("watchlist.loginRequired") : label;
  const isHero = variant === "hero";

  return (
    <>
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={authLoading || busy || (Boolean(user) && !loaded)}
      title={title}
      aria-label={title}
      className={
        isHero
          ? buttonClass({
              variant: "secondary",
              size: "lg",
              className: saved ? "!bg-white/[0.12] backdrop-blur-sm" : "backdrop-blur-sm",
            })
          : `shrink-0 inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition disabled:opacity-50 ${
              saved
                ? "text-white border-white/30 bg-white/10 hover:bg-white/15"
                : "text-white/80 border-white/15 hover:text-white hover:border-white/25"
            }`
      }
    >
      <ListIcon filled={saved} />
      <span className={isHero ? "inline" : "hidden sm:inline"}>{label}</span>
    </button>
    <LoginPromptDialog open={!authLoading && !user && loginOpen} onClose={() => setLoginOpen(false)} returnTo={watchHref(ownerUid, workId)} />
    </>
  );
}
