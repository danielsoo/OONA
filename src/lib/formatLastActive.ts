import { formatDmTime } from "@/lib/dm/formatDmTime";

/** Relative last-active label for Society creator rows (e.g. "Active 2 hours ago"). */
export function formatLastActive(
  iso: string | null | undefined,
  locale: string
): string {
  const relative = formatDmTime(iso, locale);
  if (!relative) return "";
  if (locale.startsWith("ko")) return relative;
  if (locale.startsWith("ja")) return `最終アクセス：${relative}`;
  return `Active ${relative}`;
}
