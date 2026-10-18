"use client";

import Link from "next/link";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { displayLines } from "@/components/society/SocietyPublicProfileHero";
import { useTranslations } from "@/context/LocaleContext";
import type { ProfilePreview } from "@/lib/profilePreview";
import styles from "@/components/society/EditorialProfile.module.css";

const TABS = ["Selected works", "About", "Credits"];

/**
 * A profile while it loads, in the profile's own layout: what's already known
 * (the handle, and the name and picture when they came from Society) in
 * place, the rest as soft placeholders, so the page settles rather than
 * appearing out of an empty screen.
 */
export default function PeopleProfileSkeleton({ handle, preview }: { handle: string; preview: ProfilePreview | null }) {
  const copy = useUiCopy();
  const { t } = useTranslations();
  const name = preview?.name.trim() || null;
  return (
    <main className={styles.page} aria-busy="true">
      <span className="sr-only" role="status">{t("common.loading")}</span>
      <div className={styles.inner}>
        <div className={styles.backRow}>
          <Link href="/society?tab=discover"><UiText text={"← Back to Society"} /></Link>
          <span>{copy("CREATOR PROFILE")}</span>
        </div>
        <section className={styles.hero}>
          <div className={styles.titleColumn}>
            <p><UiText text={"OONA SOCIETY"} /></p>
            {name ? (
              <h1>{displayLines(name).map((line) => <span key={line}>{line}</span>)}</h1>
            ) : (
              <div className={styles.skelName} aria-hidden="true"><i className={styles.skel} /><i className={styles.skel} /></div>
            )}
            <small>@{decodeHandle(handle)}</small>
          </div>
          <div className={`${styles.portrait} ${preview?.avatarUrl ? "" : styles.skel}`} aria-hidden="true">
            {preview?.avatarUrl ? <ProfileAvatar displayName={name ?? handle} avatarUrl={preview.avatarUrl} className={styles.portraitAvatar} /> : null}
          </div>
          <aside className={styles.profileInfo} aria-hidden="true">
            {preview?.headline ? <p className={styles.role}>{preview.headline}</p> : <i className={`${styles.skel} ${styles.skelLine}`} style={{ width: "42%" }} />}
            <div className={styles.skelBio}>
              <i className={styles.skel} />
              <i className={styles.skel} />
              <i className={styles.skel} style={{ width: "58%" }} />
            </div>
            <div className={styles.stats}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i}><i className={`${styles.skel} ${styles.skelStat}`} /></span>
              ))}
            </div>
            <div className={styles.skelActions}>
              <i className={styles.skel} />
              <i className={styles.skel} />
              <i className={styles.skel} />
            </div>
          </aside>
        </section>
        <nav className={styles.profileTabs} aria-hidden="true">
          {TABS.map((label, i) => (
            <button key={label} type="button" disabled tabIndex={-1} className={i === 0 ? styles.profileTabOn : undefined}>
              <UiText text={label} />
            </button>
          ))}
        </nav>
        <div className={`${styles.workGrid} ${styles.skelWorks}`} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <article key={i}>
              <div className={`${styles.workImage} ${styles.skel}`} />
              <i className={`${styles.skel} ${styles.skelLine}`} style={{ width: "62%" }} />
              <i className={`${styles.skel} ${styles.skelLine}`} style={{ width: "34%" }} />
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function decodeHandle(handle: string): string {
  try {
    return decodeURIComponent(handle);
  } catch {
    return handle;
  }
}
