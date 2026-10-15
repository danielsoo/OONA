"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { LOCALES } from "@/i18n";
import { useTranslations } from "@/context/LocaleContext";
import styles from "./LanguageSwitcher.module.css";

/**
 * The language picker: a pill showing the current language (or, with
 * variant "icon", just a globe) that opens a small menu of the others (a
 * listbox: arrow keys, Enter, Escape).
 */
export default function LanguageSwitcher({ variant = "pill" }: { variant?: "pill" | "icon" }) {
  const { locale, setLocale, t } = useTranslations();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0]!;

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // Opening moves focus to the current language.
  useEffect(() => {
    if (open) optionRefs.current[LOCALES.findIndex((l) => l.code === locale)]?.focus();
  }, [open, locale]);

  const choose = (code: (typeof LOCALES)[number]["code"]) => {
    setLocale(code);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onMenuKey = (event: KeyboardEvent<HTMLUListElement>) => {
    const index = optionRefs.current.findIndex((el) => el === document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      optionRefs.current[(index + step + LOCALES.length) % LOCALES.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      optionRefs.current[event.key === "Home" ? 0 : LOCALES.length - 1]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.button} ${variant === "icon" ? styles.iconButton : ""} ${open ? styles.buttonOpen : ""}`}
        aria-label={`${t("settings.language")}: ${current.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <svg className={styles.globe} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.6 2.5 3.9 5.5 3.9 9s-1.3 6.5-3.9 9c-2.6-2.5-3.9-5.5-3.9-9S9.4 5.5 12 3z" />
        </svg>
        <span className={styles.full} lang={current.code}>{current.label}</span>
        <span className={styles.short}>{current.code.toUpperCase()}</span>
        <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <ul id={menuId} className={styles.menu} role="listbox" aria-label={t("settings.language")} onKeyDown={onMenuKey}>
          {LOCALES.map(({ code, label }, i) => {
            const on = code === locale;
            return (
              <li key={code} role="none">
                <button
                  ref={(el) => {
                    optionRefs.current[i] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={on}
                  lang={code}
                  className={`${styles.option} ${on ? styles.optionOn : ""}`}
                  onClick={() => choose(code)}
                >
                  <span>{label}</span>
                  {on ? (
                    <svg className={styles.check} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  ) : (
                    <span className={styles.code}>{code}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** The language choice as a row of three, for menus (the header's account menu). */
export function LanguageMenuRow() {
  const { locale, setLocale, t } = useTranslations();
  return (
    <div className={styles.menuRow} role="group" aria-label={t("settings.language")}>
      <span className={styles.menuRowLabel}>
        <svg className={styles.globe} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.6 2.5 3.9 5.5 3.9 9s-1.3 6.5-3.9 9c-2.6-2.5-3.9-5.5-3.9-9S9.4 5.5 12 3z" />
        </svg>
        {t("settings.language")}
      </span>
      <div className={styles.menuRowOptions}>
        {LOCALES.map(({ code, label }) => (
          <button key={code} type="button" lang={code} aria-pressed={code === locale} onClick={() => setLocale(code)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
