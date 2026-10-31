"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import UiText from "@/components/i18n/UiText";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import SocietyProfileBody, { type ProfileTab } from "@/components/society/SocietyProfileBody";
import SocietyPublicProfileHero from "@/components/society/SocietyPublicProfileHero";
import PeopleProfileSkeleton from "@/components/profile/PeopleProfileSkeleton";
import { PortfolioShareDialog } from "@/components/portfolio/PortfolioSharePanel";
import { DEMO_SOCIETY_HREF, isDemoHandle, isDemoVisit } from "@/lib/demo-flags";
import { profilePreview } from "@/lib/profilePreview";
import { buildProfileConstellation } from "@/lib/profileHeroLook";
import type { HeroBackgroundId } from "@/lib/heroBackgroundPresets";
import type { DirectorNameChangeRequest } from "@/types/user";
import styles from "@/components/society/EditorialProfile.module.css";

/** Someone else credited on a work (its owner, or a confirmed credit). */
type Collaborator = { uid: string; displayName: string; role: string; characterName?: string; avatarUrl?: string | null; profileHref: string | null };

type WorkCard = {
  workId: string;
  ownerUid: string;
  title: string;
  role: string;
  characterName?: string;
  thumbnailUrl?: string | null;
  watchPath: string;
  profileNote?: string | null;
  collaborators?: Collaborator[];
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

const TAB_HASHES: Record<string, ProfileTab> = { "#works": "works", "#about": "about", "#credits": "credits" };

/** The profile's tab, kept in the URL hash (#works, #about, #credits) so it can be linked to. */
function useProfileTab(): [ProfileTab, (tab: ProfileTab) => void] {
  const [tab, setTab] = useState<ProfileTab>("works");
  useEffect(() => {
    const fromHash = () => setTab(TAB_HASHES[window.location.hash] ?? "works");
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);
  const choose = useCallback((next: ProfileTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.hash = next === "works" ? "" : next;
    window.history.replaceState(window.history.state, "", url.toString());
  }, []);
  return [tab, choose];
}

export default function PeopleProfileView({ handle }: Props) {
  const { t } = useTranslations();
  const { user } = useAuth();
  const [data, setData] = useState<PeopleProfilePayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useProfileTab();
  const [sharing, setSharing] = useState(false);
  const closeSharing = useCallback(() => setSharing(false), []);

  // Signing in finishes after the first request; asking again then (for the
  // viewer's follow state) refreshes quietly instead of going back to loading,
  // and only the latest answer counts.
  const loadedHandle = useRef<string | null>(null);
  const latest = useRef(0);
  const load = useCallback(async () => {
    if (!handle) return;
    const request = ++latest.current;
    if (loadedHandle.current !== handle) setLoading(true);
    try {
      // A demo person opened outside the demo answers from the made-up set
      // (in the demo, the API itself is answered from it, signed in).
      if (isDemoHandle(handle) && !isDemoVisit()) {
        const payload = (await import("@/lib/society-demo")).demoProfile(handle);
        if (request !== latest.current) return;
        if (payload) {
          setData(payload);
          setErr(null);
          loadedHandle.current = handle;
        } else {
          setErr(t("network.people.notFound"));
          setData(null);
        }
        return;
      }
      const headers: HeadersInit = {};
      if (user) {
        const token = await user.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(`/api/people/${encodeURIComponent(handle)}`, { headers });
      if (request !== latest.current) return;
      if (!res.ok) {
        setErr(t("network.people.notFound"));
        setData(null);
        return;
      }
      const payload = (await res.json()) as PeopleProfilePayload;
      if (request !== latest.current) return;
      setData(payload);
      setErr(null);
      loadedHandle.current = handle;
    } catch {
      if (request === latest.current) setErr(t("network.people.loadError"));
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, [handle, t, user]);

  useEffect(() => {
    void load();
  }, [load]);

  // ?portfolio=new (from "Make your portfolio link" on someone's shared
  // portfolio): open the share dialog once it's known this is their own.
  const ownProfile = !!user && !!data && data.viewer?.uid === user.uid && data.profile.uid === user.uid;
  useEffect(() => {
    if (!ownProfile) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("portfolio") !== "new") return;
    url.searchParams.delete("portfolio");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    setSharing(true);
  }, [ownProfile]);

  const demo = isDemoHandle(handle);
  if (loading) {
    return <PeopleProfileSkeleton handle={handle} preview={profilePreview(handle)} backHref={demo ? DEMO_SOCIETY_HREF : undefined} />;
  }

  if (err || !data) {
    return (
      <main className={styles.page}>
        <div className={styles.missing} role="alert">
          <p>{err ?? t("network.people.notFound")}</p>
          <Link href="/society?tab=discover"><UiText text={"← Back to Society"} /></Link>
        </div>
      </main>
    );
  }

  const isSelf = ownProfile;

  const roleLabel = (role: string) => {
    const key = `watch.creditRole.${role.toLowerCase()}`;
    const label = t(key);
    return label === key ? role : label;
  };
  const constellation = buildProfileConstellation(data.directed, data.credited, roleLabel);

  return (
    <main className={styles.page}>
      <SocietyPublicProfileHero
        demo={demo}
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
        openToCollaborate={data.profile.openToCollaborate}
        profileUid={data.profile.uid}
        isSelf={isSelf}
        isFollowing={!!user && data.viewer?.uid === user.uid && !!data.viewer.isFollowing}
        tab={tab}
        onTab={setTab}
        counts={{ works: data.directed.length, credits: data.credited.length }}
        works={constellation}
        onSharePortfolio={isSelf ? () => setSharing(true) : undefined}
      />
      {isSelf ? (
        <PortfolioShareDialog
          open={sharing}
          onClose={closeSharing}
          ownerName={data.profile.displayName || data.profile.handle}
          thumbs={Object.fromEntries([...data.directed, ...data.credited].map((w) => [`${w.ownerUid}:${w.workId}`, w.thumbnailUrl]))}
        />
      ) : null}
      <div className={styles.inner}>
        <SocietyProfileBody
          tab={tab}
          works={data.directed}
          credits={data.credited}
          profile={data.profile}
          isSelf={isSelf}
        />
      </div>
    </main>
  );
}
