"use client";

import { useId } from "react";
import LoginPromptContent from "@/components/auth/LoginPromptContent";
import styles from "@/components/auth/LoginPrompt.module.css";

type Props = {
  loginHref?: string;
};

export default function GuestPreviewOverlay({
  loginHref = "/login",
}: Props) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div className={styles.previewOverlay}>
      <section className={styles.panel} aria-labelledby={titleId} aria-describedby={descriptionId}>
        <LoginPromptContent titleId={titleId} descriptionId={descriptionId} loginHref={loginHref} />
      </section>
    </div>
  );
}
