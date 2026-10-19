"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "oona.societyScroll";

/** "glide": a scroll moves one screen. "free": the browser's own scrolling. */
export type ScrollMode = "glide" | "free";

function isMode(value: string | null): value is ScrollMode {
  return value === "glide" || value === "free";
}

/**
 * How Society scrolls, as the reader chose it (ScrollModeToggle), kept for
 * their next visit. Until they choose, reduced motion decides, and keeps
 * deciding if the system setting changes; once they have, their choice
 * stands whatever the setting says.
 *
 * `ready` is false for the first render, where the stored answer cannot be
 * read yet, so the toggle can wait rather than show the wrong one.
 */
export function useScrollMode(): { mode: ScrollMode; ready: boolean; setMode: (next: ScrollMode) => void } {
  const [mode, set] = useState<ScrollMode>("glide");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem(KEY);
      } catch {
        // Storage blocked: the setting lasts for this page only.
      }
      set(isMode(stored) ? stored : media.matches ? "free" : "glide");
    };
    sync();
    setReady(true);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const setMode = useCallback((next: ScrollMode) => {
    set(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // As above.
    }
  }, []);

  return { mode, ready, setMode };
}
