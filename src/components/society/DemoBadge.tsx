"use client";

import UiText, { useUiCopy } from "@/components/i18n/UiText";
import { DEMO_SOCIETY_HREF } from "@/lib/demo-flags";
import styles from "./DemoBadge.module.css";

/**
 * In the demo (on every page, DemoBadgeGate), says plainly that what's on
 * screen is made up, with the way out; outside it, on Society, offers the
 * way in. Plain links, not client routing:
 * the demo is picked up when the page loads, so switching loads it afresh.
 */
export default function DemoBadge({ active }: { active: boolean }) {
  const copy = useUiCopy();
  return active ? (
    <p className={styles.badge} role="note">
      <b><UiText text="Demo" /></b>
      <span><UiText text="Made-up people and works, to look around." /></span>
      <a href="/?demo=0" aria-label={copy("Leave the demo")}>
        <span className={styles.long}><UiText text="Leave the demo" /></span>
        <span className={styles.short} aria-hidden="true">✕</span>
      </a>
    </p>
  ) : (
    <p className={`${styles.badge} ${styles.offer}`}>
      <b><UiText text="Demo" /></b>
      <span><UiText text="See Society filled with made-up people." /></span>
      <a href={DEMO_SOCIETY_HREF}><UiText text="Try the demo" /></a>
    </p>
  );
}
