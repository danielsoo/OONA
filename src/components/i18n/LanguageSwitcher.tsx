"use client";

import { LOCALES, isLocale } from "@/i18n";
import { useTranslations } from "@/context/LocaleContext";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslations();
  return (
    <select
      aria-label={t("settings.language")}
      value={locale}
      onChange={(event) => { if (isLocale(event.target.value)) setLocale(event.target.value); }}
      className="max-w-[96px] shrink-0 rounded-full border border-white/20 bg-[#07111b] px-2 py-2 text-xs text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
    >
      {LOCALES.map(({ code, label }) => <option key={code} value={code} lang={code}>{label}</option>)}
    </select>
  );
}
