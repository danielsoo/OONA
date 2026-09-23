"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import ProfileAboutForm from "@/components/profile/ProfileAboutForm";
import SchoolAffiliationSettings from "@/components/school/SchoolAffiliationSettings";
import ProfileDiscoverSettings from "@/components/profile/ProfileDiscoverSettings";
import ProfileIdentityChangePanel from "@/components/profile/ProfileIdentityChangePanel";
import ProfileWorksThumbnailGrid from "@/components/profile/ProfileWorksThumbnailGrid";
import PublicProfileCard from "@/components/profile/PublicProfileCard";
import PortfolioShareSection from "@/components/settings/PortfolioShareSection";
import type { PeopleProfilePayload } from "@/components/profile/PeopleProfileView";
import type { ProfileSectionId } from "@/lib/profileSections";
import type { ProfessionalProfileSaved } from "@/hooks/useProfessionalProfileSave";
import type { DirectorNameChangeRequest, UserProfileDoc } from "@/types/user";

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
      <div className="space-y-6">
        <p className="text-sm text-xiio-muted">{t("accountProfile.profileNoHandle")}</p>
        {section === "about" && (
          <>
            <ProfileAboutForm
              profile={stubProfile}
              handleLocked={false}
              onSaved={(saved) => {
                if (saved.handle?.trim()) onHandleClaimed?.();
              }}
            />
          </>
        )}
        {section !== "about" && (
          <p className="text-sm text-xiio-muted">{t("accountProfile.profileNoHandle")}</p>
        )}
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-xiio-muted py-6 text-center">{t("common.loading")}</p>;
  }

  if (err || !data) {
    return <p className="text-sm text-red-400 py-6">{err ?? t("network.people.loadError")}</p>;
  }

  const handleLocked = !!data.profile.handle?.trim();
  const publicHref = `/people/${encodeURIComponent(data.profile.handle)}`;

  const renderWorks = (items: PeopleProfilePayload["directed"], title: string) => {
    if (items.length === 0) return null;
    return (
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
        <ProfileWorksThumbnailGrid items={items} linkToWatch />
      </section>
    );
  };

  switch (section) {
    case "about":
      return (
        <div className="space-y-8">
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
          <div className="border-t border-white/10 pt-6">
            <ProfileAboutForm
              profile={data.profile}
              handleLocked={handleLocked}
              onSaved={onProfileSaved}
            />
          </div>
          <SchoolAffiliationSettings initialSchoolName={accountProfile.schoolName} />
        </div>
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
        <p className="text-sm text-xiio-muted">{t("accountProfile.profileNoHandle")}</p>
      );
    case "discover":
      return <ProfileDiscoverSettings initialDiscoverable={data.identity?.isDiscoverable} />;
    case "portfolio":
      return <PortfolioShareSection />;
    case "preview":
      return (
        <div className="space-y-8">
          <p className="text-sm text-xiio-muted">{t("profile.tabs.previewHint")}</p>
          {savedBanner && (
            <p className="text-sm text-emerald-400 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
              {t("profile.tabs.savedGoPreview")}
            </p>
          )}
          <PublicProfileCard profile={data.profile} isSelf />
          {renderWorks(data.directed, t("network.people.directed"))}
          {renderWorks(data.credited, t("network.people.credited"))}
          <p className="text-sm">
            <Link
              href={publicHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xiio-accent hover:underline"
            >
              {t("accountProfile.openPublicProfile")} →
            </Link>
          </p>
        </div>
      );
    default:
      return null;
  }
}
