"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback } from "react";
import AdminHomeColorPicker from "@/components/home/AdminHomeColorPicker";
import HeroCopy from "@/components/hero/HeroCopy";
import HeroLandscapeBackdrop from "@/components/hero/HeroLandscapeBackdrop";
import { useHeroWaveLayout } from "@/context/HeroWaveLayoutContext";
import { useHomeHeroTheme } from "@/context/HomeHeroThemeContext";
import { useTranslations } from "@/context/LocaleContext";
import { useSchoolsFeed } from "@/hooks/useSchoolsFeed";
import { heroSectionMinHeight } from "@/lib/homeHeroLayout";
import { MOCKUP_CAMPUS } from "@/lib/mockupCampusSpec";
import { MOCKUP_HOME } from "@/lib/mockupHomeSpec";
import { schoolPosterGradient, schoolSeasonDelta, schoolStudentCount } from "@/lib/school-brand";
import type { SchoolListItem } from "@/types/school";
import EmptyState from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { UPLOAD_HREF } from "@/lib/appNav";
import { DEMO_MODE } from "@/lib/demoMode";
import { plural } from "@/lib/i18nPlural";

const MEDAL_COLORS = ["#E9C16A", "#D7D7DE", "#D79A63"] as const;
const PODIUM_ORDER = [1, 0, 2] as const;
const PODIUM_HEIGHTS = ["h-24", "h-32", "h-20"] as const;

function SchoolMark({ school, sizeClass }: { school: SchoolListItem; sizeClass: string }) {
  if (school.logoUrl) {
    return (
      <div className={`relative ${sizeClass} shrink-0 rounded-full overflow-hidden bg-black/30`}>
        <Image src={school.logoUrl} alt="" fill className="object-contain p-2" sizes="80px" unoptimized />
      </div>
    );
  }
  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full text-sm font-black text-white/90`}
      style={{ background: schoolPosterGradient(school.colorPrimary, school.colorSecondary) }}
    >
      {school.initials}
    </div>
  );
}

function SchoolPodium({ schools, t }: { schools: SchoolListItem[]; t: (k: string, v?: Record<string, string | number>) => string }) {
  const top3 = schools.slice(0, 3);
  if (top3.length === 0) return null;
  return (
    <section>
      <div className={MOCKUP_CAMPUS.sectionHeaderRow}>
        <SectionLabelInline>{t("schools.podiumTitle")}</SectionLabelInline>
      </div>
      <div className="flex items-end justify-center gap-4 sm:gap-6">
        {PODIUM_ORDER.filter((i) => top3[i]).map((i) => {
          const school = top3[i]!;
          const medal = MEDAL_COLORS[i]!;
          return (
            <Link
              key={school.id}
              href={`/school/${school.id}`}
              className="flex flex-col items-center gap-3 group w-[120px] sm:w-[150px]"
            >
              <div
                className="rounded-full p-1"
                style={{ boxShadow: `0 0 0 2px ${medal}` }}
              >
                <SchoolMark school={school} sizeClass={i === 0 ? "w-20 h-20 sm:w-24 sm:h-24" : "w-16 h-16 sm:w-20 sm:h-20"} />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-white truncate max-w-[140px] group-hover:text-white">
                  {school.name}
                </p>
                <p className="text-small text-ink-3 mt-0.5">
                  {plural(t, "ui.schools.workCount", school.workCount ?? 0)}
                </p>
              </div>
              <div
                className={`w-full ${PODIUM_HEIGHTS[i]} rounded-t-lg flex items-start justify-center pt-2`}
                style={{ background: `linear-gradient(180deg, ${medal}33, ${medal}0d)`, borderTop: `2px solid ${medal}` }}
              >
                <span className="text-lg font-black" style={{ color: medal }}>
                  {i + 1}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function SectionLabelInline({ children }: { children: React.ReactNode }) {
  return (
    <div className={MOCKUP_CAMPUS.sectionLabelRow}>
      <span className={MOCKUP_CAMPUS.sectionDot} aria-hidden />
      <h2 className={MOCKUP_CAMPUS.sectionLabel}>{children}</h2>
    </div>
  );
}

function SchoolRankedTable({ schools, t }: { schools: SchoolListItem[]; t: (k: string, v?: Record<string, string | number>) => string }) {
  if (schools.length === 0) return null;
  const gridCols = DEMO_MODE ? "grid-cols-[40px_1fr_70px_70px_56px]" : "grid-cols-[40px_1fr_80px]";
  return (
    <section>
      <div className={MOCKUP_CAMPUS.sectionHeaderRow}>
        <SectionLabelInline>{t("schools.contendersTitle")}</SectionLabelInline>
      </div>
      <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className={`grid ${gridCols} items-center gap-3 px-4 py-2.5 border-b border-line text-micro uppercase text-ink-4`}>
          <span>{t("schools.rankColumn")}</span>
          <span>{t("schools.schoolColumn")}</span>
          <span className="text-right">{t("schools.worksColumn")}</span>
          {DEMO_MODE ? <span className="text-right">{t("schools.studentsColumn")}</span> : null}
          {DEMO_MODE ? <span className="text-right">{t("schools.changeColumn")}</span> : null}
        </div>
        {schools.map((school, i) => {
          const delta = schoolSeasonDelta(school.id);
          return (
            <Link
              key={school.id}
              href={`/school/${school.id}`}
              className={`grid ${gridCols} items-center gap-3 px-4 py-3 border-b border-line last:border-b-0 hover:bg-white/[0.02] transition`}
            >
              <span className="font-serif text-lg text-white/40">{i + 1}</span>
              <span className="flex items-center gap-3 min-w-0">
                <SchoolMark school={school} sizeClass="w-8 h-8" />
                <span className="text-small font-medium text-ink truncate">{school.name}</span>
              </span>
              <span className="text-right text-small text-ink-2 tabular-nums">{school.workCount ?? 0}</span>
              {DEMO_MODE ? (
                <span className="text-right text-small text-ink-2 tabular-nums">
                  {schoolStudentCount(school.id, school.workCount ?? 0)}
                </span>
              ) : null}
              {DEMO_MODE ? (
                <span className={`text-right text-small tabular-nums ${delta.up ? "text-xiio-success" : "text-ink-4"}`}>
                  {delta.label}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function SchoolsDirectoryPage({ schools: initialSchools }: { schools?: SchoolListItem[] }) {
  const { t } = useTranslations();
  const { user } = useAuth();
  const { items: schools, loading } = useSchoolsFeed(50, initialSchools);
  const { rgbTuple, overlayEnabled, heroStyle, themeReady } = useHomeHeroTheme();
  const {
    waveRect,
    gradStartPercent,
    layoutReady,
    registerHeroSection,
    registerHeroText,
  } = useHeroWaveLayout();

  const setHeroSectionRef = useCallback(
    (el: HTMLElement | null) => {
      registerHeroSection(el);
    },
    [registerHeroSection]
  );

  const setHeroTextRef = useCallback(
    (el: HTMLDivElement | null) => {
      registerHeroText(el);
    },
    [registerHeroText]
  );

  const visualReady = themeReady && layoutReady;

  return (
    <main className={`min-h-screen min-w-0 w-full ${MOCKUP_HOME.pageShell}`} style={heroStyle}>
      <section
        ref={setHeroSectionRef}
        className={`relative isolate flex min-w-0 w-full flex-col overflow-hidden -mt-[60px] pt-[60px] ${MOCKUP_HOME.heroSection}`}
        style={{ minHeight: heroSectionMinHeight(waveRect) }}
      >
        <HeroLandscapeBackdrop
          rgbTuple={rgbTuple}
          overlayEnabled={overlayEnabled}
          backgroundScope="campus"
          variant="home"
          gradStartPercent={gradStartPercent}
          visualReady={visualReady}
          priority
        />

        <div
          ref={setHeroTextRef}
          className="absolute inset-x-0 top-[196px] z-10 px-6 lg:px-12"
        >
          <HeroCopy
            eyebrow={t("schools.heroBadge")}
            title={t("schools.directoryTitle")}
            description={t("schools.directorySubtitle")}
          />
        </div>
      </section>

      <div
        className={`relative z-10 bg-xiio-bg px-4 pt-11 lg:px-12 ${MOCKUP_HOME.pageShell} ${MOCKUP_HOME.contentBodyGuard} pb-16 flex flex-col ${MOCKUP_HOME.sectionGap}`}
      >
        {loading && schools.length === 0 ? (
          <p className="text-white/45">{t("common.loading")}</p>
        ) : schools.length === 0 ? (
          <p className="text-white/45">{t("schools.empty")}</p>
        ) : (
          <>
            {schools.length >= 3 ? (
              <SchoolPodium schools={schools} t={t} />
            ) : (
              <EmptyState
                title={t("ui.schools.podiumPendingTitle")}
                body={t("ui.schools.podiumPendingBody")}
                action={{ href: user ? UPLOAD_HREF : "/login", label: t("ui.schools.uploadCta") }}
              />
            )}
            <SchoolRankedTable schools={schools} t={t} />
          </>
        )}
      </div>

      <AdminHomeColorPicker />
    </main>
  );
}
