"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import PeopleProfileActions from "@/components/profile/PeopleProfileActions";
import { formatCompactStat } from "@/lib/formatStat";
import type { HeroBackgroundId } from "@/lib/heroBackgroundPresets";
import type { ProfileTab } from "./SocietyProfileBody";
import ProfileConstellation, { type ConstellationWork } from "./ProfileConstellation";
import { DEMO_SOCIETY_HREF } from "@/lib/demo-flags";
import styles from "./EditorialProfile.module.css";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";

type Props = { displayName: string; handle: string; headline?: string | null; bio?: string | null; avatarUrl?: string | null; schoolName?: string | null; profileLink?: string | null; societyBannerBackgroundId?: HeroBackgroundId | null; followerCount?: number; followingCount?: number; stats?: { stories: number; totalViews: number }; isOnline?: boolean; openToCollaborate?: boolean; profileUid: string; isSelf: boolean; isFollowing: boolean; tab: ProfileTab; onTab: (tab: ProfileTab) => void; counts: { works: number; credits: number }; works: ConstellationWork[]; demo?: boolean; onSharePortfolio?: () => void };

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "works", label: "Selected works" },
  { id: "about", label: "About" },
  { id: "credits", label: "Credits" },
];

/** The same deep space Society is in, so a profile is a corner of it. */
export const PROFILE_SKY = "/images/society/society_space.webp";
export const PROFILE_SKY_POSITION = "64% 50%";

/** A name over two lines: the last word on its own. */
export function displayLines(value: string) { const pieces = value.trim().split(/\s+/); return pieces.length < 2 ? [value] : [pieces.slice(0, -1).join(" "), pieces.at(-1)!]; }

/**
 * A profile's first screen: their name under the same night sky as Society,
 * and their star with what they made around it.
 */
export default function SocietyPublicProfileHero(props: Props) {
  const _copy = useUiCopy();
  const lines = displayLines(props.displayName || props.handle);
  // Follow / unfollow here moves the count right away.
  const [followerCount, setFollowerCount] = useState(props.followerCount ?? 0);
  const role = [props.headline?.trim(), props.schoolName?.trim()].filter(Boolean).join(" · ");
  return <>
    <section className={styles.hero} data-society-hero="">
      <div className={styles.heroSky} aria-hidden="true">
        {/* unoptimized for the same reason as Society's sky: the picture is
            almost all near-black, and a second lossy pass blotches it. */}
        <Image src={PROFILE_SKY} alt="" fill priority unoptimized sizes="100vw" style={{ objectFit: "cover", objectPosition: PROFILE_SKY_POSITION }} />
      </div>
      <div className={styles.heroInner}>
        <div className={styles.backRow}><Link href={props.demo ? DEMO_SOCIETY_HREF : "/society?tab=discover"}><UiText text={"← Back to Society"} /></Link><span>{props.isSelf ? _copy("MY PROFILE") : _copy("CREATOR PROFILE")}</span></div>
        <div className={styles.heroGrid}>
          <div className={styles.identity}>
            <p className={styles.eyebrow}><UiText text={"OONA SOCIETY"} /></p>
            <h1 className={styles.name}>{lines.map((line) => <span key={line}>{line}</span>)}</h1>
            <p className={styles.handleLine}>@{props.handle}{role ? <span className={styles.role}>{role}</span> : null}</p>
            {props.bio?.trim() ? <p className={styles.bio}>{props.bio}</p> : null}
            {props.isOnline || props.openToCollaborate ? (
              <p className={styles.badges}>
                {props.openToCollaborate ? <span className={styles.badge}><UiText text={"Open to work"} /></span> : null}
                {props.isOnline ? <span className={styles.badge}><UiText text={"AVAILABLE NOW"} /></span> : null}
              </p>
            ) : null}
            <div className={styles.heroActions}>{props.isSelf ? <>{props.onSharePortfolio ? <button type="button" className={styles.primary} onClick={props.onSharePortfolio}><UiText text={"Share my portfolio"} /></button> : null}<Link className={props.onSharePortfolio ? undefined : styles.primary} href="/account?tab=profile&section=about"><UiText text={"Edit profile"} /></Link><Link href="/uploader/upload"><UiText text={"Upload a work"} /></Link><Link href="/uploader/works"><UiText text={"Manage works"} /></Link></> : props.demo ? <><Link className={styles.primary} href={`/p/${encodeURIComponent(props.handle)}`}><UiText text={"See their portfolio"} /></Link>{["Follow", "Message", "Send an invite"].map((label) => <button key={label} type="button" disabled title={_copy("This is a made-up demo profile.")}><UiText text={label} /></button>)}</> : <PeopleProfileActions profileUid={props.profileUid} handle={props.handle} displayName={props.displayName} isSelf={false} initialFollowing={props.isFollowing} onFollowChange={(now) => setFollowerCount((n) => Math.max(0, n + (now ? 1 : -1)))} />}</div>
            {props.profileLink && <a className={styles.external} href={props.profileLink} target="_blank" rel="noreferrer"><UiText text={"External portfolio ↗"} /></a>}
          </div>
          <ProfileConstellation name={props.displayName || props.handle} seed={props.profileUid} avatarUrl={props.avatarUrl} works={props.works} />
        </div>
        <div className={styles.stats}><span><b>{formatCompactStat(props.stats?.stories ?? 0)}</b><UiText text={"Works"} /></span><span><b>{formatCompactStat(followerCount)}</b><UiText text={"Followers"} /></span><span><b>{formatCompactStat(props.followingCount ?? 0)}</b><UiText text={"Following"} /></span><span><b>{formatCompactStat(props.stats?.totalViews ?? 0)}</b><UiText text={"Views"} /></span></div>
      </div>
    </section>
    <div className={styles.inner}>
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
    </div>
  </>;
}
