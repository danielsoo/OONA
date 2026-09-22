import { interpolate, messages, type Locale } from "./index";
import { sourceKeys } from "./source-keys";
import { uiMessages } from "./ui-messages";

/** Translate application copy only. Titles, names, and messages written by users stay untouched. */
export function translateUi(locale: Locale, source: string, vars?: Record<string, string | number>): string {
  const lookup = source.toLowerCase();
  const custom = uiMessages[lookup];
  const key = sourceKeys[lookup];
  const value = locale === "en"
    ? (key ? messages.en[key] : source)
    : custom?.[locale === "ko" ? 0 : 1] ?? (key ? messages[locale][key] : source);
  return interpolate((value ?? source).replace(/\bXIIO\b/g, "OONA"), vars);
}
