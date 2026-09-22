"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import HeroCopy, { HERO_COPY_STAGE_CLASS } from "@/components/hero/HeroCopy";
import { IconPlay } from "@/components/icons/MockupIcons";
import SectionLabel from "@/components/layout/SectionLabel";
import { MOCKUP_HOME } from "@/lib/mockupHomeSpec";
import { seriesThumbnailClassName } from "@/lib/series/thumbnailPresentation";
import { buildShowCatalog } from "@/lib/show/showAdapter";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";

type ShowItem = {
  id: string;
  title: string;
  seasonCount: number;
  episodeCount: number;
  format: string;
  thumbnailUrl: string;
  videoUrl?: string;
  badge?: string;
};

const VIDEO_RATIO = { aspectRatio: "16 / 9" } as const;

const SHOW_BADGES: Record<string, string> = {
  "off-script": "FEATURED",
  "campus-kitchen": "NEW",
  roommates: "NEW SEASON",
};

const SHOWS: ShowItem[] = buildShowCatalog().map((show) => {
  const episodeCount = show.seasons.reduce(
    (total, season) => total + season.episodes.length,
    0
  );
  const firstEpisode = show.seasons[0]?.episodes[0];

  return {
    id: show.id,
    title: show.title,
    seasonCount: show.seasons.length,
    episodeCount,
    format: show.genre,
    thumbnailUrl: firstEpisode?.thumbnailUrl ?? "/images/hero/show-catalog-v1.png",
    videoUrl: firstEpisode?.videoUrl,
    badge: SHOW_BADGES[show.id],
  };
});

function ShowThumbnail({ item, sizes }: { item: ShowItem; sizes: string }) {
  return (
    <Image
      src={item.thumbnailUrl}
      alt=""
      fill
      sizes={sizes}
      unoptimized
      className={seriesThumbnailClassName(item.thumbnailUrl)}
    />
  );
}

function ShowCard({
  item,
  rank,
}: {
  item: ShowItem;
  rank?: number;
}) {
  const copy = useUiCopy();
  const [previewing, setPreviewing] = useState(false);

  return (
    <Link
      href={`/entertainment/${item.id}`}
      className="group min-w-0 text-left"
      onPointerEnter={() => setPreviewing(true)}
      onPointerLeave={() => setPreviewing(false)}
      onFocus={() => setPreviewing(true)}
      onBlur={() => setPreviewing(false)}
    >
      <div
        className="relative w-full overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] transition duration-200 group-hover:-translate-y-0.5 group-hover:border-white/20 group-hover:shadow-xl group-hover:shadow-black/30"
        style={VIDEO_RATIO}
      >
        <ShowThumbnail item={item} sizes="(min-width: 1280px) 20vw, 34vw" />
        {previewing && item.videoUrl ? (
          <video
            src={item.videoUrl}
            poster={item.thumbnailUrl}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/5" />
        {rank ? (
          <span className="absolute bottom-1 left-3 font-serif text-[42px] font-semibold leading-none text-white drop-shadow-lg">
            {rank}
          </span>
        ) : null}
        {item.badge ? (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-xiio-accent px-2 py-1 text-[9px] font-bold tracking-[0.06em] text-white">
            {copy(item.badge)}
          </span>
        ) : null}
        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/45 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
          <IconPlay className="h-3 w-3" />
        </span>
      </div>
      <div className="min-h-[50px] pt-2">
        <p className="truncate text-[13.5px] font-semibold text-white">{item.title}</p>
        <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-white/42">
          <span className="truncate">{copy(item.seasonCount === 1 ? "{count} season" : "{count} seasons", { count: item.seasonCount })} · {copy(item.episodeCount === 1 ? "{count} episode" : "{count} episodes", { count: item.episodeCount })}</span>
          <span className="shrink-0">{copy(item.format)}</span>
        </div>
      </div>
    </Link>
  );
}

function ShowSection({
  title,
  items,
  ranked = false,
}: {
  title: string;
  items: ShowItem[];
  ranked?: boolean;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <SectionLabel>{title}</SectionLabel>
        <span className="text-[11px] text-white/35"><UiText text={"View all"} /></span>
      </div>
      <div className="grid grid-cols-2 gap-x-3.5 gap-y-5 md:grid-cols-3 xl:grid-cols-5">
        {items.map((item, index) => (
          <ShowCard
            key={item.id}
            item={item}
            rank={ranked ? index + 1 : undefined}
          />
        ))}
      </div>
    </section>
  );
}

export default function ShowCatalogPage() {
  const _copy = useUiCopy();
  const featured = SHOWS[0];

  return (
    <main className={`min-h-screen min-w-0 w-full ${MOCKUP_HOME.pageShell}`}>
      <section className="relative isolate min-h-[560px] overflow-hidden">
        <Image
          src="/images/hero/show-catalog-v1.png"
          alt={_copy("A young cast playing a team challenge in a studio show")}
          fill
          priority
          unoptimized
          sizes="(min-width: 1024px) calc(100vw - 220px), 100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,11,13,0.97)_0%,rgba(11,11,13,0.73)_36%,rgba(11,11,13,0.08)_72%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,13,0.02)_0%,rgba(11,11,13,0.06)_58%,#0b0b0d_100%)]" />

        <div className={HERO_COPY_STAGE_CLASS}>
          <HeroCopy
            eyebrow={_copy("Featured Show")}
            title="Off Script"
            description={
              <><UiText text={"Five creators. One unpredictable challenge. No rehearsals, no second takes — just the moment as it happens."} /></>
            }
          >
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/entertainment/${featured.id}`}
                className="inline-flex h-12 items-center gap-2.5 rounded-full bg-[#f5f4f2] px-7 text-[14px] font-semibold text-[#0b0b0d] transition hover:bg-white"
              >
                <IconPlay className="h-3.5 w-3.5" /><UiText text={"View Show"} /></Link>
              <Link
                href="/my-list"
                className="inline-flex h-12 items-center rounded-full border border-white/25 px-7 text-[14px] font-semibold text-white/85 transition hover:border-white/45 hover:bg-white/[0.05]"
              ><UiText text={"+ My List"} /></Link>
            </div>
          </HeroCopy>
        </div>
      </section>

      <div className="relative z-10 flex min-w-0 flex-col gap-10 overflow-x-clip bg-xiio-bg px-4 pb-16 pt-10 lg:px-12">
        <ShowSection title={_copy("Trending Shows")} items={SHOWS.slice(0, 5)} ranked />
        <ShowSection title={_copy("New & Returning Shows")} items={SHOWS.slice(5, 10)} />
        <ShowSection
          title={_copy("Campus Favorites")}
          items={[SHOWS[2], SHOWS[5], SHOWS[1], SHOWS[8], SHOWS[3]]}
        />
      </div>
    </main>
  );
}
