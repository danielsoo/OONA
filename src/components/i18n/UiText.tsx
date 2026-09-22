"use client";

import { useCallback } from "react";
import { useTranslations } from "@/context/LocaleContext";
import { translateUi } from "@/i18n/ui";

export function useUiCopy() {
  const { locale } = useTranslations();
  return useCallback((source: string, vars?: Record<string, string | number>) => translateUi(locale, source, vars), [locale]);
}

/** Returns a text node without changing the existing layout or markup. */
export default function UiText({ text }: { text: string }) {
  const copy = useUiCopy();
  return copy(text);
}
