"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicWorkCredit } from "@/types/watch";
import filmHeroImage from "../../../film_hero.webp";
import AppPageShell from "@/components/layout/AppPageShell";
import SubpageHeader from "@/components/layout/SubpageHeader";
import WatchlistButton from "@/components/watchlist/WatchlistButton";
import WatchDetailTabs from "@/components/watch/WatchDetailTabs";
import WatchMoreSections from "@/components/watch/WatchMoreSections";
import { useAuth } from "@/context/AuthContext";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useRecordEngagementView } from "@/hooks/useRecordEngagementView";
import { useTranslations } from "@/context/LocaleContext";
import { formatApiError, formatClientError } from "@/lib/clientErrors";
import { requestPublicWatch } from "@/lib/watchDataCache";
import { aspectRatioMessageKey, aspectRatioNumeric } from "@/lib/works/aspect-ratio";
import { formatRuntime, sectionCatalogHref } from "@/lib/works/catalog-ui";
import { DEMO_MODE } from "@/lib/demoMode";
import Chip from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import type { PublicWorkWatch } from "@/types/watch";
import type { VideoAspectRatio } from "@/types/work";

// Players (hls.js), the admin player, the report dialog and the demo series
// panel load only when they are about to be shown. This keeps the watch route
// small, so it compiles and opens faster.
const GuestLimitedPlayer = dynamic(() => import("@/components/watch/GuestLimitedPlayer"), { ssr: false });
const StreamProgressIframe = dynamic(() => import("@/components/watch/StreamProgressIframe"), { ssr: false });
const StreamHlsVideo = dynamic(() => import("@/components/shorts/StreamHlsVideo"), { ssr: false });
const PlaybackVideo = dynamic(() => import("@/components/PlaybackVideo"), { ssr: false });
const ReportContentModal = dynamic(() => import("@/components/report/ReportContentModal"), { ssr: false });
const SeriesEpisodeSection = dynamic(() => import("@/components/watch/SeriesEpisodeSection"), { ssr: false });

type Props = { ownerUid: string; workId: string };

type WatchPhase = "prologue" | "main";

export default function WatchPageContent({ ownerUid, workId }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, checked: adminChecked } = useAdminAccess();
  const { t } = useTranslations();
  const [data, setData] = useState<PublicWorkWatch | null>(null);
  const [phase, setPhase] = useState<WatchPhase>("main");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<"overview" | "credits" | "reviews">("overview");
  const playerRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const result = await requestPublicWatch(ownerUid, workId);
      const body = result.data;
      if (!result.ok) {
        setErr(
          formatApiError(t, result.status, {
            ...body,
            message: body.message ?? (result.raw.slice(0, 500) || t("watch.notFound")),
          })
        );
        setData(null);
        return;
      }
      setData(body);
      setPhase(body.prologue?.playbackUrl ? "prologue" : "main");
      setPlayerOpen(false);
    } catch (e) {
      setErr(formatClientError(t, e, { titleKey: "watch.loadError" }));
    } finally {
      setLoading(false);
    }
  }, [ownerUid, workId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useRecordEngagementView(
    ownerUid,
    workId,
    "full",
    Boolean(data) && !loading && !err && playerOpen && phase === "main"
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-xiio-bg pt-24 px-6 flex items-center justify-center">
        <p className="text-xiio-muted">{t("common.loading")}</p>
      </main>
    );
  }

  if (err || !data) {
    return (
      <AppPageShell>
        <SubpageHeader title={t("watch.notFound")} backFallbackHref="/" />
        <p className="text-red-400 whitespace-pre-wrap break-words">{err ?? t("watch.notFound")}</p>
      </AppPageShell>
    );
  }

  const ratioId: VideoAspectRatio = data.approvedAspectRatio ?? "16:9";
  const numericRatio = aspectRatioNumeric(ratioId);
  const sectionLabelKey =
    data.section === "series"
      ? "ui.browse.tabSeries"
      : data.section === "entertainment"
        ? "ui.browse.tabEntertainment"
        : "ui.browse.tabFilms";
  const eyebrowKey =
    data.section === "series"
      ? "ui.watch.sectionSeries"
      : data.section === "entertainment"
        ? "ui.watch.sectionEntertainment"
        : "ui.watch.sectionFilm";
  const metadata = [
    data.approvedCategory,
    data.durationSec ? formatRuntime(data.durationSec, t) : null,
  ].filter(Boolean) as string[];
  const heroCredits = buildHeroCredits(data.credits, data.director, t);
  const heroImage = data.thumbnailUrl || filmHeroImage.src;
  const isGuest = !authLoading && !user;
  const showingPrologue = phase === "prologue" && Boolean(data.prologue?.playbackUrl);
  const activePlayback = showingPrologue ? data.prologue! : data;
  const useGuestPlayer = isGuest && Boolean(activePlayback.playbackUrl);
  const playLabel = t("watch.playFilm");
  const isOwner = Boolean(user && user.uid === ownerUid);
  const showSeriesPanel = DEMO_MODE && data.section === "series";

  const showCredits = () => {
    setDetailTab("credits");
    window.setTimeout(() => {
      tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  };

  const openReport = () => {
    setMoreOpen(false);
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setReportOpen(true);
  };

  const openPlayer = () => {
    setPlayerOpen(true);
    window.setTimeout(() => {
      playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  };

  return (
    <main className="min-h-screen bg-xiio-bg pb-20">
      <section className="relative isolate overflow-hidden border-b border-line">
        <div
          className="absolute inset-0 bg-cover bg-center scale-[1.01]"
          style={{
            backgroundImage:
              heroImage === filmHeroImage.src
                ? `url(${JSON.stringify(filmHeroImage.src)})`
                : `url(${JSON.stringify(heroImage)}), url(${JSON.stringify(filmHeroImage.src)})`,
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/65 to-black/10" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-xiio-bg via-transparent to-black/20" aria-hidden="true" />

        <div className="relative z-[1] flex min-h-[480px] flex-col justify-end px-4 pb-10 pt-6 lg:min-h-[560px] lg:px-12 lg:pb-14">
          <Link
            href={sectionCatalogHref(data.section)}
            className="mb-auto inline-flex w-fit items-center gap-1.5 rounded-full py-1 text-small font-medium text-ink-2 transition-colors hover:text-ink"
          >
            <span aria-hidden="true">‹</span>
            {t(sectionLabelKey)}
          </Link>

          <div className="mt-16 max-w-[680px]">
            <p className="mb-3 text-micro font-semibold uppercase text-xiio-accent">{t(eyebrowKey)}</p>
            <h1 className="font-serif text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[1.05] text-ink">
              {data.title}
            </h1>
            {metadata.length > 0 ? (
              <p className="mt-4 text-small text-ink-2">{metadata.join(" · ")}</p>
            ) : null}
            {data.description ? (
              <p className="mt-4 line-clamp-3 max-w-[60ch] whitespace-pre-wrap text-body text-ink-2">
                {data.description}
              </p>
            ) : null}

            {heroCredits.visible.length > 0 ? (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {heroCredits.visible.map((credit) => (
                  <Chip key={credit.key} label={credit.role} href={credit.href ?? undefined}>
                    {credit.name}
                  </Chip>
                ))}
                {heroCredits.hiddenCount > 0 ? (
                  <button
                    type="button"
                    onClick={showCredits}
                    className="h-8 rounded-full px-2 text-small font-medium text-ink-3 transition-colors hover:text-ink"
                  >
                    +{heroCredits.hiddenCount}
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={openPlayer}
                className="min-w-[148px]"
                icon={
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                }
              >
                {playLabel}
              </Button>
              <WatchlistButton ownerUid={ownerUid} workId={workId} variant="hero" />
              <div ref={moreRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={moreOpen}
                  aria-label={t("ui.watch.more")}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-line-strong bg-white/[0.04] text-ink transition-colors hover:bg-white/[0.1]"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                    <circle cx="5" cy="12" r="1.75" />
                    <circle cx="12" cy="12" r="1.75" />
                    <circle cx="19" cy="12" r="1.75" />
                  </svg>
                </button>
                {moreOpen ? (
                  <div
                    role="menu"
                    className="animate-dropdown-in absolute bottom-full left-0 z-30 mb-2 w-48 rounded-card border border-line-strong bg-xiio-card py-1 shadow-xl"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={openReport}
                      className="w-full px-4 py-2.5 text-left text-small text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink"
                    >
                      {t("ui.watch.report")}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full min-w-0 overflow-x-clip px-4 pt-8 lg:px-12">
        {playerOpen ? (
          <div ref={playerRef} className="mb-12 scroll-mt-20">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                {showingPrologue ? (
                  <p className="mb-1 text-xs font-medium text-xiio-accent">{t("watch.prologuePlaying")}</p>
                ) : null}
                <h2 className="text-xl font-semibold text-white">
                  {showingPrologue ? data.prologue?.title ?? data.title : data.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPlayerOpen(false)}
                className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
              >
                {t("watch.closePlayer")}
              </button>
            </div>
            <div
              className="relative mx-auto w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/50"
              style={{ maxWidth: numericRatio >= 1 ? "100%" : "min(520px, 100%)" }}
            >
              <div className="relative w-full" style={{ aspectRatio: numericRatio }}>
                {useGuestPlayer ? (
                  <GuestLimitedPlayer
                    key={showingPrologue ? "prologue" : "main"}
                    src={activePlayback.playbackUrl!}
                    durationSec={activePlayback.durationSec}
                  />
                ) : showingPrologue ? (
                  <StreamHlsVideo
                    key="prologue-hls"
                    src={data.prologue!.playbackUrl!}
                    ariaLabel={data.prologue?.title ?? data.title}
                    className="absolute inset-0 h-full w-full object-contain bg-black"
                    playsInline
                    muted={false}
                    preload="auto"
                    controls
                    preferHighStart
                    showQualitySelector
                  />
                ) : (
                  <StreamProgressIframe
                    key="main-hls"
                    src={data.playbackUrl!}
                    title={data.title}
                    ownerUid={ownerUid}
                    workId={workId}
                    className="absolute inset-0 h-full w-full border-0"
                  />
                )}
              </div>
              {showingPrologue ? (
                <button
                  type="button"
                  onClick={() => setPhase("main")}
                  className="absolute bottom-3 right-3 z-10 rounded-lg border border-white/20 bg-black/70 px-3 py-1.5 text-sm text-white transition hover:bg-black/90"
                >
                  {t("watch.skipPrologue")}
                </button>
              ) : null}
            </div>
            {showingPrologue && data.prologue?.description ? (
              <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm text-white/65">
                {data.prologue.description}
              </p>
            ) : null}
          </div>
        ) : null}


        <div ref={tabsRef} className="scroll-mt-20">
          {showSeriesPanel ? (
            <SeriesEpisodeSection
              focusItem={{
                id: `${ownerUid}_${workId}`,
                ownerUid,
                workId,
                title: data.title,
                director: data.director,
                section: data.section,
                approvedCategory: data.approvedCategory,
                approvedTags: data.approvedTags,
                thumbnailUrl: data.thumbnailUrl,
              }}
              approvedAspectRatio={data.approvedAspectRatio}
              approvedSchoolId={data.approvedSchoolId}
              approvedSchoolName={data.approvedSchoolName}
              credits={data.credits}
            />
          ) : (
            <WatchDetailTabs
              ownerUid={ownerUid}
              workId={workId}
              tab={detailTab}
              onTabChange={setDetailTab}
              isOwner={isOwner}
              description={data.description}
              durationSec={data.durationSec}
              approvedCategory={data.approvedCategory}
              approvedTags={data.approvedTags}
              approvedAspectRatio={data.approvedAspectRatio}
              approvedSchoolId={data.approvedSchoolId}
              approvedSchoolName={data.approvedSchoolName}
              credits={data.credits}
            />
          )}
        </div>

        <WatchMoreSections section={data.section} ownerUid={ownerUid} workId={workId} />

        {adminChecked && isAdmin && data.playbackUrl ? (
          <details className="mt-14 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-xiio-muted">
            <summary className="cursor-pointer font-medium text-amber-200/90 transition hover:text-white">
              {t("watch.adminDirectPlayerTitle")}
            </summary>
            <p className="mb-3 mt-3 text-xs leading-relaxed text-xiio-muted">
              {t("watch.adminDirectPlayerHint")}
            </p>
            <PlaybackVideo src={data.playbackUrl} maxHeightClass="max-h-[70vh]" />
          </details>
        ) : null}
      </div>

      {reportOpen ? (
        <ReportContentModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="full"
          targetOwnerUid={ownerUid}
          targetWorkId={workId}
        />
      ) : null}
    </main>
  );
}

type HeroCredit = { key: string; role: string; name: string; href: string | null };

const HERO_CREDIT_LIMIT = 4;

/** Director first, then the rest in credit order; at most four chips in the hero. */
function buildHeroCredits(
  credits: PublicWorkCredit[],
  director: string | undefined,
  t: (key: string, vars?: Record<string, string | number>) => string
): { visible: HeroCredit[]; hiddenCount: number } {
  const ordered = [...credits].sort(
    (a, b) => Number(b.role === "director") - Number(a.role === "director")
  );
  const all: HeroCredit[] = ordered.map((c) => ({
    key: c.id,
    role: t(`watch.creditRole.${c.role}`),
    name: c.displayName,
    href: c.profileHref,
  }));
  if (all.length === 0 && director?.trim()) {
    all.push({ key: "director", role: t("watch.creditRole.director"), name: director.trim(), href: null });
  }
  return { visible: all.slice(0, HERO_CREDIT_LIMIT), hiddenCount: Math.max(0, all.length - HERO_CREDIT_LIMIT) };
}
