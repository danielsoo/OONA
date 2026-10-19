"use client";

import UiText, { useUiCopy } from "@/components/i18n/UiText";
import styles from "./SocietyDiscover.module.css";
import type { ScrollMode } from "./useScrollMode";

/**
 * Which way Society scrolls. It sits in the corner opposite the demo badge
 * and does not fade with the sky's opening, the way the sections and the
 * scroll cue do, so it can still be reached once the reader is a screen or
 * two down and has decided they would rather have the other one.
 *
 * The two labels are written out rather than mapped over, so the
 * localisation check can see them (scripts/check-localization.cjs reads
 * string literals).
 */
export default function ScrollModeToggle({ mode, onChange }: { mode: ScrollMode; onChange: (next: ScrollMode) => void }) {
  const copy = useUiCopy();
  return (
    <div className={styles.scrollMode} role="group" aria-label={copy("Scrolling")}>
      <span aria-hidden="true"><UiText text="Scrolling" /></span>
      <button type="button" aria-pressed={mode === "glide"} onClick={() => onChange("glide")}>
        <UiText text="Screen by screen" />
      </button>
      <button type="button" aria-pressed={mode === "free"} onClick={() => onChange("free")}>
        <UiText text="Free scroll" />
      </button>
    </div>
  );
}
