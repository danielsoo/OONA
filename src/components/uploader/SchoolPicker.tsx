"use client";

import { useCallback, useId, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { useSchoolSuggestions } from "@/hooks/useSchoolSuggestions";
import type { SchoolSuggestion } from "@/types/school";
import type { User } from "firebase/auth";

export type SchoolPickerValue = { id: string; name: string } | null;

function suggestionLocation(school: SchoolSuggestion): string {
  return [school.location?.city, school.location?.country].filter(Boolean).join(", ");
}

type Props = {
  value: SchoolPickerValue;
  onChange: (value: SchoolPickerValue) => void;
  disabled?: boolean;
  inputClassName?: string;
  user?: User | null;
  /** 프로필 schoolName 힌트로 검색창을 미리 채움 — 자동 선택은 하지 않음 */
  initialQuery?: string;
};

export default function SchoolPicker({
  value,
  onChange,
  disabled = false,
  inputClassName = "",
  user: userProp,
  initialQuery = "",
}: Props) {
  const { user: authUser } = useAuth();
  const user = userProp ?? authUser;
  const { t } = useTranslations();
  const listId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);

  const { items: suggestions } = useSchoolSuggestions(user, query, open && !disabled && !value);

  const showCreateOption =
    query.trim().length > 0 &&
    !suggestions.some((s) => s.name.toLowerCase() === query.trim().toLowerCase());
  const optionCount = suggestions.length + (showCreateOption ? 1 : 0);

  const createSchool = useCallback(
    async (name: string, location?: SchoolSuggestion["location"]) => {
      const trimmed = name.trim();
      if (!trimmed || !user || creatingRef.current) return;
      creatingRef.current = true;
      setCreating(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/schools", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: trimmed, ...(location ? { location } : {}) }),
        });
        const data = (await res.json()) as { school?: { id: string; name: string } };
        if (data.school) {
          onChange({ id: data.school.id, name: data.school.name });
          setQuery("");
          setOpen(false);
        }
      } catch {
        /* ignore — 사용자는 다시 시도할 수 있음 */
      } finally {
        creatingRef.current = false;
        setCreating(false);
      }
    },
    [user, onChange]
  );

  const selectSchool = useCallback(
    (school: SchoolSuggestion) => {
      if (school.source === "ror") {
        void createSchool(school.name, school.location);
        return;
      }
      onChange({ id: school.id, name: school.name });
      setQuery("");
      setOpen(false);
    },
    [createSchool, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (optionCount > 0) {
        setOpen(true);
        setHighlight((h) => (h + 1) % optionCount);
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (optionCount > 0) {
        setOpen(true);
        setHighlight((h) => (h - 1 + optionCount) % optionCount);
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlight < suggestions.length) {
        const s = suggestions[highlight];
        if (s) selectSchool(s);
      } else if (showCreateOption) {
        void createSchool(query);
      }
    }
  };

  if (value) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-xiio-accent/15 border border-xiio-accent/35 px-3 py-1 text-sm text-white">
          {value.name}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-white/50 hover:text-white/80 transition"
          >
            {t("uploader.schoolPickerClear")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled || creating}
        placeholder={t("uploader.schoolPickerPlaceholder")}
        aria-autocomplete="list"
        aria-controls={open && optionCount > 0 ? listId : undefined}
        aria-expanded={open && optionCount > 0}
        className={inputClassName}
      />
      {open && optionCount > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/15 bg-xiio-surface shadow-xl py-1"
        >
          {suggestions.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm transition ${
                  i === highlight ? "bg-xiio-accent/20 text-white" : "text-white/90 hover:bg-white/10"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSchool(s)}
                onMouseEnter={() => setHighlight(i)}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{s.name}</span>
                  {suggestionLocation(s) ? (
                    <span className="mt-0.5 truncate text-[10px] text-white/45">
                      {suggestionLocation(s)}{s.source === "ror" ? " · verified directory" : ""}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
          {showCreateOption && (
            <li role="option" aria-selected={highlight === suggestions.length}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm transition ${
                  highlight === suggestions.length
                    ? "bg-xiio-accent/20 text-white"
                    : "text-white/70 hover:bg-white/10"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void createSchool(query)}
                onMouseEnter={() => setHighlight(suggestions.length)}
                disabled={creating}
              >
                {t("uploader.schoolPickerCreateOption", { query: query.trim() })}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
