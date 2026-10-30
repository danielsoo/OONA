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
  /** Off where the section around it already says what this is. */
  showLabel?: boolean;
  className?: string;
};

/**
 * What /people/<handle> shows, small enough to sit beside the editor.
 *
 * It is built from the same pieces as SocietyPublicProfileHero — the Society
 * sky, the name over two lines, "@handle · headline · school", the bio and
 * the badge — so what is on the left is what visitors get. The preview it
 * replaced invented all of that: a different photo for the backdrop, the
 * first role tag where the headline belongs, a school of "OONA" for people
 * with none, and, for an empty profile, a made-up bio and the tags
 * "director" and "storytelling" that the person had never chosen.
 *
 * Empty fields are said to be empty rather than filled in with something the
 * visitor will not see.
 */
export default function PublicProfilePreview({ profile, showLabel = true, className }: Props) {
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

      <div className={styles.previewSky}>
        <Image
          src={PROFILE_SKY}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 900px) 100vw, 340px"
          style={{ objectFit: "cover", objectPosition: PROFILE_SKY_POSITION }}
        />
        <p className={styles.previewEyebrow}><UiText text={"OONA SOCIETY"} /></p>
      </div>

      <ProfileAvatar
        displayName={name || "?"}
        avatarUrl={profile.avatarUrl}
        className={styles.previewAvatar}
        imgClassName="h-full w-full object-cover"
      />

      <h2 className={styles.previewName}>
        {name ? displayLines(name).map((line) => <span key={line}>{line}</span>) : <span>—</span>}
      </h2>
      {/* One line, the way the real hero sets it: @handle · headline · school. */}
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
        <span>
          <b>{formatCompactStat(profile.followerCount ?? 0)}</b>
          {copy("Followers")}
        </span>
        <span>
          <b>{formatCompactStat(profile.followingCount ?? 0)}</b>
          {copy("Following")}
        </span>
      </div>
    </div>
  );
}
