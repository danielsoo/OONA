"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SocietyBannerPicker from "@/components/society/SocietyBannerPicker";
import PageHeader from "@/components/ui/PageHeader";
import SocietyProfileHeroLayout from "@/components/society/SocietyProfileHeroLayout";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { formatCompactStat } from "@/lib/formatStat";
import { DEFAULT_SOCIETY_BANNER_ID } from "@/lib/societyBannerBackground";
import {
  fetchSocietySummary,
  readStoredSocietySummary,
  type SocietySummary,
} from "@/lib/societySummaryCache";

type HeroData = SocietySummary;

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a1.5 1.5 0 00-2.12-2.12L5.88 17.88 4 20z"
      />
    </svg>
  );
}

function FallbackHeader() {
  const { t } = useTranslations();
  return (
    <PageHeader className="px-4 lg:px-12" title={t("society.title")} description={t("society.lead")} />
  );
}

export default function SocietyProfileHero() {
  const { user } = useAuth();
  const { t } = useTranslations();
  const [data, setData] = useState<HeroData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const stored = readStoredSocietySummary(user.uid);
    if (stored) {
      setData(stored);
      setLoading(false);
    } else {
      setLoading(true);
    }

    (async () => {
      try {
        const summary = await fetchSocietySummary(user);
        if (!cancelled) setData(summary);
      } catch {
        if (!cancelled && !stored) {
          setData({
            displayName: user.displayName?.trim() || "—",
            handle: null,
            headline: null,
            bio: null,
            avatarUrl: null,
            schoolName: null,
            profileLink: null,
            societyBannerBackgroundId: DEFAULT_SOCIETY_BANNER_ID,
            stories: 0,
            followers: 0,
            following: 0,
            totalViews: 0,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return <FallbackHeader />;
  }

  const title = data?.handle || data?.displayName || user.displayName || "—";
  const tagline =
    data?.headline || (data?.bio ? data.bio.split("\n")[0]?.trim() : null);

  const stats = data
    ? [
        { value: formatCompactStat(data.stories), label: t("society.hero.statStories") },
        { value: formatCompactStat(data.followers), label: t("society.hero.statFollowers") },
        { value: formatCompactStat(data.following), label: t("society.hero.statFollowing") },
        { value: formatCompactStat(data.totalViews), label: t("society.hero.statTotalViews") },
      ]
    : [];

  return (
    <SocietyProfileHeroLayout
      title={title}
      displayName={data?.displayName ?? title}
      tagline={tagline}
      avatarUrl={data?.avatarUrl ?? null}
      schoolName={data?.schoolName ?? null}
      profileLink={data?.profileLink ?? null}
      societyBannerBackgroundId={data?.societyBannerBackgroundId ?? DEFAULT_SOCIETY_BANNER_ID}
      stats={stats}
      loading={loading}
      toolbar={
        <Link
          href="/account?tab=profile&section=about"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-sm font-medium text-white/85 transition hover:border-white/40 hover:bg-white/5"
        >
          <EditIcon className="h-3.5 w-3.5" />
          {t("society.hero.editProfile")}
        </Link>
      }
      bannerOverlay={
        data ? (
          <SocietyBannerPicker
            value={data.societyBannerBackgroundId}
            onChange={(id) =>
              setData((prev) => (prev ? { ...prev, societyBannerBackgroundId: id } : prev))
            }
          />
        ) : null
      }
    />
  );
}
