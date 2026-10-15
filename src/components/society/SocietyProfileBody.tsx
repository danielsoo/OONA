"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProfileWorkListItem } from "@/components/profile/ProfileWorksVerticalList";
import { gradientForTitle } from "@/lib/works/catalog-ui";
import styles from "./EditorialProfile.module.css";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";

export type ProfileTab = "works" | "about" | "credits";

export type ProfileAboutInfo = {
  uid: string;
  displayName: string;
  headline?: string | null;
  bio?: string | null;
  schoolName?: string | null;
  openToCollaborate?: boolean;
  collaborationNote?: string | null;
  profileLink?: string | null;
};

function WorkImage({ work }: { work: ProfileWorkListItem }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [work.thumbnailUrl]);
  return <div className={styles.workImage}>{work.thumbnailUrl && !failed ? <Image src={work.thumbnailUrl} alt="" fill unoptimized onError={() => setFailed(true)} /> : <i style={{ background: gradientForTitle(work.title) }} />}</div>;
}

/**
 * A grid of works: the person's own ("works") or the ones they are credited
 * on ("credits"). "Edit work" shows only on works this person owns.
 */
export function ProfileWorksSection({ works, isSelf, ownerUid, kind = "works" }: { works: ProfileWorkListItem[]; isSelf: boolean; ownerUid: string; kind?: "works" | "credits" }) {
  const _copy = useUiCopy();
  const credits = kind === "credits";
  const eyebrow = credits ? _copy("CREDITS") : isSelf ? _copy("YOUR PORTFOLIO") : _copy("SELECTED WORK");
  const title = credits ? _copy("Credited on other works") : isSelf ? _copy("My works") : _copy("Stories and collaborations");
  return <section id="works" className={styles.worksSection}>
    <header><div><p>{eyebrow}</p><h2>{title}</h2></div>{isSelf && !credits && <div className={styles.worksActions}><Link href="/uploader/upload"><UiText text={"＋ Upload a work"} /></Link><Link href="/uploader/works"><UiText text={"Manage works ↗"} /></Link></div>}</header>
    {works.length ? <div className={styles.workGrid}>{works.map((work) => <article key={`${work.ownerUid}-${work.workId}`}><Link href={work.watchPath}><WorkImage work={work} /><div><h3>{work.title}</h3><p>{work.role}{work.characterName ? ` · ${work.characterName}` : ""}</p>{work.profileNote && <span>{work.profileNote}</span>}</div></Link>{isSelf && work.ownerUid === ownerUid && <Link className={styles.editWork} href={`/uploader/works/${work.workId}/edit`}><UiText text={"Edit work ↗"} /></Link>}</article>)}</div> : <div className={styles.emptyWorks}><p>{credits ? _copy("No credits on other works yet.") : isSelf ? _copy("Your next work can begin here.") : _copy("No published works yet.")}</p>{isSelf && !credits && <Link href="/uploader/upload"><UiText text={"Upload the first work →"} /></Link>}</div>}
  </section>;
}

function ProfileAbout({ profile, isSelf }: { profile: ProfileAboutInfo; isSelf: boolean }) {
  const _copy = useUiCopy();
  const facts: { label: string; value: React.ReactNode }[] = [];
  if (profile.headline) facts.push({ label: _copy("Role"), value: profile.headline });
  if (profile.schoolName) facts.push({ label: _copy("School"), value: profile.schoolName });
  if (profile.openToCollaborate) facts.push({ label: _copy("Open to collaborate"), value: profile.collaborationNote || _copy("Available for a new project") });
  if (profile.profileLink) facts.push({ label: _copy("Links"), value: <a href={profile.profileLink} target="_blank" rel="noreferrer"><UiText text={"External portfolio ↗"} /></a> });
  return <section className={styles.aboutSection}>
    <header><div><p>{_copy("ABOUT")}</p><h2>{profile.displayName}</h2></div>{isSelf && <div className={styles.worksActions}><Link href="/account?tab=profile&section=about"><UiText text={"Edit profile"} /></Link></div>}</header>
    <div className={styles.aboutGrid}>
      <p className={styles.aboutBio}>{profile.bio?.trim() || _copy("No introduction yet.")}</p>
      {facts.length ? <dl className={styles.aboutFacts}>{facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl> : null}
    </div>
  </section>;
}

/** The profile page's tab panel: own works, about, or credits on other works. */
export default function SocietyProfileBody({ tab, works, credits, profile, isSelf }: { tab: ProfileTab; works: ProfileWorkListItem[]; credits: ProfileWorkListItem[]; profile: ProfileAboutInfo; isSelf: boolean }) {
  return <div id="profile-panel" role="tabpanel">
    {tab === "about"
      ? <ProfileAbout profile={profile} isSelf={isSelf} />
      : <ProfileWorksSection works={tab === "credits" ? credits : works} isSelf={isSelf} ownerUid={profile.uid} kind={tab === "credits" ? "credits" : "works"} />}
  </div>;
}
