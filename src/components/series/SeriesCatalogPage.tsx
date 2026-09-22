"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import HeroCopy, { HERO_COPY_STAGE_CLASS } from "@/components/hero/HeroCopy";
import { IconPlay } from "@/components/icons/MockupIcons";
import SectionLabel from "@/components/layout/SectionLabel";
import { useAuth } from "@/context/AuthContext";
import { useCatalogFeed } from "@/hooks/useCatalogFeed";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { watchProgressItemsToHomeStories } from "@/lib/categoryCatalogAdapter";
import { buildSeriesCatalog, newestEpisodesAcrossCatalog } from "@/lib/series/seriesAdapter";
import { seriesThumbnailClassName } from "@/lib/series/thumbnailPresentation";
import { MOCKUP_HOME } from "@/lib/mockupHomeSpec";
import { formatDurationMinutes, gradientForTitle, watchHref } from "@/lib/works/catalog-ui";
import type { HomeStoryItem } from "@/lib/homeMockData";
import type { SeriesDetail, SeriesEpisode } from "@/types/series";
import filmHeroImage from "../../../film_hero.webp";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";
import { useTranslations } from "@/context/LocaleContext";

const VIDEO_RATIO_STYLE: CSSProperties = { aspectRatio: "16 / 9" };

function SeriesThumbnail({
  src,
  title,
  sizes,
  priority = false,
}: {
  src?: string | StaticImageData;
  title: string;
  sizes: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return <div className={`absolute inset-0 ${gradientForTitle(title)}`} />;
  }

  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={typeof src === "string"}
      className={seriesThumbnailClassName(typeof src === "string" ? src : undefined)}
      onError={() => setFailed(true)}
    />
  );
}

function LandscapeCard({
  href,
  title,
  subtitle,
  trailing,
  thumbnailUrl,
  videoUrl,
  progress,
  badge,
}: {
  href: string;
  title: string;
  subtitle: string;
  trailing?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  progress?: number;
  badge?: string;
}) {
  const [previewing, setPreviewing] = useState(false);

  return (
    <Link
      href={href}
      className="group block min-w-0"
      onPointerEnter={() => setPreviewing(true)}
      onPointerLeave={() => setPreviewing(false)}
      onFocus={() => setPreviewing(true)}
      onBlur={() => setPreviewing(false)}
    >
      <div
        className="relative w-full overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] transition duration-200 group-hover:-translate-y-0.5 group-hover:border-white/20 group-hover:shadow-xl group-hover:shadow-black/30"
        style={VIDEO_RATIO_STYLE}
      >
        <SeriesThumbnail src={thumbnailUrl} title={title} sizes="(min-width: 1280px) 20vw, 33vw" />
        {previewing && videoUrl ? (
          <video
            src={videoUrl}
            poster={thumbnailUrl}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
          />
        ) : null}
        <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/0" />
        <div className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-black shadow-lg">
            <IconPlay className="h-3.5 w-3.5" />
          </span>
        </div>
        {badge ? (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-xiio-accent px-2 py-1 text-[9px] font-bold tracking-[0.08em] text-white">
            {badge}
          </span>
        ) : null}
        {progress != null ? (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
            <div
              className="h-full bg-xiio-accent"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        ) : null}
      </div>
      <div className="min-h-[48px] px-0.5 pt-2">
        <p className="truncate text-[13.5px] font-semibold leading-tight text-white">{title}</p>
        <div className="mt-1 flex min-w-0 items-center justify-between gap-3 text-[11px] text-white/45">
          <span className="truncate">{subtitle}</span>
          {trailing ? <span className="shrink-0">{trailing}</span> : null}
        </div>
      </div>
    </Link>
  );
}

function SeriesCard({ series }: { series: SeriesDetail }) {
  const copy = useUiCopy();
  const firstEpisode = series.seasons.flatMap((season) => season.episodes)[0];
  const episodeCount = series.seasons.reduce((total, season) => total + season.episodes.length, 0);

  return (
    <LandscapeCard
      href={`/series/${series.id}`}
      title={series.title}
      subtitle={`${copy(series.seasons.length === 1 ? "{count} season" : "{count} seasons", { count: series.seasons.length })} · ${copy(episodeCount === 1 ? "{count} episode" : "{count} episodes", { count: episodeCount })} · ${copy(series.genre)}`}
      thumbnailUrl={firstEpisode?.thumbnailUrl}
      videoUrl={firstEpisode?.videoUrl}
    />
  );
}

function EpisodeCard({ episode, loggedIn }: { episode: SeriesEpisode; loggedIn: boolean }) {
  const { locale: mediaLocale } = useTranslations();
  const href = episode.workId
    ? loggedIn
      ? watchHref(episode.ownerUid, episode.workId)
      : "/login"
    : "/series";

  return (
    <LandscapeCard
      href={href}
      title={episode.title}
      subtitle={`S${episode.seasonNumber} E${episode.episodeNumber} · ${formatDurationMinutes(episode.durationSec, mediaLocale)}`}
      thumbnailUrl={episode.thumbnailUrl}
      videoUrl={episode.videoUrl}
      badge="NEW"
    />
  );
}

function ContinueCard({ item }: { item: HomeStoryItem }) {
  return (
    <LandscapeCard
      href={item.href ?? "/series"}
      title={item.title}
      subtitle={item.category}
      trailing={item.duration}
      thumbnailUrl={item.imageUrl}
      progress={item.progressPercent}
    />
  );
}

function CatalogSection({
  title,
  children,
  columns = 5,
}: {
  title: string;
  children: ReactNode;
  columns?: 4 | 5;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <SectionLabel>{title}</SectionLabel>
      </div>
      <div
        className={`grid grid-cols-2 gap-x-3.5 gap-y-5 md:grid-cols-3 ${
          columns === 4 ? "xl:grid-cols-4" : "xl:grid-cols-5"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

export default function SeriesCatalogPage() {
  const _copy = useUiCopy();
  const { user } = useAuth();
  const { items } = useCatalogFeed("series", 24);
  const { items: continueWatchingAll } = useContinueWatching();

  const seriesCatalog = useMemo(() => buildSeriesCatalog(items), [items]);
  const featured = seriesCatalog[0];
  const newEpisodes = useMemo(() => newestEpisodesAcrossCatalog(items, 5), [items]);
  const continueWatching = useMemo(
    () =>
      watchProgressItemsToHomeStories(
        continueWatchingAll.filter((item) => item.section === "series")
      ).slice(0, 4),
    [continueWatchingAll]
  );

  if (!featured) return null;

  const episodeCount = featured.seasons.reduce((total, season) => total + season.episodes.length, 0);

  return (
    <main className={`min-h-screen min-w-0 w-full ${MOCKUP_HOME.pageShell}`}>
      <section className="relative isolate min-h-[560px] overflow-hidden">
        <Image
          src={filmHeroImage}
          alt={_copy("A drama character looking over a city at night")}
          fill
          priority
          placeholder="blur"
          sizes="(min-width: 1024px) calc(100vw - 220px), 100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,11,13,0.96)_0%,rgba(11,11,13,0.69)_39%,rgba(11,11,13,0.08)_74%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,13,0.04)_0%,rgba(11,11,13,0.08)_62%,#0b0b0d_100%)]" />

        <div className={HERO_COPY_STAGE_CLASS}>
          <HeroCopy
            eyebrow={_copy("Featured Series")}
            title={featured.title}
            description={
              <>
                <span className="mb-3 block text-[12px] tracking-[0.04em] text-white/55">
                  2024 · {_copy(featured.genre)} · {_copy(featured.seasons.length === 1 ? "{count} season" : "{count} seasons", { count: featured.seasons.length })} · {_copy(episodeCount === 1 ? "{count} episode" : "{count} episodes", { count: episodeCount })} · ★ 4.8</span>
                {featured.synopsis}
              </>
            }
          >
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/series/${featured.id}`}
                className="inline-flex h-12 items-center gap-2.5 rounded-full bg-[#f5f4f2] px-7 text-[14px] font-semibold text-[#0b0b0d] transition hover:bg-white"
              >
                <IconPlay className="h-3.5 w-3.5" /><UiText text={"View Series"} /></Link>
              <Link
                href="/my-list"
                className="inline-flex h-12 items-center rounded-full border border-white/25 px-7 text-[14px] font-semibold text-white/85 transition hover:border-white/45 hover:bg-white/[0.05]"
              ><UiText text={"+ My List"} /></Link>
            </div>
          </HeroCopy>
        </div>

        <div className="absolute bottom-12 right-6 z-10 flex items-center gap-2 text-[11px] text-white/60 lg:right-12">
          <span className="mr-1 text-white/75">1 / 5</span>
          <span className="h-[2px] w-8 bg-xiio-accent" />
          {[0, 1, 2, 3].map((value) => (
            <span key={value} className="h-[2px] w-8 bg-white/20" />
          ))}
        </div>
      </section>

      <div className="relative z-10 flex min-w-0 max-w-full flex-col gap-10 overflow-x-clip bg-xiio-bg px-4 pb-16 pt-10 lg:px-12">
        {continueWatching.length > 0 ? (
          <CatalogSection title={_copy("Continue Watching")} columns={4}>
            {continueWatching.map((item) => (
              <ContinueCard key={item.id} item={item} />
            ))}
          </CatalogSection>
        ) : null}

        <CatalogSection title={_copy("Featured Dramas")}>
          {seriesCatalog.slice(0, 5).map((series) => (
            <SeriesCard key={series.id} series={series} />
          ))}
        </CatalogSection>

        {newEpisodes.length > 0 ? (
          <CatalogSection title={_copy("New Episodes This Week")}>
            {newEpisodes.map((episode) => (
              <EpisodeCard key={episode.id} episode={episode} loggedIn={Boolean(user)} />
            ))}
          </CatalogSection>
        ) : null}

        <CatalogSection title={_copy("All Series")}>
          {seriesCatalog.slice(1, 6).map((series) => (
            <SeriesCard key={series.id} series={series} />
          ))}
        </CatalogSection>
      </div>
    </main>
  );
}
