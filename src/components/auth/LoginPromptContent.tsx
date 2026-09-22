"use client";

import Link from "next/link";
import { useTranslations } from "@/context/LocaleContext";
import styles from "./LoginPrompt.module.css";

/** One editorial message for action prompts and the in-player preview gate. */
export default function LoginPromptContent({ titleId, descriptionId, loginHref, onClose, society = false }: {
  titleId: string;
  descriptionId: string;
  loginHref: string;
  onClose?: () => void;
  society?: boolean;
}) {
  const { t } = useTranslations();
  return <>
    {onClose ? <button type="button" className={styles.close} aria-label={t("common.close")} onClick={onClose}>×</button> : null}
    <p className={styles.eyebrow}>{society ? "OONA · SOCIETY" : "OONA"}</p>
    <h2 id={titleId}>{t("society.guest.dialogTitle")}</h2>
    <p id={descriptionId} className={styles.description}>{t("society.guest.dialogBody")}</p>
    <div className={styles.actions}>
      <Link className={styles.login} href={loginHref}>{t("society.guest.dialogLogin")}</Link>
      {onClose
        ? <button type="button" className={styles.browse} onClick={onClose} autoFocus>{t("society.guest.dialogBrowse")}</button>
        : <Link className={styles.browse} href="/">{t("society.guest.dialogBrowse")}</Link>}
    </div>
  </>;
}
