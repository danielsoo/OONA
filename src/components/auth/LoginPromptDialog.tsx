"use client";

import { useEffect, useId, useRef } from "react";
import LoginPromptContent from "./LoginPromptContent";
import styles from "./LoginPrompt.module.css";

/** Opens only after a guest requests a member action; no action is queued. */
export default function LoginPromptDialog({ open, onClose, returnTo = "/", society = false }: {
  open: boolean;
  onClose: () => void;
  returnTo?: string;
  society?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  return (
    <dialog ref={ref} className={`${styles.panel} ${styles.dialog}`} aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
      }}>
      <LoginPromptContent titleId={titleId} descriptionId={descriptionId} loginHref={`/login?returnTo=${encodeURIComponent(returnTo)}`} onClose={onClose} society={society} />
    </dialog>
  );
}
