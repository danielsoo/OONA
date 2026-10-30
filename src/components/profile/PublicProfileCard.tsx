"use client";

import PeopleProfileActions from "@/components/profile/PeopleProfileActions";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { useTranslations } from "@/context/LocaleContext";
import styles from "@/components/settings/SettingsPage.module.css";

export type PublicProfileData = {
  uid?: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  headline?: string;
  bio?: string;
  openToCollaborate?: boolean;
  collaborationNote?: string;
  profileLink?: string | null;
  followerCount?: number;
  followingCount?: number;
};

type Props = {
  className?: string;
  profile: PublicProfileData;
  isSelf?: boolean;
  isFollowing?: boolean;
  submissionBadge?: string;
  shareTitle?: string;
};

export default function PublicProfileCard({
  className = "",
  profile,
  isSelf = false,
  isFollowing = false,
  submissionBadge,
  shareTitle,
}: Props) {
  const { t } = useTranslations();

  const viewHandle = profile.handle;
  const viewHeadline = profile.headline;
  const viewBio = profile.bio;
  const viewOpen = profile.openToCollaborate;
  const viewNote = profile.collaborationNote;

  return (
    <section className={`${styles.card} ${className}`.trim()}>
      {submissionBadge && <p className={styles.eyebrow}>{submissionBadge}</p>}
      {shareTitle && <p className={styles.note}>{shareTitle}</p>}

      <div className={styles.cardTop}>
        <ProfileAvatar
          displayName={profile.displayName}
          avatarUrl={profile.avatarUrl}
          className={styles.cardAvatar}
          imgClassName="h-full w-full object-cover"
        />

        <div className={styles.who}>
          <h3 className={styles.cardName}>{profile.displayName}</h3>
          {viewHandle && <p className={styles.cardHandle}>@{viewHandle}</p>}
          {viewHeadline && <p className={styles.cardHeadline}>{viewHeadline}</p>}
          {viewOpen && (
            <p className={styles.cardOpen}>
              {t("discover.openBadge")}
              {viewNote ? ` — ${viewNote}` : ""}
            </p>
          )}
          <p className={styles.cardCounts}>
            {t("follow.counts", {
              followers: profile.followerCount ?? 0,
              following: profile.followingCount ?? 0,
            })}
          </p>

          {!isSelf && profile.uid && (
            <div className={styles.actions}>
              <PeopleProfileActions
                profileUid={profile.uid}
                handle={profile.handle}
                displayName={profile.displayName}
                isSelf={false}
                initialFollowing={isFollowing}
              />
            </div>
          )}
        </div>
      </div>

      {viewBio && <p className={styles.cardBio}>{viewBio}</p>}
    </section>
  );
}
