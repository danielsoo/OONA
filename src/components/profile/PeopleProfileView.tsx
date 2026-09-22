"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import SocietyProfileBody from "@/components/society/SocietyProfileBody";
import SocietyPublicProfileHero from "@/components/society/SocietyPublicProfileHero";
import type { HeroBackgroundId } from "@/lib/heroBackgroundPresets";
import type { DirectorNameChangeRequest } from "@/types/user";
import styles from "@/components/society/EditorialProfile.module.css";

type WorkCard = {
  workId: string;
  ownerUid: string;
  title: string;
  role: string;
  characterName?: string;
  thumbnailUrl?: string | null;
  watchPath: string;
  profileNote?: string | null;
};

export type PeopleProfilePayload = {
  profile: {
    uid: string;
    handle: string;
    displayName: string;
    avatarUrl?: string | null;
    headline?: string;
    bio?: string;
    openToCollaborate?: boolean;
    collaborationNote?: string;
    defaultDirectorName?: string;
    profileLink?: string | null;
    followerCount?: number;
    followingCount?: number;
    schoolName?: string | null;
    societyBannerBackgroundId?: HeroBackgroundId | null;
  };
  stats?: { stories: number; totalViews: number };
  isOnline?: boolean;
  lastSeenAt?: string | null;
  viewer?: { uid: string; isSelf: boolean; isFollowing: boolean } | null;
  identity?: {
    isDiscoverable: boolean;
    displayNameChangeRequest: DirectorNameChangeRequest | null;
    handleChangeRequest: DirectorNameChangeRequest | null;
  };
  directed: WorkCard[];
  credited: WorkCard[];
};

type Props = {
  handle: string;
};

export default function PeopleProfileView({ handle }: Props) {
  const { t } = useTranslations();
  const { user } = useAuth();
  const [data, setData] = useState<PeopleProfilePayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!handle) return;
    setLoading(true);
    try {
      const headers: HeadersInit = {};
      if (user) {
        const token = await user.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(`/api/people/${encodeURIComponent(handle)}`, { headers });
      if (!res.ok) {
        setErr(t("network.people.notFound"));
        setData(null);
        return;
      }
      setData((await res.json()) as PeopleProfilePayload);
      setErr(null);
    } catch {
      setErr(t("network.people.loadError"));
    } finally {
      setLoading(false);
    }
  }, [handle, t, user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="px-4 text-xiio-muted lg:px-12">{t("common.loading")}</p>;
  }

  if (err || !data) {
    return <p className="px-4 text-red-400 lg:px-12">{err ?? t("network.people.notFound")}</p>;
  }

  const isSelf = !!user && data.viewer?.uid === user.uid && data.profile.uid === user.uid;
  const works = [...data.directed, ...data.credited];

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
      <SocietyPublicProfileHero
        displayName={data.profile.displayName}
        handle={data.profile.handle}
        headline={data.profile.headline}
        bio={data.profile.bio}
        avatarUrl={data.profile.avatarUrl}
        schoolName={data.profile.schoolName}
        profileLink={data.profile.profileLink}
        societyBannerBackgroundId={data.profile.societyBannerBackgroundId}
        followerCount={data.profile.followerCount}
        followingCount={data.profile.followingCount}
        stats={data.stats}
        isOnline={data.isOnline}
        profileUid={data.profile.uid}
        isSelf={isSelf}
        isFollowing={!!user && data.viewer?.uid === user.uid && !!data.viewer.isFollowing}
      />
        <SocietyProfileBody works={works} isSelf={isSelf} />
      </div>
    </main>
  );
}
