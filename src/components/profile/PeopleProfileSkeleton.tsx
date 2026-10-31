"use client";

import Image from "next/image";
import Link from "next/link";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { displayLines, PROFILE_SKY, PROFILE_SKY_POSITION } from "@/lib/profileHeroLook";
import { useTranslations } from "@/context/LocaleContext";
import type { ProfilePreview } from "@/lib/profilePreview";
import styles from "@/components/society/EditorialProfile.module.css";

const TABS = ["Selected works", "About", "Credits"];

/**
 * A profile while it loads, in the profile's own layout: the sky, and what's
 * already known (the handle, and the name and picture when they came from
 * Society) in place, the rest as soft placeholders, so the page settles
 * rather than appearing out of an empty screen.
 */
export default function PeopleProfileSkeleton({ handle, preview, backHref = "/society?tab=discover" }: { handle: string; preview: ProfilePreview | null; backHref?: string }) {
  const copy = useUiCopy();
  const { t } = useTranslations();
  const name = preview?.name.trim() || null;
  return (
    <main className={styles.page} aria-busy="true">
      <span className="sr-only" role="status">{t("common.loading")}</span>
      <section className={styles.hero} data-society-hero="">
        <div className={styles.heroSky} aria-hidden="true">
          <Image src={PROFILE_SKY} alt="" fill priority sizes="100vw" style={{ objectFit: "cover", objectPosition: PROFILE_SKY_POSITION }} />
        </div>
        <div className={styles.heroInner}>
          <div className={styles.backRow}>
            <Link href={backHref}><UiText text={"← Back to Society"} /></Link>
            <span>{copy("CREATOR PROFILE")}</span>
          </div>
          <div className={styles.heroGrid}>
            <div className={styles.identity}>
              <p className={styles.eyebrow}><UiText text={"OONA SOCIETY"} /></p>
              {name ? (
                <h1 className={styles.name}>{displayLines(name).map((line) => <span key={line}>{line}</span>)}</h1>
              ) : (
                <div className={styles.skelName} aria-hidden="true"><i className={styles.skel} /><i className={styles.skel} /></div>
              )}
              <p className={styles.handleLine}>@{decodeHandle(handle)}{preview?.headline ? <span className={styles.role}>{preview.headline}</span> : null}</p>
              <div className={styles.skelBio} aria-hidden="true">
                <i className={styles.skel} />
                <i className={styles.skel} style={{ width: "72%" }} />
              </div>
              <div className={styles.skelActions} aria-hidden="true">
                <i className={styles.skel} />
                <i className={styles.skel} />
                <i className={styles.skel} />
              </div>
            </div>
            <div className={styles.constellation} aria-hidden="true">
              <svg className={styles.branches} viewBox="0 0 100 100"><circle className={styles.orbit} cx="50" cy="50" r="17" /></svg>
              <div className={styles.core}>
                {preview?.avatarUrl ? <ProfileAvatar displayName={name ?? handle} avatarUrl={preview.avatarUrl} className={styles.coreAvatar} /> : <span className={styles.coreStar} />}
              </div>
            </div>
          </div>
          <div className={styles.stats} aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i}><i className={`${styles.skel} ${styles.skelStat}`} /><i className={`${styles.skel} ${styles.skelLine}`} style={{ width: 60 }} /></span>
            ))}
          </div>
        </div>
      </section>
      <div className={styles.inner}>
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
              <i className={`${styles.skel} ${styles.skelLine}`} style={{ width: "58%" }} />
              <i className={`${styles.skel} ${styles.skelLine}`} style={{ width: "32%" }} />
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
