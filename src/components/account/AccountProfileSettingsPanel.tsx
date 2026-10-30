"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { useIsDemoVisit } from "@/hooks/useIsDemoVisit";
import ProfileAboutForm from "@/components/profile/ProfileAboutForm";
import SchoolAffiliationSettings from "@/components/school/SchoolAffiliationSettings";
import ProfileDiscoverSettings from "@/components/profile/ProfileDiscoverSettings";
import ProfileIdentityChangePanel from "@/components/profile/ProfileIdentityChangePanel";
import ProfileWorksThumbnailGrid from "@/components/profile/ProfileWorksThumbnailGrid";
import PublicProfilePreview from "@/components/profile/PublicProfilePreview";
import PortfolioShareSection from "@/components/settings/PortfolioShareSection";
import type { PeopleProfilePayload } from "@/components/profile/PeopleProfileView";
import type { ProfileSectionId } from "@/lib/profileSections";
import type { ProfessionalProfileSaved } from "@/hooks/useProfessionalProfileSave";
import type { DirectorNameChangeRequest, UserProfileDoc } from "@/types/user";
import styles from "@/components/settings/SettingsPage.module.css";

type Props = {
  accountProfile: UserProfileDoc;
  section: ProfileSectionId;
  onHandleClaimed?: () => void;
  onSavedGoPreview?: () => void;
};

export default function AccountProfileSettingsPanel({
  accountProfile,
  section,
  onHandleClaimed,
  onSavedGoPreview,
}: Props) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const demo = useIsDemoVisit();
  const [data, setData] = useState<PeopleProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState(false);

  const handle = accountProfile.handle?.trim() ?? "";

  const load = useCallback(async () => {
    if (!user || !handle) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/people/${encodeURIComponent(handle)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setErr(t("network.people.loadError"));
        setData(null);
        return;
      }
      setData((await res.json()) as PeopleProfilePayload);
    } catch {
      setErr(t("network.people.loadError"));
    } finally {
      setLoading(false);
    }
  }, [user, handle, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onProfileSaved = useCallback(
    (saved: ProfessionalProfileSaved) => {
      const newHandle = saved.handle?.trim();
      if (newHandle && newHandle !== handle) {
        onHandleClaimed?.();
        return;
      }
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          profile: {
            ...prev.profile,
            headline: saved.headline ?? undefined,
            bio: saved.bio ?? undefined,
            profileLink: saved.profileLink ?? undefined,
            openToCollaborate: saved.openToCollaborate,
            collaborationNote: saved.collaborationNote ?? undefined,
          },
        };
      });
      setSavedBanner(true);
      onSavedGoPreview?.();
    },
    [handle, onHandleClaimed, onSavedGoPreview]
  );

  const onIdentityRequest = useCallback(
    (field: "displayNameChangeRequest" | "handleChangeRequest", req: DirectorNameChangeRequest) => {
      setData((prev) => {
        if (!prev?.identity) return prev;
        return { ...prev, identity: { ...prev.identity, [field]: req } };
      });
    },
    []
  );

  if (!handle) {
    const stubProfile = {
      uid: user?.uid ?? "",
      handle: "",
      displayName: accountProfile.displayName,
      avatarUrl: accountProfile.avatarUrl ?? null,
    };
    return (
      <section className={styles.section}>
        <p className={`${styles.note} ${styles.sectionHead}`}>{t("accountProfile.profileNoHandle")}</p>
        {section === "about" && (
          <ProfileAboutForm
            profile={stubProfile}
            handleLocked={false}
            onSaved={(saved) => {
              if (saved.handle?.trim()) onHandleClaimed?.();
            }}
          />
        )}
      </section>
    );
  }

  if (loading) {
    return <p className={styles.status}>{t("common.loading")}</p>;
  }

  if (err || !data) {
    return <p className={styles.error}>{err ?? t("network.people.loadError")}</p>;
  }

  const handleLocked = !!data.profile.handle?.trim();
  const publicHref = `/people/${encodeURIComponent(data.profile.handle)}`;

  const renderWorks = (items: PeopleProfilePayload["directed"], title: string) => {
    if (items.length === 0) return null;
    return (
      <section className={styles.section}>
        <h2 className={styles.worksTitle}>{title}</h2>
        <ProfileWorksThumbnailGrid items={items} linkToWatch />
      </section>
    );
  };

  switch (section) {
    case "about":
      return (
        <>
          <ProfileIdentityChangePanel
            kind="displayName"
            currentValue={data.profile.displayName}
            pendingRequest={
              data.identity?.displayNameChangeRequest?.status === "pending"
                ? data.identity.displayNameChangeRequest
                : null
            }
            onSubmitted={(req) => onIdentityRequest("displayNameChangeRequest", req)}
          />
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("accountProfile.sections.about")}</h2>
            </div>
            <ProfileAboutForm
              profile={data.profile}
              handleLocked={handleLocked}
              onSaved={onProfileSaved}
            />
          </section>
          <SchoolAffiliationSettings initialSchoolName={accountProfile.schoolName} />
        </>
      );
    case "handle":
      return handleLocked ? (
        <ProfileIdentityChangePanel
          kind="handle"
          currentValue={data.profile.handle}
          pendingRequest={
            data.identity?.handleChangeRequest?.status === "pending"
              ? data.identity.handleChangeRequest
              : null
          }
          onSubmitted={(req) => onIdentityRequest("handleChangeRequest", req)}
        />
      ) : (
        <p className={styles.note}>{t("accountProfile.profileNoHandle")}</p>
      );
    case "portfolio":
      return (
        <PortfolioShareSection
          ownerName={data.profile.displayName || data.profile.handle}
          thumbs={Object.fromEntries([...data.directed, ...data.credited].map((w) => [`${w.ownerUid}:${w.workId}`, w.thumbnailUrl]))}
        />
      );
    // Whether anyone can find you, and the page they find: two halves of the
    // same question, so they are answered on one screen — change the switch
    // and the thing it governs is right there under it.
    case "public":
      return (
        <>
          <ProfileDiscoverSettings initialDiscoverable={data.identity?.isDiscoverable} />
          <section className={`${styles.section} ${styles.stack}`}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("accountProfile.sections.preview")}</h2>
              <p className={styles.sectionHint}>{t("profile.tabs.previewHint")}</p>
            </div>
            {/* Nothing was saved in the demo, so DemoSaveNote above speaks instead. */}
            {savedBanner && !demo && <p className={styles.notice}>{t("profile.tabs.savedGoPreview")}</p>}
            {/* The same preview as the aside, so the two never disagree. */}
            <PublicProfilePreview
              profile={data.profile}
              showLabel={false}
              className={styles.previewFlat}
            />
          </section>
          {renderWorks(data.directed, t("network.people.directed"))}
          {renderWorks(data.credited, t("network.people.credited"))}
          <p>
            <Link href={publicHref} target="_blank" rel="noopener noreferrer" className={styles.textLink}>
              {t("accountProfile.openPublicProfile")} →
            </Link>
          </p>
        </>
      );
    default:
      return null;
  }
}
