"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import {
  computeAgeFromBirthDate,
  formatBirthDateShort,
} from "@/lib/userBirthDate";
import { genderLabelKey } from "@/lib/userGender";
import { getUserProfile } from "@/lib/userProfile";
import { parseProfileSection, type ProfileSectionId } from "@/lib/profileSections";
import { LOCALES } from "@/i18n";
import { formatApiError, formatClientError, readResponseJson } from "@/lib/clientErrors";
import type { AccountActivityItem } from "@/types/account-activity";
import type { UserProfileDoc } from "@/types/user";
import AccountProfileHero, { type AccountProfileMetaItem } from "@/components/account/AccountProfileHero";
import AccountProfileNav, {
  type ActivityTabId,
  type MainTabId,
} from "@/components/account/AccountProfileNav";
import AccountProfileSettingsPanel from "@/components/account/AccountProfileSettingsPanel";
import AccountUploadsList from "@/components/account/AccountUploadsList";
import AccountWorkActivityList from "@/components/account/AccountWorkActivityList";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import styles from "@/components/settings/SettingsPage.module.css";
import UiText from "@/components/i18n/UiText";

function parseMainTab(raw: string | null): MainTabId {
  if (raw === "profile") return raw;
  return "activity";
}

export default function AccountProfileContent() {
  const { user } = useAuth();
  const { t, formatDateTime, dateLocale } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mainTab = parseMainTab(searchParams.get("tab"));
  const profileSection = parseProfileSection(searchParams.get("section"));

  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activityTab, setActivityTab] = useState<ActivityTabId>("uploads");
  const [likes, setLikes] = useState<AccountActivityItem[]>([]);
  const [watched, setWatched] = useState<AccountActivityItem[]>([]);
  const [uploadCount, setUploadCount] = useState(0);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityErr, setActivityErr] = useState<string | null>(null);

  const reloadProfile = useCallback(() => {
    if (!user) return;
    void getUserProfile(user.uid).then((p) => {
      setProfile(p);
    });
  }, [user]);

  const replaceAccountQuery = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const q = params.toString();
      router.replace(q ? `/account?${q}` : "/account", { scroll: false });
    },
    [router, searchParams]
  );

  const setMainTab = (id: MainTabId) => {
    replaceAccountQuery((params) => {
      if (id === "activity") {
        params.delete("tab");
        params.delete("section");
        params.delete("view");
      } else {
        params.set("tab", id);
        params.delete("view");
        if (id === "profile") {
          if (!params.get("section")) params.set("section", "about");
        } else {
          params.delete("section");
        }
      }
    });
  };

  const setProfileSection = (id: ProfileSectionId) => {
    replaceAccountQuery((params) => {
      params.set("tab", "profile");
      params.set("section", id);
      params.delete("view");
    });
  };

  const goPreviewSection = () => {
    setProfileSection("preview");
  };

  useEffect(() => {
    if (searchParams.get("tab") === "discover") {
      router.replace("/society?tab=discover", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void getUserProfile(user.uid).then((p) => {
      if (cancelled) return;
      setProfile(p);
      setLoading(false);
      if (!p) setErr(t("accountProfile.noProfile"));
    });
    return () => {
      cancelled = true;
    };
  }, [user, t]);

  const loadActivity = useCallback(async () => {
    if (!user) return;
    setActivityLoading(true);
    setActivityErr(null);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [worksRes, likesRes, histRes] = await Promise.all([
        fetch("/api/me/works", { headers }),
        fetch("/api/me/liked-promos", { headers }),
        fetch("/api/me/watch-history", { headers }),
      ]);
      const worksJson = await readResponseJson<{ works?: unknown[] }>(worksRes);
      const likesJson = await readResponseJson<{ items?: AccountActivityItem[] }>(likesRes);
      const histJson = await readResponseJson<{ items?: AccountActivityItem[] }>(histRes);
      if (!likesRes.ok) {
        setActivityErr(
          formatApiError(t, likesRes.status, {
            ...likesJson.data,
            message: (likesJson.data as { message?: string }).message,
          })
        );
        return;
      }
      if (!histRes.ok) {
        setActivityErr(
          formatApiError(t, histRes.status, {
            ...histJson.data,
            message: (histJson.data as { message?: string }).message,
          })
        );
        return;
      }
      if (worksRes.ok) {
        setUploadCount(worksJson.data.works?.length ?? 0);
      }
      setLikes(likesJson.data.items ?? []);
      setWatched(histJson.data.items ?? []);
    } catch (e) {
      setActivityErr(formatClientError(t, e, { titleKey: "accountProfile.loadActivityFailed" }));
    } finally {
      setActivityLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const activityTabs: { id: ActivityTabId; labelKey: string; count?: number }[] = [
    { id: "uploads", labelKey: "accountProfile.tabUploads", count: uploadCount },
    { id: "likes", labelKey: "accountProfile.tabLikes", count: likes.length },
    { id: "watched", labelKey: "accountProfile.tabWatched", count: watched.length },
  ];

  if (loading) {
    return <p className={styles.status}>{t("common.loading")}</p>;
  }

  if (err || !profile) {
    return <p className={`${styles.status} ${styles.error}`}>{err ?? t("accountProfile.noProfile")}</p>;
  }

  const showBirthDate = Boolean(profile.birthDate?.trim());
  const showAge = !showBirthDate && profile.age != null && profile.age >= 1;
  const showGender = Boolean(profile.gender);
  const showJoined = profile.createdAt != null;
  const localeLabel = LOCALES.find((language) => language.code === profile.locale)?.label ?? null;

  const heroMetaItems: AccountProfileMetaItem[] = [];
  if (showBirthDate && profile.birthDate) {
    const ageFromBirth = computeAgeFromBirthDate(profile.birthDate);
    const ageNum = ageFromBirth ?? (profile.age != null && profile.age >= 1 ? profile.age : null);
    const dateStr = formatBirthDateShort(profile.birthDate, dateLocale);
    heroMetaItems.push({
      label: t("accountProfile.age"),
      value:
        ageNum != null
          ? t("accountProfile.birthDateWithAge", { date: dateStr, age: ageNum })
          : dateStr,
    });
  } else if (showAge) {
    heroMetaItems.push({
      label: t("accountProfile.age"),
      value: String(profile.age),
    });
  }
  if (showJoined) {
    heroMetaItems.push({
      label: t("accountProfile.joinedAt"),
      value: formatDateTime(profile.createdAt),
    });
  }
  if (showGender && profile.gender) {
    heroMetaItems.push({
      label: t("accountProfile.gender"),
      value: t(genderLabelKey(profile.gender)),
    });
  }
  if (localeLabel) {
    heroMetaItems.push({
      label: t("settings.language"),
      value: localeLabel,
    });
  }

  const navProps = {
    place: mainTab,
    onMainTab: setMainTab,
    activityTab,
    onActivityTab: setActivityTab,
    activityTabs,
    activityLoading,
    profileSection,
    onProfileSection: setProfileSection,
  };

  const renderMainContent = () => {
    if (mainTab === "activity") {
      return (
        <>
          {activityErr && activityTab !== "uploads" && <p className={`${styles.error} ${styles.note}`}>{activityErr}</p>}
          {activityTab === "uploads" && <AccountUploadsList />}
          {activityTab === "likes" &&
            (activityLoading ? (
              <p className={styles.status}>{t("common.loading")}</p>
            ) : (
              <>
                <p className={styles.note}>{t("accountProfile.likesNote")}</p>
                <AccountWorkActivityList
                  items={likes}
                  emptyMessage={t("accountProfile.likesEmpty")}
                  emptyCtaLabel={t("accountProfile.emptyLikesCta")}
                  emptyCtaHref="/"
                />
              </>
            ))}
          {activityTab === "watched" &&
            (activityLoading ? (
              <p className={styles.status}>{t("common.loading")}</p>
            ) : (
              <AccountWorkActivityList
                items={watched}
                emptyMessage={t("accountProfile.watchedEmpty")}
                emptyCtaLabel={t("accountProfile.emptyWatchedCta")}
                emptyCtaHref="/movies"
                showTarget
              />
            ))}
        </>
      );
    }
    return (
      <AccountProfileSettingsPanel
        accountProfile={profile}
        section={profileSection}
        onHandleClaimed={reloadProfile}
        onSavedGoPreview={goPreviewSection}
      />
    );
  };

  const onProfileTab = mainTab === "profile";
  const roleLabel = profile.roleTags?.[0]?.replaceAll("_", " ") || "Creator";

  return (
    <div className={`${styles.workspace} ${onProfileTab ? styles.withPreview : ""}`}>
      <aside className={styles.side}>
        <AccountProfileNav variant="sidebar" {...navProps} />
      </aside>

      <section className={styles.main}>
        <div className={styles.mobileNav}>
          <AccountProfileNav variant="mobile" {...navProps} />
        </div>
        <header className={styles.head}>
          <p className={styles.eyebrow}><UiText text={"ACCOUNT & SETTINGS"} /></p>
          <h1 className={styles.title}>{onProfileTab ? <UiText text={"Profile"} /> : t("accountProfile.tabActivity")}</h1>
          <p className={styles.lede}>
            {onProfileTab ? <UiText text={"Shape how collaborators see you."} /> : <UiText text={"What you've uploaded, liked and watched."} />}
          </p>
        </header>
        <AccountProfileHero
          profile={profile}
          email={user?.email ?? null}
          metaItems={heroMetaItems}
          onAvatarUpdated={(avatarUrl) => setProfile((prev) => (prev ? { ...prev, avatarUrl } : prev))}
        />
        <div className={styles.below}>{renderMainContent()}</div>
      </section>

      {onProfileTab ? (
        <aside className={styles.preview}>
          <div className={styles.previewLabel}>
            <UiText text={"PUBLIC PREVIEW"} />
            {profile.handle ? (
              <Link href={`/people/${encodeURIComponent(profile.handle)}`} aria-label={t("accountProfile.openPublicProfile")}>↗</Link>
            ) : (
              <span aria-hidden="true">↗</span>
            )}
          </div>
          <div className={styles.previewBanner} aria-hidden="true" />
          <ProfileAvatar
            displayName={profile.displayName || "?"}
            avatarUrl={profile.avatarUrl}
            className={styles.previewAvatar}
            imgClassName="h-full w-full object-cover"
          />
          <h2 className={styles.previewName}>{profile.displayName || "Creator"}</h2>
          {profile.handle ? <p className={styles.previewHandle}>@{profile.handle}</p> : null}
          <p className={styles.previewMeta}>{roleLabel} <span>·</span> {profile.schoolName || "OONA"}</p>
          <p className={styles.previewBio}>{profile.bio || profile.headline || "Tell collaborators about the stories you want to make."}</p>
          <div className={styles.previewTags}>{(profile.roleTags?.length ? profile.roleTags : ["director", "storytelling"]).slice(0, 3).map((tag) => <span key={tag}>{tag.replaceAll("_", " ")}</span>)}</div>
        </aside>
      ) : null}
    </div>
  );
}
