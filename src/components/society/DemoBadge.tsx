"use client";

import Link from "next/link";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import styles from "./DemoBadge.module.css";

/** Says plainly that what's on screen is Society's made-up demo, with the way out. */
export default function DemoBadge() {
  const copy = useUiCopy();
  return (
    <p className={styles.badge} role="note">
      <b><UiText text="Demo" /></b>
      <span><UiText text="Made-up people and works, to look around." /></span>
      <Link href="/society" aria-label={copy("Leave the demo")}>
        <span className={styles.long}><UiText text="Leave the demo" /></span>
        <span className={styles.short} aria-hidden="true">✕</span>
      </Link>
    </p>
  );
}
