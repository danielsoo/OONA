"use client";

import UiText from "@/components/i18n/UiText";
import { IS_DEMO_SITE } from "@/lib/app-env";
import styles from "./DemoSiteLabel.module.css";

/** On the demo site, every page says so: nothing here is the real OONA. */
export default function DemoSiteLabel() {
  if (!IS_DEMO_SITE) return null;
  return (
    <p className={styles.label} role="note">
      <b><UiText text={"DEMO SITE"} /></b>
      <span><UiText text={"Made-up people and works. Nothing you do here touches the real OONA."} /></span>
    </p>
  );
}
