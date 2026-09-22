"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { IconPlay, IconPlayOutline } from "@/components/icons/MockupIcons";
import { useTranslations } from "@/context/LocaleContext";
import { filmingLocationFor, languageFor, releaseDateFor } from "@/data/watchExtras";
import {
  formatDurationMinutes,
  formatReleaseDate,
  gradientForTitle,
  watchHref,
} from "@/lib/works/catalog-ui";
import { aspectRatioMessageKey } from "@/lib/works/aspect-ratio";
import { seriesThumbnailClassName } from "@/lib/series/thumbnailPresentation";
import type { SeriesDetail, SeriesEpisode } from "@/types/series";
import type { PublicWorkCredit } from "@/types/watch";
import type { VideoAspectRatio } from "@/types/work";
import UiText from "@/components/i18n/UiText";

type Props = {
  series: SeriesDetail;
  initialSeasonIndex: number;
  initialEpisodeIndex: number;
  currentOwnerUid: string;
  currentWorkId: string;
  approvedAspectRatio?: VideoAspectRatio;
  approvedSchoolId?: string;
  approvedSchoolName?: string;
  credits: PublicWorkCredit[];
  onPlayEpisode?: (episode: SeriesEpisode) => void;
};

function EpisodeThumb({ episode, className }: { episode: SeriesEpisode; className?: string }) {
  if (episode.thumbnailUrl) {
    return (
      <div className={`relative overflow-hidden ${className ?? ""}`}>
        <Image
          src={episode.thumbnailUrl}
          alt=""
          fill
          sizes="320px"
          className={seriesThumbnailClassName(episode.thumbnailUrl)}
          unoptimized
        />
      </div>
    );
  }
  return <div className={`${gradientForTitle(episode.title)} ${className ?? ""}`} />;
}

export default function SeriesEpisodePanel({
  series,
  initialSeasonIndex,
  initialEpisodeIndex,
  currentOwnerUid,
  currentWorkId,
  approvedAspectRatio,
  approvedSchoolId,
  approvedSchoolName,
  credits,
  onPlayEpisode,
}: Props) {
  const { locale: mediaLocale } = useTranslations();
  const { t } = useTranslations();
  const [seasonIndex, setSeasonIndex] = useState(initialSeasonIndex);
  const [episodeIndex, setEpisodeIndex] = useState(initialEpisodeIndex);

  const season = series.seasons[seasonIndex] ?? series.seasons[0];
  const episode = season.episodes[episodeIndex] ?? season.episodes[0];

  const flat = useMemo(
    () =>
      series.seasons.flatMap((s, sIdx) => s.episodes.map((ep, eIdx) => ({ ep, sIdx, eIdx }))),
    [series]
  );
  const flatIndex = flat.findIndex((f) => f.sIdx === seasonIndex && f.eIdx === episodeIndex);
  const prevFlat = flatIndex > 0 ? flat[flatIndex - 1] : null;
  const nextFlat = flatIndex >= 0 && flatIndex < flat.length - 1 ? flat[flatIndex + 1] : null;

  const goToFlat = (target: { sIdx: number; eIdx: number } | null) => {
    if (!target) return;
    setSeasonIndex(target.sIdx);
    setEpisodeIndex(target.eIdx);
  };

  const isNowPlaying = episode.ownerUid === currentOwnerUid && episode.workId === currentWorkId;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="font-serif text-xl md:text-2xl font-semibold text-white"><UiText text={"Episodes"} /></h2>
        {series.seasons.length > 1 ? (
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] p-1">
            {series.seasons.map((s, i) => (
              <button
                key={s.seasonNumber}
                type="button"
                onClick={() => {
                  setSeasonIndex(i);
                  setEpisodeIndex(0);
                }}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition ${
                  i === seasonIndex
                    ? "bg-white/[0.1] text-white"
                    : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="flex flex-col gap-2">
          {season.episodes.map((ep, i) => {
            const active = i === episodeIndex;
            const epIsNowPlaying = ep.ownerUid === currentOwnerUid && ep.workId === currentWorkId;
            return (
              <button
                key={ep.id}
                type="button"
                onClick={() => setEpisodeIndex(i)}
                className={`group flex items-start gap-3.5 rounded-xl p-2.5 text-left transition ${
                  active ? "bg-white/[0.06] border border-white/15" : "border border-transparent hover:bg-white/[0.03]"
                }`}
              >
                <EpisodeThumb
                  episode={ep}
                  className="relative w-[128px] shrink-0 aspect-video rounded-lg border border-white/[0.08]"
                />
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-2 text-[11px] text-white/40 mb-0.5">
                    <span><UiText text={"Episode"} />{" "}{ep.episodeNumber}</span>
                    <span aria-hidden>·</span>
                    <span>{formatDurationMinutes(ep.durationSec, mediaLocale)}</span>
                    {epIsNowPlaying ? (
                      <span className="text-xiio-accent font-semibold"><UiText text={"NOW PLAYING"} /></span>
                    ) : null}
                  </div>
                  <p className="text-[14px] font-semibold text-white leading-tight truncate">{ep.title}</p>
                  <p className="text-[12.5px] text-white/50 mt-1 line-clamp-2">{ep.synopsis}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:sticky lg:top-[90px] rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
          <div className="relative aspect-video">
            <EpisodeThumb episode={episode} className="absolute inset-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 text-[11px] text-white/60">
              S{episode.seasonNumber} · E{episode.episodeNumber} · {formatDurationMinutes(episode.durationSec, mediaLocale)}
            </div>
          </div>
          <div className="p-4">
            <p className="font-serif text-lg font-semibold text-white leading-snug">{episode.title}</p>
            <p className="text-[11px] text-white/40 mt-1">{formatReleaseDate(episode.releaseDate, mediaLocale)}</p>
            <p className="text-[13px] text-white/60 mt-2.5 leading-relaxed">{episode.synopsis}</p>

            <div className="flex items-center gap-2 mt-4">
              {episode.videoUrl && onPlayEpisode ? (
                <button
                  type="button"
                  onClick={() => onPlayEpisode(episode)}
                  className="inline-flex items-center gap-2 bg-white text-black font-semibold text-[13px] rounded-full px-4 py-2 hover:bg-white/90 transition"
                >
                  <IconPlay className="w-3 h-3" /><UiText text={"Watch Episode"} /></button>
              ) : !episode.workId ? (
                <span className="inline-flex items-center gap-2 bg-white/10 text-white/60 font-semibold text-[13px] rounded-full px-4 py-2 cursor-default"><UiText text={"Coming Soon"} /></span>
              ) : isNowPlaying ? (
                <span className="inline-flex items-center gap-2 bg-white/10 text-white/60 font-semibold text-[13px] rounded-full px-4 py-2 cursor-default">
                  <IconPlay className="w-3 h-3" /><UiText text={"Now Playing"} /></span>
              ) : (
                <Link
                  href={watchHref(episode.ownerUid, episode.workId)}
                  className="inline-flex items-center gap-2 bg-white text-black font-semibold text-[13px] rounded-full px-4 py-2 hover:bg-white/90 transition"
                >
                  <IconPlay className="w-3 h-3" /><UiText text={"Play"} /></Link>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                disabled={!prevFlat}
                onClick={() => goToFlat(prevFlat)}
                className="flex-1 text-center text-[12.5px] font-medium text-white/60 hover:text-white disabled:opacity-30 disabled:hover:text-white/60 rounded-lg py-1.5 border border-white/10 hover:bg-white/[0.04] transition"
              ><UiText text={"← Previous"} /></button>
              <button
                type="button"
                disabled={!nextFlat}
                onClick={() => goToFlat(nextFlat)}
                className="flex-1 text-center text-[12.5px] font-medium text-white/60 hover:text-white disabled:opacity-30 disabled:hover:text-white/60 rounded-lg py-1.5 border border-white/10 hover:bg-white/[0.04] transition"
              ><UiText text={"Next →"} /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-14">
        <h2 className="font-serif text-xl md:text-2xl font-semibold text-white mb-5">
          {t("watch.tabs.behindTheScenes")}
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`group relative shrink-0 w-[320px] aspect-video rounded-xl border border-white/[0.07] cursor-pointer overflow-hidden ${gradientForTitle(`${series.title}-bts-${i}`)}`}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <div className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center">
                  <IconPlayOutline className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {credits.length > 0 ? (
        <div className="mt-14">
          <h2 className="font-serif text-xl md:text-2xl font-semibold text-white mb-1.5">
            {t("watch.castCrew")}
          </h2>
          <p className="text-[13px] text-white/40 mb-6">{t("watch.tabs.creditsHint")}</p>
          <div className="flex gap-7 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
            {credits.map((c) => {
              const inner = (
                <>
                  <div
                    className={`w-[88px] h-[88px] rounded-full mx-auto mb-3 border border-white/10 flex items-center justify-center overflow-hidden ${gradientForTitle(c.displayName)}`}
                  >
                    <span className="font-serif text-2xl text-white/70">{c.displayName.charAt(0)}</span>
                  </div>
                  <p className="text-[13.5px] font-semibold text-white truncate">{c.displayName}</p>
                  <p className="text-[11.5px] text-white/40 capitalize truncate">
                    {c.characterName || t(`watch.creditRole.${c.role}`)}
                  </p>
                </>
              );
              return c.profileHref ? (
                <Link key={c.id} href={c.profileHref} className="shrink-0 w-[108px] text-center">
                  {inner}
                </Link>
              ) : (
                <div key={c.id} className="shrink-0 w-[108px] text-center">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-14 pt-11 border-t border-white/[0.08] grid lg:grid-cols-[1fr_200px] gap-10">
        <div>
          <h2 className="font-serif text-xl md:text-2xl font-semibold text-white mb-5">{t("watch.seriesInfo")}</h2>
          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <div className="flex justify-between py-2.5 border-b border-white/[0.06] text-[13.5px]">
                <span className="text-white/45">{t("watch.tabs.genre")}</span>
                <span className="text-white">{series.genre}</span>
              </div>
              <div className="flex justify-between py-2.5 border-b border-white/[0.06] text-[13.5px]">
                <span className="text-white/45">{t("watch.tabs.language")}</span>
                <span className="text-white">{languageFor(currentWorkId)}</span>
              </div>
              <div className="flex justify-between py-2.5 border-b border-white/[0.06] text-[13.5px]">
                <span className="text-white/45">{t("watch.seasons")}</span>
                <span className="text-white">{series.seasons.length}</span>
              </div>
              <div className="flex justify-between py-2.5 text-[13.5px]">
                <span className="text-white/45">{t("watch.episodes")}</span>
                <span className="text-white">
                  {series.seasons.reduce((n, s) => n + s.episodes.length, 0)}
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between py-2.5 border-b border-white/[0.06] text-[13.5px]">
                <span className="text-white/45">{t("watch.tabs.releaseDate")}</span>
                <span className="text-white">{releaseDateFor(currentWorkId)}</span>
              </div>
              <div className="flex justify-between py-2.5 border-b border-white/[0.06] text-[13.5px]">
                <span className="text-white/45">{t("watch.tabs.filmingLocation")}</span>
                <span className="text-white">{filmingLocationFor(currentWorkId)}</span>
              </div>
              {approvedAspectRatio ? (
                <div className="flex justify-between py-2.5 border-b border-white/[0.06] text-[13.5px]">
                  <span className="text-white/45">{t("watch.tabs.aspectRatio")}</span>
                  <span className="text-white">{t(aspectRatioMessageKey(approvedAspectRatio))}</span>
                </div>
              ) : null}
              {approvedSchoolId && approvedSchoolName ? (
                <Link
                  href={`/school/${approvedSchoolId}`}
                  className="flex justify-between py-2.5 text-[13.5px] hover:bg-white/[0.02] transition"
                >
                  <span className="text-white/45">{t("watch.tabs.school")}</span>
                  <span className="text-xiio-accent">{approvedSchoolName}</span>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
        <div className={`aspect-[2/3] rounded-xl border border-white/[0.08] ${gradientForTitle(series.title)}`} />
      </div>
    </section>
  );
}
