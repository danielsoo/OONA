"use client";

import { useState } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import { SOCIETY_DESIGNS, type SocietyDesignId } from "./societyDesigns";
import styles from "./SocietyDesignSwitcher.module.css";

/** The floating toggle that switches the Society page between its design variants. */
export default function SocietyDesignSwitcher({
  design,
  onChoose,
  onClose,
}: {
  design: SocietyDesignId;
  onChoose: (design: SocietyDesignId) => void;
  onClose: () => void;
}) {
  const copy = useUiCopy();
  const [folded, setFolded] = useState(false);
  const current = SOCIETY_DESIGNS.find((item) => item.id === design) ?? SOCIETY_DESIGNS[0];

  if (folded) {
    return (
      <button type="button" className={`${styles.bar} ${styles.folded}`} onClick={() => setFolded(false)}>
        <span className={styles.label}><UiText text="Designs" /></span>
        <strong>{current.short}</strong>
      </button>
    );
  }

  return (
    <div className={styles.bar} role="group" aria-label={copy("Society designs")}>
      <span className={styles.label}><UiText text="Designs" /></span>
      <div className={styles.options}>
        {SOCIETY_DESIGNS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === design}
            title={copy(item.name)}
            onClick={() => onChoose(item.id)}
          >
            {item.id === "current" ? copy("Now") : item.short}
          </button>
        ))}
      </div>
      <span className={styles.name} aria-live="polite">
        {current.id === "current" ? copy(current.name) : `${current.short} · ${copy(current.name)}`}
      </span>
      <button type="button" className={styles.icon} onClick={() => setFolded(true)} aria-label={copy("Fold the design toggle")}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" /></svg>
      </button>
      <button type="button" className={styles.icon} onClick={onClose} aria-label={copy("Close the design toggle")}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" /></svg>
      </button>
    </div>
  );
}
