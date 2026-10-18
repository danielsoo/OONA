"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import PeopleProfileActions from "@/components/profile/PeopleProfileActions";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { formatCompactStat } from "@/lib/formatStat";
import type { HeroBackgroundId } from "@/lib/heroBackgroundPresets";
import type { ProfileTab } from "./SocietyProfileBody";
import discoverHero from "../../../discover_hero.webp";
import styles from "./EditorialProfile.module.css";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";

type Props = { displayName: string; handle: string; headline?: string | null; bio?: string | null; avatarUrl?: string | null; schoolName?: string | null; profileLink?: string | null; societyBannerBackgroundId?: HeroBackgroundId | null; followerCount?: number; followingCount?: number; stats?: { stories: number; totalViews: number }; isOnline?: boolean; profileUid: string; isSelf: boolean; isFollowing: boolean; tab: ProfileTab; onTab: (tab: ProfileTab) => void; counts: { works: number; credits: number } };

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "works", label: "Selected works" },
  { id: "about", label: "About" },
  { id: "credits", label: "Credits" },
];

/** A name over two lines: the last word on its own. */
export function displayLines(value: string) { const pieces = value.trim().split(/\s+/); return pieces.length < 2 ? [value] : [pieces.slice(0, -1).join(" "), pieces.at(-1)!]; }

export default function SocietyPublicProfileHero(props: Props) {
  const _copy = useUiCopy();
  const lines = displayLines(props.displayName || props.handle);
  // Follow / unfollow here moves the count right away.
  const [followerCount, setFollowerCount] = useState(props.followerCount ?? 0);
  return <>
    <div className={styles.backRow}><Link href="/society?tab=discover"><UiText text={"← Back to Society"} /></Link><span>{props.isSelf ? _copy("MY PROFILE") : _copy("CREATOR PROFILE")}</span></div>
    <section className={styles.hero}>
      <div className={styles.titleColumn}><p><UiText text={"OONA SOCIETY"} /></p><h1>{lines.map((line) => <span key={line}>{line}</span>)}</h1><small>@{props.handle}</small></div>
      <div className={styles.portrait}>{props.avatarUrl ? <ProfileAvatar displayName={props.displayName} avatarUrl={props.avatarUrl} className={styles.portraitAvatar} /> : <Image src={discoverHero} alt="" fill priority />}{props.isOnline && <span className={styles.online}><UiText text={"AVAILABLE NOW"} /></span>}</div>
      <aside className={styles.profileInfo}>
        <p className={styles.role}>{props.headline || "Student creator"}{props.schoolName ? ` · ${props.schoolName}` : ""}</p>
        <p className={styles.bio}>{props.bio || "Interested in thoughtful stories, distinctive images, and new creative collaborations."}</p>
        <div className={styles.stats}><span><b>{formatCompactStat(props.stats?.stories ?? 0)}</b><UiText text={"Works"} /></span><span><b>{formatCompactStat(followerCount)}</b><UiText text={"Followers"} /></span><span><b>{formatCompactStat(props.followingCount ?? 0)}</b><UiText text={"Following"} /></span><span><b>{formatCompactStat(props.stats?.totalViews ?? 0)}</b><UiText text={"Views"} /></span></div>
        <div className={styles.heroActions}>{props.isSelf ? <><Link className={styles.primary} href="/account?tab=profile&section=about"><UiText text={"Edit profile"} /></Link><Link href="/uploader/upload"><UiText text={"Upload a work"} /></Link><Link href="/uploader/works"><UiText text={"Manage works"} /></Link></> : <PeopleProfileActions profileUid={props.profileUid} handle={props.handle} displayName={props.displayName} isSelf={false} initialFollowing={props.isFollowing} onFollowChange={(now) => setFollowerCount((n) => Math.max(0, n + (now ? 1 : -1)))} />}</div>
        {props.profileLink && <a className={styles.external} href={props.profileLink} target="_blank" rel="noreferrer"><UiText text={"External portfolio ↗"} /></a>}
      </aside>
    </section>
    <nav className={styles.profileTabs} role="tablist" aria-label={_copy("Profile sections")}>
      {TABS.map(({ id, label }) => {
        const count = id === "works" ? props.counts.works : id === "credits" ? props.counts.credits : null;
        return (
          <button key={id} type="button" role="tab" aria-selected={props.tab === id} aria-controls="profile-panel" className={props.tab === id ? styles.profileTabOn : undefined} onClick={() => props.onTab(id)}>
            <UiText text={label} />
            {count ? <span className={styles.tabCount}>{count}</span> : null}
          </button>
        );
      })}
    </nav>
  </>;
}
