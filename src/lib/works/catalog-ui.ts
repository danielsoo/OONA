import type { WorkSection } from "@/types/work";

/** 쇼츠·홈 카탈로그 썸네일 공통 모서리 (14px) */
export const VIDEO_THUMB_ROUNDED_CLASS = "rounded-[14px]";

const GRADIENTS = [
  "bg-gradient-to-br from-blue-900 to-purple-900",
  "bg-gradient-to-br from-gray-800 to-gray-900",
  "bg-gradient-to-br from-pink-900 to-rose-900",
  "bg-gradient-to-br from-orange-900 to-red-900",
  "bg-gradient-to-br from-cyan-900 to-blue-900",
  "bg-gradient-to-br from-purple-900 to-violet-900",
];

export function gradientForTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash + title.charCodeAt(i) * 31) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]!;
}

export function sectionCatalogHref(section: WorkSection): string {
  const paths: Record<WorkSection, string> = {
    movies: "/movies",
    series: "/series",
    entertainment: "/entertainment",
    shorts: "/shorts",
  };
  return paths[section];
}

export function watchHref(ownerUid: string, workId: string): string {
  return `/watch/${ownerUid}/${workId}`;
}

export function formatDurationMinutes(durationSec: number, locale: string = "en"): string {
  const minutes = Math.max(0, Math.round(durationSec / 60));
  if (locale.startsWith("ko")) return `${minutes}분`;
  if (locale.startsWith("ja")) return `${minutes}分`;
  return `${minutes} min`;
}

export function formatReleaseDate(iso: string, locale: string = "en-US"): string {
  try {
    return new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

/**
 * Runtime label that never reads "0 min": clips under a minute show seconds.
 * Pass `t` to localise the seconds label (ui.watch.seconds).
 */
export function formatRuntime(
  durationSec: number,
  t?: (key: string, vars?: Record<string, string | number>) => string
): string {
  const sec = Math.max(0, Math.round(durationSec));
  if (sec < 60) return t ? t("ui.watch.seconds", { count: sec }) : `${sec} sec`;
  return t ? t("ui.watch.minutes", { count: Math.max(0, Math.round(sec / 60)) }) : formatDurationMinutes(sec);
}
