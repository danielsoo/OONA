"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { useTranslations } from "@/context/LocaleContext";
import { displayProfileLink } from "@/lib/profileLink";
import type { HeroBackgroundId } from "@/lib/heroBackgroundPresets";
import { resolveSocietyBannerBackground } from "@/lib/societyBannerBackground";

export type SocietyHeroStat = { value: string; label: string };

export type SocietyProfileHeroLayoutProps = {
  title: string;
  displayName: string;
  tagline: string | null;
  avatarUrl: string | null;
  schoolName: string | null;
  profileLink: string | null;
  societyBannerBackgroundId: HeroBackgroundId;
  stats: SocietyHeroStat[];
  loading?: boolean;
  isOnline?: boolean;
  toolbar?: ReactNode;
  bannerOverlay?: ReactNode;
};

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-start gap-0.5 px-5 first:pl-0 sm:px-8">
      <span className="text-xl font-semibold tabular-nums text-white">{value}</span>
      <span className="text-xs text-white/45">{label}</span>
    </div>
  );
}

function StatDivider() {
  return <div className="h-10 w-px shrink-0 bg-white/15" aria-hidden />;
}

export function SchoolIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4.26 10.065c.732.456 1.585.695 2.44.695s1.708-.239 2.44-.695m0 0C8.638 9.616 10.304 9 12 9c1.697 0 3.362.616 4.86 1.065m-12.6 0L2.34 7.682a11.954 11.954 0 012.44-.695C6.208 6.82 8.09 6 12 6c3.91 0 5.792.82 7.22 1.987a11.954 11.954 0 012.44.695L19.74 10.065M12 12v6"
      />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M10 13a5 5 0 007.54.54l2.92-2.92a5 5 0 00-7.07-7.07l-1.17 1.17M14 11a5 5 0 00-7.54-.54L3.54 13.4a5 5 0 007.07 7.07l1.17-1.17"
      />
    </svg>
  );
}

export default function SocietyProfileHeroLayout({
  title,
  displayName,
  tagline,
  avatarUrl,
  schoolName,
  profileLink,
  societyBannerBackgroundId,
  stats,
  loading = false,
  isOnline = false,
  toolbar,
  bannerOverlay,
}: SocietyProfileHeroLayoutProps) {
  const { t } = useTranslations();
  const bannerPreset = resolveSocietyBannerBackground(societyBannerBackgroundId);
  return (
    <section
      className="relative isolate mb-8 min-h-[280px] w-full overflow-hidden -mt-[60px] pt-[60px] sm:min-h-[300px] md:min-h-[320px] sm:mb-10"
      aria-busy={loading}
    >
      <div className="pointer-events-none absolute inset-0 bg-[#070707]" aria-hidden />

      <div className="pointer-events-none absolute inset-y-0 right-0 w-[50%]" aria-hidden>
        <Image
          src={bannerPreset.src}
          alt=""
          fill
          className="object-cover opacity-25"
          style={{ objectPosition: bannerPreset.objectPosition }}
          sizes="50vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070707] via-[#070707]/90 to-black/35" />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-xiio-bg"
        aria-hidden
      />

      {bannerOverlay}

      <div className="relative z-10 flex min-h-[280px] flex-col p-6 md:p-8 sm:min-h-[300px] md:min-h-[320px]">
        <div className="flex flex-1 items-center">
          <div className="flex w-full flex-row items-start gap-5 sm:gap-6">
            <ProfileAvatar
              displayName={displayName}
              avatarUrl={avatarUrl}
              className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-xiio-accent/20 text-2xl font-bold text-white ring-2 ring-white/20 sm:h-28 sm:w-28"
            />

            <div className="min-w-0 flex-1 text-left">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {loading ? "…" : title}
                </h1>
                {isOnline ? (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400"
                    aria-label={t("society.online")}
                  />
                ) : null}
                {toolbar}
              </div>

              {tagline ? (
                <p className="mt-1 text-base text-white/85">{tagline}</p>
              ) : loading ? (
                <p className="mt-1 text-sm text-white/30">{t("common.loading")}</p>
              ) : null}

              {schoolName ? (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-white/50">
                  <SchoolIcon className="h-4 w-4 shrink-0" />
                  <span>{schoolName}</span>
                </p>
              ) : null}

              {profileLink ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm">
                  <LinkIcon className="h-4 w-4 shrink-0 text-xiio-accent/80" />
                  <a
                    href={profileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xiio-accent hover:underline"
                  >
                    {displayProfileLink(profileLink)}
                  </a>
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center sm:mt-5">
                {stats.map((stat, i) => (
                  <div key={stat.label} className="flex items-center">
                    {i > 0 ? <StatDivider /> : null}
                    <StatCell value={stat.value} label={stat.label} />
                  </div>
                ))}
                {loading && stats.length === 0 ? (
                  <p className="text-xs text-white/35">{t("common.loading")}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
