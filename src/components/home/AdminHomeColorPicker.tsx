"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { HsvColorPicker } from "react-colorful";
import { useAuth } from "@/context/AuthContext";
import { useHomeHeroTheme } from "@/context/HomeHeroThemeContext";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useTranslations } from "@/context/LocaleContext";
import {
  CAMPUS_BACKGROUND_IDS,
  HERO_BACKGROUND_PRESETS,
  HOME_BACKGROUND_IDS,
  type CampusBackgroundId,
  type HomeBackgroundId,
} from "@/lib/heroBackgroundPresets";
import {
  DEFAULT_HOME_HERO_THEME,
  formatHsl,
  formatHsv,
  formatRgb,
  hexToHsv,
  hexToRgbTuple,
  hsvToHex,
  normalizeHex,
  type HsvColor,
} from "@/lib/homeHeroColors";

function HeroBackgroundToggle<T extends string>({
  ids,
  selectedId,
  onSelect,
  labelFor,
}: {
  ids: readonly T[];
  selectedId: T;
  onSelect: (id: T) => void;
  labelFor: (id: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const preset = HERO_BACKGROUND_PRESETS[id as keyof typeof HERO_BACKGROUND_PRESETS];
        const selected = id === selectedId;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 transition ${
              selected
                ? "border-sky-400 bg-sky-400/10"
                : "border-white/15 hover:border-white/30 hover:bg-white/[0.04]"
            }`}
            aria-pressed={selected}
          >
            <span className="relative block h-12 w-[4.5rem] overflow-hidden rounded-md bg-black/40">
              <Image
                src={preset.src}
                alt=""
                fill
                className="object-cover"
                style={{ objectPosition: preset.objectPosition }}
                sizes="72px"
                unoptimized
              />
            </span>
            <span className="text-[9px] text-white/70 leading-tight text-center max-w-[4.5rem]">
              {labelFor(id)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function AdminHomeColorPicker() {
  const pathname = usePathname();
  const { t } = useTranslations();
  const { user } = useAuth();
  const { isAdmin, checked } = useAdminAccess();
  const {
    theme,
    overlayEnabled,
    setPreviewHeroHex,
    setPreviewOverlayEnabled,
    setPreviewHomeBackground,
    setPreviewCampusBackground,
    clearPreview,
    hasPreview,
  } = useHomeHeroTheme();

  const isHomePage = pathname === "/";
  const isCampusPage = pathname === "/schools";
  const showPanel = isHomePage || isCampusPage;

  const [hexInput, setHexInput] = useState(theme.heroHex);
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(theme.heroHex) ?? { h: 212, s: 76, v: 45 });
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setHexInput(theme.heroHex);
    const next = hexToHsv(theme.heroHex);
    if (next) setHsv(next);
  }, [theme.heroHex]);

  const applyHex = useCallback(
    (hex: string) => {
      const normalized = normalizeHex(hex);
      if (!normalized) return;
      setPreviewHeroHex(normalized);
      setHexInput(normalized);
      const nextHsv = hexToHsv(normalized);
      if (nextHsv) setHsv(nextHsv);
    },
    [setPreviewHeroHex]
  );

  const onHsvChange = useCallback(
    (next: HsvColor) => {
      setHsv(next);
      applyHex(hsvToHex(next));
    },
    [applyHex]
  );

  const onHexInputBlur = () => {
    const normalized = normalizeHex(hexInput);
    if (normalized) applyHex(normalized);
    else setHexInput(theme.heroHex);
  };

  const onResetPreview = () => {
    setPreviewHeroHex(DEFAULT_HOME_HERO_THEME.heroHex);
    setPreviewOverlayEnabled(DEFAULT_HOME_HERO_THEME.overlayEnabled);
    setPreviewHomeBackground(DEFAULT_HOME_HERO_THEME.homeBackgroundId);
    setPreviewCampusBackground(DEFAULT_HOME_HERO_THEME.campusBackgroundId);
    setApplyError(null);
  };

  const onApplySiteWide = async () => {
    if (!user) return;
    setApplying(true);
    setApplyError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/home-theme", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          heroHex: theme.heroHex,
          overlayEnabled: theme.overlayEnabled,
          homeBackgroundId: theme.homeBackgroundId,
          campusBackgroundId: theme.campusBackgroundId,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setApplyError(data.message ?? t("home.colorPicker.applyFailed"));
        return;
      }
      clearPreview();
    } catch {
      setApplyError(t("home.colorPicker.applyFailed"));
    } finally {
      setApplying(false);
    }
  };

  const copyHex = async () => {
    try {
      await navigator.clipboard.writeText(theme.heroHex);
    } catch {
      /* ignore */
    }
  };

  if (!checked || !isAdmin || !showPanel) return null;

  const rgbTuple = hexToRgbTuple(theme.heroHex);
  const panelTitle = isCampusPage
    ? t("home.colorPicker.titleCampus")
    : t("home.colorPicker.title");

  return (
    <div
      className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-4 z-50 w-[min(100vw-2rem,320px)] lg:bottom-4 rounded-xl border border-white/15 bg-[#1a1a1a] shadow-2xl text-white"
      role="region"
      aria-label={panelTitle}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10">
        <p className="text-xs font-semibold text-white/90">{panelTitle}</p>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-xs text-white/60 hover:text-white px-2 py-1"
          aria-expanded={!collapsed}
        >
          {collapsed ? t("home.colorPicker.expand") : t("home.colorPicker.collapse")}
        </button>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 cursor-pointer hover:bg-white/[0.04]">
            <span className="text-xs text-white/80">
              {overlayEnabled ? t("home.colorPicker.overlayOn") : t("home.colorPicker.noOverlay")}
            </span>
            <input
              type="checkbox"
              checked={overlayEnabled}
              onChange={(e) => setPreviewOverlayEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-white/30 bg-white/10 accent-sky-500"
            />
          </label>

          {isHomePage && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-white/50">
                {t("home.colorPicker.backgroundHome")}
              </p>
              <HeroBackgroundToggle<HomeBackgroundId>
                ids={HOME_BACKGROUND_IDS}
                selectedId={theme.homeBackgroundId}
                onSelect={setPreviewHomeBackground}
                labelFor={(id) => t(`home.colorPicker.background.${id}`)}
              />
            </div>
          )}

          {isCampusPage && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-white/50">
                {t("home.colorPicker.backgroundCampus")}
              </p>
              <HeroBackgroundToggle<CampusBackgroundId>
                ids={CAMPUS_BACKGROUND_IDS}
                selectedId={theme.campusBackgroundId}
                onSelect={setPreviewCampusBackground}
                labelFor={(id) => t(`home.colorPicker.background.${id}`)}
              />
            </div>
          )}

          {isHomePage && (
            <>
              <div className={`flex gap-3 ${overlayEnabled ? "" : "opacity-40 pointer-events-none"}`}>
                <div
                  className="w-10 shrink-0 rounded-md border border-white/20"
                  style={{ backgroundColor: theme.heroHex }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1 admin-home-color-picker">
                  <HsvColorPicker color={hsv} onChange={onHsvChange} />
                </div>
              </div>

              <div
                className={`flex items-center gap-2 ${overlayEnabled ? "" : "opacity-40 pointer-events-none"}`}
              >
                <label className="text-[10px] uppercase tracking-wider text-white/50 shrink-0">
                  HEX
                </label>
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => setHexInput(e.target.value)}
                  onBlur={onHexInputBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onHexInputBlur();
                  }}
                  disabled={!overlayEnabled}
                  className="flex-1 min-w-0 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-sm font-mono uppercase disabled:opacity-60"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => void copyHex()}
                  disabled={!overlayEnabled}
                  className="shrink-0 text-xs text-white/60 hover:text-white px-2 py-1.5 rounded-md hover:bg-white/10 disabled:opacity-60"
                  title={t("home.colorPicker.copyHex")}
                >
                  {t("home.colorPicker.copy")}
                </button>
              </div>

              {rgbTuple && overlayEnabled && (
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="rounded-md bg-white/5 px-2 py-1.5">
                    <p className="text-white/45 uppercase mb-0.5">RGB</p>
                    <p className="font-mono text-white/85">{formatRgb(rgbTuple)}</p>
                  </div>
                  <div className="rounded-md bg-white/5 px-2 py-1.5">
                    <p className="text-white/45 uppercase mb-0.5">HSV</p>
                    <p className="font-mono text-white/85">{formatHsv(theme.heroHex)}</p>
                  </div>
                  <div className="rounded-md bg-white/5 px-2 py-1.5">
                    <p className="text-white/45 uppercase mb-0.5">HSL</p>
                    <p className="font-mono text-white/85">{formatHsl(theme.heroHex)}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {hasPreview && (
            <p className="text-[10px] text-amber-400/90">{t("home.colorPicker.previewHint")}</p>
          )}

          {applyError && <p className="text-xs text-red-400">{applyError}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onResetPreview}
              className="flex-1 min-w-[7rem] rounded-lg border border-white/20 px-3 py-2 text-xs font-medium hover:bg-white/10 transition"
            >
              {t("home.colorPicker.resetDefault")}
            </button>
            <button
              type="button"
              onClick={() => void onApplySiteWide()}
              disabled={applying}
              className="flex-1 min-w-[7rem] rounded-lg bg-[#256195] hover:bg-[#2d6fa8] disabled:opacity-50 px-3 py-2 text-xs font-semibold transition"
            >
              {applying ? t("home.colorPicker.applying") : t("home.colorPicker.applySiteWide")}
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .admin-home-color-picker .react-colorful {
          width: 100%;
          height: 140px;
        }
        .admin-home-color-picker .react-colorful__saturation {
          border-radius: 6px 6px 0 0;
        }
        .admin-home-color-picker .react-colorful__hue {
          height: 12px;
          border-radius: 0 0 6px 6px;
        }
        .admin-home-color-picker .react-colorful__pointer {
          width: 14px;
          height: 14px;
        }
      `}</style>
    </div>
  );
}
