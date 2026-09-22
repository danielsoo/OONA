import { messages, type Locale, type MessageTree } from "./messages";

export type { Locale, MessageTree };
export { messages, LOCALES } from "./messages";

const STORAGE_KEY = "xiio_locale";

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch { /* Language selection still works when storage is unavailable. */ }
  for (const language of navigator.languages ?? [navigator.language]) {
    const code = language.toLowerCase().split("-")[0];
    if (isLocale(code)) return code;
  }
  return "en";
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ko" || value === "ja";
}

export function hasStoredLocale(): boolean {
  try { return typeof window !== "undefined" && isLocale(localStorage.getItem(STORAGE_KEY)); }
  catch { return false; }
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, locale); }
  catch { /* Private browsing and storage policies must not block switching. */ }
}

export function interpolate(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] != null ? String(vars[key]) : `{${key}}`
  );
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>
): string {
  const value = messages[locale]?.[key] ?? messages.en[key];
  if (value === undefined) return key;
  return interpolate(value, vars);
}
