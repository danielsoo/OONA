"use client";

import Image from "next/image";
import Link from "next/link";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { useTranslations } from "@/context/LocaleContext";
import { formatCompactStat } from "@/lib/formatStat";
import { displayLines, profileRoleLine, PROFILE_SKY, PROFILE_SKY_POSITION } from "@/lib/profileHeroLook";
import styles from "@/components/settings/SettingsPage.module.css";

export type PublicProfilePreviewData = {
  handle?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  headline?: string | null;
  bio?: string | null;
  schoolName?: string | null;
  openToCollaborate?: boolean;
  profileLink?: string | null;
  followerCount?: number;
  followingCount?: number;
};

type Props = {
  profile: PublicProfilePreviewData;
  /** Works and views, where the screen has already loaded them. */
  stats?: { stories: number; totalViews: number } | null;
  /** Off where the section around it already says what this is. */
  showLabel?: boolean;
  className?: string;
};

/**
 * /people/<handle> in miniature: what the profile becomes once it is up.
 *
 * The night sky, the eyebrow, the name set over two lines and the row of
 * counts are the page their profile lands on, so they belong here — the
 * preview is for seeing the thing whole, not for listing the fields back.
 * What it draws is the visitor's view: no Edit profile, no upload buttons.
 *
 * Which field goes where comes from SocietyPublicProfileHero through
 * lib/profileHeroLook, so the two cannot drift. The preview this replaced had
 * drifted all the way: a different photo behind it, the first role tag where
 * the headline belongs, a school of "OONA" for people with none, and, for an
 * empty profile, a made-up bio and the tags "director" and "storytelling"
 * that the person had never chosen. Empty fields now say they are empty.
 */
export default function PublicProfilePreview({ profile, stats, showLabel = true, className }: Props) {
  const { t } = useTranslations();
  const copy = useUiCopy();
  const name = profile.displayName?.trim() || profile.handle?.trim() || "";
  const role = profileRoleLine(profile.headline, profile.schoolName);
  const bio = profile.bio?.trim();

  return (
    <div className={className ? `${styles.preview} ${className}` : styles.preview}>
      <div className={styles.previewLabel}>
        <span>{showLabel ? <UiText text={"PUBLIC PREVIEW"} /> : null}</span>
        {profile.handle ? (
          <Link
            href={`/people/${encodeURIComponent(profile.handle)}`}
            aria-label={t("accountProfile.openPublicProfile")}
          >
            ↗
          </Link>
        ) : (
          <span aria-hidden="true">↗</span>
        )}
      </div>

      <div className={styles.previewStage}>
        <Image
          className={styles.previewSky}
          src={PROFILE_SKY}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 900px) 100vw, 360px"
          style={{ objectFit: "cover", objectPosition: PROFILE_SKY_POSITION }}
        />

        <div className={styles.previewTop}>
          <p className={styles.previewEyebrow}><UiText text={"OONA SOCIETY"} /></p>
          {/* Their picture is the star the real page builds its constellation on. */}
          <ProfileAvatar
            displayName={name || "?"}
            avatarUrl={profile.avatarUrl}
            className={styles.previewAvatar}
            imgClassName="h-full w-full object-cover"
          />
        </div>

        <h2 className={styles.previewName}>
          {name ? displayLines(name).map((line) => <span key={line}>{line}</span>) : <span>—</span>}
        </h2>

        <p className={styles.previewHandle}>
          {profile.handle ? <span>@{profile.handle}</span> : null}
          {role ? (
            <span className={styles.previewRole}>{role}</span>
          ) : (
            <span className={`${styles.previewRole} ${styles.previewEmpty}`}>
              <UiText text={"No headline yet"} />
            </span>
          )}
        </p>

        {bio ? (
          <p className={styles.previewBio}>{bio}</p>
        ) : (
          <p className={`${styles.previewBio} ${styles.previewEmpty}`}>
            <UiText text={"No bio yet"} />
          </p>
        )}

        {profile.openToCollaborate ? (
          <p className={styles.previewBadges}>
            <span><UiText text={"Open to work"} /></span>
          </p>
        ) : null}

        {profile.profileLink ? (
          <p className={styles.previewLink}><UiText text={"External portfolio ↗"} /></p>
        ) : null}

        <div className={styles.previewStats}>
          {stats ? (
            <span>
              <b>{formatCompactStat(stats.stories)}</b>
              {copy("Works")}
            </span>
          ) : null}
          <span>
            <b>{formatCompactStat(profile.followerCount ?? 0)}</b>
            {copy("Followers")}
          </span>
          <span>
            <b>{formatCompactStat(profile.followingCount ?? 0)}</b>
            {copy("Following")}
          </span>
          {stats ? (
            <span>
              <b>{formatCompactStat(stats.totalViews)}</b>
              {copy("Views")}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
