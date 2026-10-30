"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DemoSaveNote from "@/components/demo/DemoSaveNote";
import PublicProfileCard from "@/components/profile/PublicProfileCard";
import ProfileAboutForm from "@/components/profile/ProfileAboutForm";
import ProfileIdentityChangePanel from "@/components/profile/ProfileIdentityChangePanel";
import ProfilePhotoEditor from "@/components/profile/ProfilePhotoEditor";
import ProfileDiscoverSettings from "@/components/profile/ProfileDiscoverSettings";
import ProfileWorksThumbnailGrid from "@/components/profile/ProfileWorksThumbnailGrid";
import PortfolioShareSection from "@/components/settings/PortfolioShareSection";
import type { PeopleProfilePayload } from "@/components/profile/PeopleProfileView";
import { useTranslations } from "@/context/LocaleContext";
import type { ProfessionalProfileSaved } from "@/hooks/useProfessionalProfileSave";
import type { DirectorNameChangeRequest } from "@/types/user";

export type OwnerTabId = "edit" | "preview";

type WorkCard = PeopleProfilePayload["directed"][number];

export type ProfileOwnerUrlMode = "people" | "account" | "none";

type Props = {
  data: PeopleProfilePayload;
  handleLocked: boolean;
  onProfileSaved: (saved: ProfessionalProfileSaved) => void;
  onIdentityRequest: (
    field: "displayNameChangeRequest" | "handleChangeRequest",
    req: DirectorNameChangeRequest
  ) => void;
  urlMode?: ProfileOwnerUrlMode;
  className?: string;
  showPublicProfileLink?: boolean;
  onAvatarUpdated?: (avatarUrl: string | null) => void;
};

function parsePreviewFromPeopleUrl(tab: string | null): OwnerTabId {
  return tab === "preview" ? "preview" : "edit";
}

function parsePreviewFromAccountUrl(section: string | null): OwnerTabId {
  return section === "preview" ? "preview" : "edit";
}

function tabBtnClass(active: boolean) {
  return active
    ? "shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-xiio-accent text-white"
    : "shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-xiio-muted hover:text-white transition";
}

export default function ProfileOwnerWorkspace({
  data,
  handleLocked,
  onProfileSaved,
  onIdentityRequest,
  urlMode = "none",
  className = "",
  showPublicProfileLink = false,
  onAvatarUpdated,
}: Props) {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFromUrl =
    urlMode === "people"
      ? parsePreviewFromPeopleUrl(searchParams.get("tab"))
      : urlMode === "account"
        ? parsePreviewFromAccountUrl(searchParams.get("view"))
        : "edit";

  const [activeTab, setActiveTab] = useState<OwnerTabId>(tabFromUrl);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    if (urlMode !== "none") setActiveTab(tabFromUrl);
  }, [tabFromUrl, urlMode]);

  const setTab = useCallback(
    (id: OwnerTabId) => {
      setActiveTab(id);
      setSavedBanner(false);

      if (urlMode === "none") return;

      const params = new URLSearchParams(searchParams.toString());

      if (urlMode === "people") {
        if (id === "edit") params.delete("tab");
        else params.set("tab", id);
        const q = params.toString();
        const base = `/people/${encodeURIComponent(data.profile.handle)}`;
        router.replace(q ? `${base}?${q}` : base, { scroll: false });
        return;
      }

      params.set("tab", "profile");
      if (id === "preview") params.set("section", "preview");
      else params.set("section", "about");
      router.replace(`/account?${params.toString()}`, { scroll: false });
    },
    [data.profile.handle, router, searchParams, urlMode]
  );

  const handleSaved = useCallback(
    (saved: ProfessionalProfileSaved) => {
      onProfileSaved(saved);
      setSavedBanner(true);
      setTab("preview");
    },
    [onProfileSaved, setTab]
  );

  const renderWorks = (items: WorkCard[], title: string) => {
    if (items.length === 0) return null;
    return (
      <section className="mb-10 w-full">
        <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
        <ProfileWorksThumbnailGrid items={items} linkToWatch />
      </section>
    );
  };

  const publicProfileHref = data.profile.handle
    ? `/people/${encodeURIComponent(data.profile.handle)}`
    : null;

  return (
    <div className={`w-full space-y-6 ${className}`.trim()}>
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        <button type="button" onClick={() => setTab("edit")} className={tabBtnClass(activeTab === "edit")}>
          {t("profile.tabs.edit")}
        </button>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className={tabBtnClass(activeTab === "preview")}
        >
          {t("profile.tabs.preview")}
        </button>
      </div>

      <div className={activeTab === "preview" ? "space-y-8" : "hidden"}>
          <p className="text-sm text-xiio-muted">{t("profile.tabs.previewHint")}</p>
          {savedBanner && (
            <p className="text-sm text-emerald-400 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
              {t("profile.tabs.savedGoPreview")}
            </p>
          )}
          <PublicProfileCard profile={data.profile} isSelf />
          {renderWorks(data.directed, t("network.people.directed"))}
          {renderWorks(data.credited, t("network.people.credited"))}
          {showPublicProfileLink && publicProfileHref && (
            <p className="text-sm">
              <Link
                href={publicProfileHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xiio-accent hover:underline"
              >
                {t("accountProfile.openPublicProfile")} →
              </Link>
            </p>
          )}
      </div>
      <div className={activeTab === "edit" ? "space-y-6" : "hidden"}>
          <section className="bg-xiio-surface rounded-2xl border border-white/10 p-6 sm:p-8 space-y-6">
            <p className="text-sm text-xiio-muted">{t("profile.tabs.editHint")}</p>
            <DemoSaveNote />
            <ProfilePhotoEditor
              displayName={data.profile.displayName}
              avatarUrl={data.profile.avatarUrl}
              onUpdated={onAvatarUpdated}
            />
            <div className="border-t border-white/10 pt-6">
              <ProfileAboutForm
                profile={data.profile}
                handleLocked={handleLocked}
                onSaved={handleSaved}
              />
            </div>
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
            {handleLocked && data.profile.handle && (
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
            )}
          </section>
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <ProfileDiscoverSettings initialDiscoverable={data.identity?.isDiscoverable} />
            <PortfolioShareSection />
          </div>
      </div>
    </div>
  );
}
