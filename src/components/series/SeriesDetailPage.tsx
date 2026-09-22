"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import HeroCopy from "@/components/hero/HeroCopy";
import { IconPlay } from "@/components/icons/MockupIcons";
import { useCatalogFeed } from "@/hooks/useCatalogFeed";
import { MOCKUP_HOME } from "@/lib/mockupHomeSpec";
import { buildShowCatalog } from "@/lib/show/showAdapter";
import { buildSeriesCatalog } from "@/lib/series/seriesAdapter";
import {
  isCapturedCardArtwork,
  seriesThumbnailClassName,
} from "@/lib/series/thumbnailPresentation";
import { formatDurationMinutes, formatReleaseDate, gradientForTitle } from "@/lib/works/catalog-ui";
import type { SeriesEpisode } from "@/types/series";
import filmHeroImage from "../../../film_hero.webp";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";
import { useTranslations } from "@/context/LocaleContext";

const VIDEO_RATIO = { aspectRatio: "16 / 9" } as const;

function EpisodeImage({ episode, sizes }: { episode: SeriesEpisode; sizes: string }) {
  return episode.thumbnailUrl ? (
    <Image
      src={episode.thumbnailUrl}
      alt=""
      fill
      sizes={sizes}
      unoptimized
      className={seriesThumbnailClassName(episode.thumbnailUrl)}
    />
  ) : (
    <div className={`absolute inset-0 ${gradientForTitle(episode.title)}`} />
  );
}

function ContinueEpisodeCard({
  episode,
  progress,
  active,
  onSelect,
}: {
  episode: SeriesEpisode;
  progress: number;
  active: boolean;
  onSelect: () => void;
}) {
  const copy = useUiCopy();
  const remainingMinutes = Math.max(
    1,
    Math.round((episode.durationSec / 60) * (1 - progress / 100))
  );

  return (
    <button type="button" onClick={onSelect} className="group min-w-0 text-left">
      <div
        className={`relative w-full overflow-hidden rounded-xl border bg-white/[0.03] transition ${
          active ? "border-xiio-accent/70" : "border-white/[0.1] group-hover:border-white/25"
        }`}
        style={VIDEO_RATIO}
      >
        <EpisodeImage episode={episode} sizes="(min-width: 1280px) 25vw, 50vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3 pb-4">
          <p className="text-[10px] text-white/60">
            S{episode.seasonNumber} E{episode.episodeNumber}
          </p>
          <div className="mt-0.5 flex items-end justify-between gap-3">
            <p className="truncate text-[13px] font-semibold text-white">{episode.title}</p>
            <span className="shrink-0 text-[10px] text-white/55">{copy("{count} min left", { count: remainingMinutes })}</span>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
          <div className="h-full bg-xiio-accent" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </button>
  );
}

function EpisodeListRow({
  episode,
  selected,
  onSelect,
}: {
  episode: SeriesEpisode;
  selected: boolean;
  onSelect: () => void;
}) {
  const { locale: mediaLocale } = useTranslations();
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid w-full grid-cols-[96px_20px_minmax(0,1fr)_28px] items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition ${
        selected
          ? "border-white/15 bg-white/[0.06]"
          : "border-transparent hover:border-white/10 hover:bg-white/[0.025]"
      }`}
    >
      <div
        className="relative w-full overflow-hidden rounded-md border border-white/[0.07]"
        style={VIDEO_RATIO}
      >
        <EpisodeImage episode={episode} sizes="96px" />
      </div>
      <span className="text-center text-[12px] text-white/70">{episode.episodeNumber}</span>
      <span className="min-w-0">
        <strong className="block truncate text-[12px] font-semibold text-white/90">
          {episode.title}
        </strong>
        <small className="mt-0.5 block text-[10px] text-white/40">
          {formatDurationMinutes(episode.durationSec, mediaLocale)}
        </small>
      </span>
      <span
        className={`grid h-7 w-7 place-items-center rounded-full border text-[10px] ${
          selected
            ? "border-xiio-accent bg-xiio-accent text-white"
            : "border-white/20 text-white/75"
        }`}
      >
        {selected ? "✓" : "▶"}
      </span>
    </button>
  );
}

function EpisodeScrollList({
  episodes,
  selectedIndex,
  onSelect,
}: {
  episodes: SeriesEpisode[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const _copy = useUiCopy();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    node.scrollTop = 0;
    const frame = window.requestAnimationFrame(() => {
      setCanScrollDown(node.scrollHeight - node.clientHeight > 4);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [episodes]);

  return (
    <div className="relative min-h-0">
      <div
        ref={scrollRef}
        aria-label={_copy("Episode list")}
        className="grid max-h-[330px] content-start gap-1.5 overflow-y-auto pb-12 pr-2 [scrollbar-color:rgba(255,255,255,0.22)_transparent] [scrollbar-width:thin]"
        onScroll={(event) => {
          const node = event.currentTarget;
          setCanScrollDown(node.scrollHeight - node.scrollTop - node.clientHeight > 4);
        }}
      >
        {episodes.map((episode, index) => (
          <EpisodeListRow
            key={episode.id}
            episode={episode}
            selected={index === selectedIndex}
            onSelect={() => onSelect(index)}
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex h-16 items-end justify-center bg-gradient-to-t from-[#111216] via-[#111216]/95 to-transparent pb-1 transition-opacity duration-200 ${
          canScrollDown ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="rounded-full border border-white/12 bg-black/65 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/65 shadow-lg backdrop-blur-sm"><UiText text={"More episodes ↓"} /></span>
      </div>
    </div>
  );
}

type SeriesDetailPageProps = {
  seriesId: string;
  variant?: "series" | "show";
};

export default function SeriesDetailPage({
  seriesId,
  variant = "series",
}: SeriesDetailPageProps) {
  const { locale: mediaLocale } = useTranslations();
  const _copy = useUiCopy();
  const isShow = variant === "show";
  const { items } = useCatalogFeed(isShow ? "entertainment" : "series", 24);
  const catalog = useMemo(
    () => (isShow ? buildShowCatalog() : buildSeriesCatalog(items)),
    [isShow, items]
  );
  const series = catalog.find((candidate) => candidate.id === seriesId) ?? catalog[0];
  const [seasonIndex, setSeasonIndex] = useState(0);
  const [episodeIndex, setEpisodeIndex] = useState(4);
  const [playingEpisode, setPlayingEpisode] = useState<SeriesEpisode | null>(null);

  if (!series) return null;

  const season = series.seasons[seasonIndex] ?? series.seasons[0];
  const safeEpisodeIndex = Math.min(episodeIndex, Math.max(0, season.episodes.length - 1));
  const selectedEpisode = season.episodes[safeEpisodeIndex] ?? season.episodes[0];
  const allEpisodes = series.seasons.flatMap((candidate) => candidate.episodes);
  const latestEpisodes = [...allEpisodes]
    .sort(
      (a, b) =>
        new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime() ||
        b.seasonNumber - a.seasonNumber ||
        b.episodeNumber - a.episodeNumber
    )
    .slice(0, 4);
  const continueStart = Math.max(0, series.seasons[0].episodes.length - 4);
  const continueEpisodes = series.seasons[0].episodes.slice(continueStart, continueStart + 4);
  const progressValues = [62, 38, 76, 24];
  const heroImage = isShow
    ? series.seasons[0]?.episodes[0]?.thumbnailUrl ?? "/images/hero/show-catalog-v1.png"
    : filmHeroImage;

  const selectEpisode = (nextSeasonIndex: number, nextEpisodeIndex: number) => {
    setSeasonIndex(nextSeasonIndex);
    setEpisodeIndex(nextEpisodeIndex);
  };

  return (
    <main className={`min-h-screen min-w-0 w-full ${MOCKUP_HOME.pageShell}`}>
      <section className="relative isolate min-h-[650px] overflow-hidden">
        <Image
          src={heroImage}
          alt={isShow ? `${series.title} cast` : _copy("A drama character looking over a city at night")}
          fill
          priority
          placeholder={isShow ? "empty" : "blur"}
          unoptimized={isShow}
          sizes="(min-width: 1024px) calc(100vw - 220px), 100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,11,13,0.96)_0%,rgba(11,11,13,0.68)_40%,rgba(11,11,13,0.08)_75%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,13,0.03)_0%,rgba(11,11,13,0.12)_50%,#0b0b0d_100%)]" />

        <div className="relative z-10 min-h-[650px] px-4 pt-[54px] lg:px-12">
          <HeroCopy
            eyebrow={isShow ? _copy("Featured Show") : _copy("Featured Series")}
            title={series.title}
            description={
              <>
                <span className="mb-3 block text-[12px] tracking-[0.04em] text-white/55">
                  {isShow ? "2026" : "2024"} · {_copy(series.genre)} · {_copy(series.seasons.length === 1 ? "{count} season" : "{count} seasons", { count: series.seasons.length })} · {_copy(allEpisodes.length === 1 ? "{count} episode" : "{count} episodes", { count: allEpisodes.length })} · ★ 4.8</span>
                {series.synopsis}
              </>
            }
          >
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => selectedEpisode && setPlayingEpisode(selectedEpisode)}
                className="inline-flex h-12 items-center gap-2.5 rounded-full bg-[#f5f4f2] px-7 text-[14px] font-semibold text-[#0b0b0d] transition hover:bg-white"
              >
                <IconPlay className="h-3.5 w-3.5" /><UiText text={"Resume watching"} /></button>
              <Link
                href="/my-list"
                className="inline-flex h-12 items-center rounded-full border border-white/25 px-7 text-[14px] font-semibold text-white/85 transition hover:border-white/45 hover:bg-white/[0.05]"
              ><UiText text={"+ My List"} /></Link>
            </div>
          </HeroCopy>

          <div className="absolute inset-x-4 bottom-5 lg:inset-x-12">
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-white"><UiText text={"Continue Watching"} /></h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {continueEpisodes.map((episode, index) => {
                const actualIndex = continueStart + index;
                return (
                  <ContinueEpisodeCard
                    key={episode.id}
                    episode={episode}
                    progress={progressValues[index] ?? 25}
                    active={seasonIndex === 0 && safeEpisodeIndex === actualIndex}
                    onSelect={() => selectEpisode(0, actualIndex)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 bg-xiio-bg px-4 pb-16 pt-4 lg:px-12">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 lg:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-white"><UiText text={"Seasons & Episodes"} /></h2>
            <label className="relative">
              <span className="sr-only"><UiText text={"Select season"} /></span>
              <select
                value={seasonIndex}
                onChange={(event) => {
                  setSeasonIndex(Number(event.target.value));
                  setEpisodeIndex(0);
                }}
                className="h-8 appearance-none rounded-full border border-white/15 bg-[#111216] py-1 pl-3 pr-8 text-[11px] text-white/75 outline-none"
              >
                {series.seasons.map((candidate, index) => (
                  <option key={candidate.seasonNumber} value={index}>
                    {candidate.title}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/45">
                ▾
              </span>
            </label>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
            <div className="grid items-center gap-5 md:grid-cols-[minmax(280px,42%)_minmax(0,1fr)]">
              <div
                className="relative w-full overflow-hidden rounded-xl border border-white/[0.08]"
                style={VIDEO_RATIO}
              >
                <EpisodeImage episode={selectedEpisode} sizes="480px" />
              </div>
              <div className="min-w-0 py-1">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                  S{selectedEpisode.seasonNumber} E{selectedEpisode.episodeNumber}
                </p>
                <h3 className="mt-2 font-serif text-[26px] font-semibold leading-tight text-white">
                  {selectedEpisode.title}
                </h3>
                <p className="mt-2 text-[11px] text-white/45">
                  {formatDurationMinutes(selectedEpisode.durationSec, mediaLocale)}{" "}<UiText text={"· Released"} />{" "}{formatReleaseDate(selectedEpisode.releaseDate, mediaLocale)}
                </p>
                <p className="mt-3 max-w-[520px] text-[12.5px] leading-relaxed text-white/58">
                  {selectedEpisode.synopsis}
                </p>
                <button
                  type="button"
                  onClick={() => setPlayingEpisode(selectedEpisode)}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-[12.5px] font-semibold text-black transition hover:bg-white/90"
                >
                  <IconPlay className="h-3 w-3" /><UiText text={"Watch Episode"} /></button>
              </div>
            </div>

            <EpisodeScrollList
              episodes={season.episodes}
              selectedIndex={safeEpisodeIndex}
              onSelect={setEpisodeIndex}
            />
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-xiio-accent" />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white"><UiText text={"New Episodes This Week"} /></h2>
          </div>
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
            {latestEpisodes.map((episode) => (
              <button
                key={episode.id}
                type="button"
                onClick={() => setPlayingEpisode(episode)}
                className="group min-w-0 text-left"
              >
                <div
                  className="relative w-full overflow-hidden rounded-xl border border-white/[0.08] group-hover:border-white/20"
                  style={VIDEO_RATIO}
                >
                  <EpisodeImage episode={episode} sizes="25vw" />
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-xiio-accent px-2 py-1 text-[9px] font-bold text-white"><UiText text={"NEW"} /></span>
                </div>
                <p className="mt-2 truncate text-[13px] font-semibold text-white">{episode.title}</p>
                <p className="mt-1 text-[10.5px] text-white/40">
                  S{episode.seasonNumber} E{episode.episodeNumber} · {formatDurationMinutes(episode.durationSec, mediaLocale)}
                </p>
              </button>
            ))}
          </div>
        </section>
      </div>

      {playingEpisode?.videoUrl ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${playingEpisode.title} player`}
          onClick={() => setPlayingEpisode(null)}
        >
          <div className="w-full max-w-[1180px]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                  S{playingEpisode.seasonNumber} E{playingEpisode.episodeNumber}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">{playingEpisode.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPlayingEpisode(null)}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-xl text-white/75 transition hover:bg-white/10 hover:text-white"
                aria-label={_copy("Close player")}
              >
                ×
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
              <video
                key={playingEpisode.id}
                src={playingEpisode.videoUrl}
                poster={
                  isCapturedCardArtwork(playingEpisode.thumbnailUrl)
                    ? undefined
                    : playingEpisode.thumbnailUrl
                }
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="block w-full bg-black object-contain"
                style={VIDEO_RATIO}
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
