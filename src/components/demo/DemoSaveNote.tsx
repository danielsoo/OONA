"use client";

import UiText from "@/components/i18n/UiText";
import { useIsDemoVisit } from "@/hooks/useIsDemoVisit";
import styles from "@/components/settings/SettingsPage.module.css";

type Props = {
  /** Spacing for wherever it sits; the box itself always looks the same. */
  className?: string;
};

/**
 * The demo writes nothing: lib/demo-fetch answers /api/* in the browser, so a
 * save never reaches the server and is gone on the next load. Without this,
 * the settings screens answered a save with a plain "saved" and looked like
 * the real thing.
 */
export default function DemoSaveNote({ className }: Props) {
  const demo = useIsDemoVisit();
  if (!demo) return null;
  return (
    <p className={className ? `${styles.notice} ${className}` : styles.notice}>
      <UiText text="Nothing here is saved in the demo." />
      <small>
        <UiText text="What you change stays in this tab and is gone when you reload. Leave the demo to change your own account." />
      </small>
    </p>
  );
}
