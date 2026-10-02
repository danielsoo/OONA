import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
// Shared with the website: the same dictionaries and lookup rules.
import { isLocale, translate, type Locale } from "@/i18n";
import { translateUi } from "@/i18n/ui";

const STORAGE_KEY = "xiio_locale";

type Vars = Record<string, string | number>;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Keyed messages, e.g. t("nav.films"). */
  t: (key: string, vars?: Vars) => string;
  /** English-source UI copy, e.g. ui("Continue Watching"), same as the website's <UiText>. */
  ui: (source: string, vars?: Vars) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function deviceLocale(): Locale {
  for (const { languageCode } of getLocales()) {
    if (isLocale(languageCode)) return languageCode;
  }
  return "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(deviceLocale);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (isLocale(saved)) setLocaleState(saved);
      })
      .catch(() => {});
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
      ui: (source, vars) => translateUi(locale, source, vars),
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}
