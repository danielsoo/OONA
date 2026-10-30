"use client";

import Image from "next/image";
import { useState } from "react";
import { useUiCopy } from "@/components/i18n/UiText";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { isDemoVisit } from "@/lib/demo-flags";
import {
  HERO_BACKGROUND_PRESETS,
  type HeroBackgroundId,
} from "@/lib/heroBackgroundPresets";
import { SOCIETY_BANNER_IDS } from "@/lib/societyBannerBackground";

type Props = {
  value: HeroBackgroundId;
  onChange: (id: HeroBackgroundId) => void;
};

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

export default function SocietyBannerPicker({ value, onChange }: Props) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const copy = useUiCopy();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const select = async (id: HeroBackgroundId) => {
    if (!user || busy || id === value) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/me/professional-profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ societyBannerBackgroundId: id }),
      });
      if (!res.ok) {
        setErr(t("society.hero.bannerSaveError"));
        return;
      }
      onChange(id);
      // The demo answers this in the browser and keeps nothing, so saying it
      // was saved would be untrue.
      setMsg(isDemoVisit() ? copy("Not saved — the demo keeps nothing.") : t("society.hero.bannerSaved"));
      setOpen(false);
    } catch {
      setErr(t("society.hero.bannerSaveError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setMsg(null);
          setErr(null);
        }}
        disabled={busy}
        aria-label={t("society.hero.changeBanner")}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/80 backdrop-blur-sm transition hover:border-white/35 hover:bg-black/55 hover:text-white disabled:opacity-50"
      >
        <SettingsIcon className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[min(100vw-2rem,320px)] rounded-xl border border-white/15 bg-[#0a0e14]/95 p-3 shadow-xl backdrop-blur-md">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SOCIETY_BANNER_IDS.map((id) => {
              const preset = HERO_BACKGROUND_PRESETS[id];
              const active = id === value;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  onClick={() => void select(id)}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border transition ${
                    active
                      ? "border-xiio-accent ring-2 ring-xiio-accent/40"
                      : "border-white/15 hover:border-white/30"
                  }`}
                  aria-pressed={active}
                  aria-label={id}
                >
                  <Image
                    src={preset.src}
                    alt=""
                    fill
                    className="object-cover"
                    style={{ objectPosition: preset.objectPosition }}
                    sizes="80px"
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {msg ? <p className="mt-1 text-right text-xs text-emerald-400">{msg}</p> : null}
      {err ? <p className="mt-1 text-right text-xs text-red-400">{err}</p> : null}
    </div>
  );
}
