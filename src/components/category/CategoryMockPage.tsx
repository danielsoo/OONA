"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import ContentCard from "@/components/ContentCard";
import HomeContentRow from "@/components/home/HomeContentRow";
import HeroCopy, { HERO_COPY_STAGE_CLASS } from "@/components/hero/HeroCopy";
import SectionLabel from "@/components/layout/SectionLabel";
import { IconPlay } from "@/components/icons/MockupIcons";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { useCatalogFeed } from "@/hooks/useCatalogFeed";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { criticsQuoteFor } from "@/data/criticsQuotes";
import { watchProgressItemsToHomeStories } from "@/lib/categoryCatalogAdapter";
import { buildSeriesCatalog, newestEpisodesAcrossCatalog } from "@/lib/series/seriesAdapter";
import { MOCKUP_CAMPUS } from "@/lib/mockupCampusSpec";
import { MOCKUP_HOME } from "@/lib/mockupHomeSpec";
import { formatDurationMinutes, gradientForTitle, watchHref } from "@/lib/works/catalog-ui";
import type { CatalogFeedItem, WorkSection } from "@/types/work";
import type { SeriesDetail } from "@/types/series";
import filmHeroImage from "../../../film_hero.webp";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";

type CategoryVariant = "films" | "series" | "entertainment";

const VARIANT_CONFIG: Record<
  CategoryVariant,
  { section: WorkSection; viewAllHref: string }
> = {
  films: { section: "movies", viewAllHref: "/movies" },
  series: { section: "series", viewAllHref: "/series" },
  entertainment: { section: "entertainment", viewAllHref: "/entertainment" },
};

function CriticsPicksSection({ items, t }: { items: CatalogFeedItem[]; t: (k: string) => string }) {
  const picks = items.slice(0, 3);
  if (picks.length === 0) return null;
  return (
    <section>
      <div className={MOCKUP_CAMPUS.sectionHeaderRow}>
        <SectionLabel>{t("category.mock.criticsPicks")}</SectionLabel>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {picks.map((item) => {
          const { quote, source } = criticsQuoteFor(item.id);
          return (
            <Link
              key={item.id}
              href={watchHref(item.ownerUid, item.workId)}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-white/20 transition"
            >
              <p className="font-serif italic text-[17px] leading-snug text-white mb-3">“{quote}”</p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                {source} — {item.title}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function NewEpisodesRow({
  episodes,
  t,
  loggedIn,
}: {
  episodes: ReturnType<typeof newestEpisodesAcrossCatalog>;
  t: (k: string) => string;
  loggedIn: boolean;
}) {
  const { locale: mediaLocale } = useTranslations();
  if (episodes.length === 0) return null;
  return (
    <section>
      <div className={MOCKUP_CAMPUS.sectionHeaderRow}>
        <SectionLabel>{t("category.mock.newEpisodes")}</SectionLabel>
      </div>
      <div className="flex flex-col gap-2">
        {episodes.slice(0, 6).map((ep) => (
          <Link
            key={ep.id}
            href={loggedIn ? watchHref(ep.ownerUid, ep.workId) : "/login"}
            className="group flex items-center gap-3.5 rounded-xl p-2 hover:bg-white/[0.03] transition"
          >
            <div className="relative w-[104px] shrink-0 aspect-video rounded-lg overflow-hidden border border-white/[0.08]">
              {ep.thumbnailUrl ? (
                <Image src={ep.thumbnailUrl} alt="" fill sizes="104px" className="object-cover" unoptimized />
              ) : (
                <div className={`absolute inset-0 ${gradientForTitle(ep.title)}`} />
              )}
              <div className="absolute top-1.5 left-1.5 bg-xiio-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full"><UiText text={"NEW"} /></div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-white truncate">{ep.title}</p>
              <p className="text-[11.5px] text-white/45 mt-0.5">
                S{ep.seasonNumber} · E{ep.episodeNumber} · {formatDurationMinutes(ep.durationSec, mediaLocale)}
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[12px] font-medium text-white/80 group-hover:text-white group-hover:border-white/30 transition">
              <IconPlay className="w-2.5 h-2.5" /><UiText text={"Play"} /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function BingeCollectionsSection({
  seriesList,
  t,
  loggedIn,
}: {
  seriesList: SeriesDetail[];
  t: (k: string) => string;
  loggedIn: boolean;
}) {
  if (seriesList.length === 0) return null;
  return (
    <section>
      <div className={MOCKUP_CAMPUS.sectionHeaderRow}>
        <SectionLabel>{t("category.mock.bingeCollections")}</SectionLabel>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {seriesList.map((series) => {
          const firstPlayable = series.seasons
            .flatMap((s) => s.episodes)
            .find((ep) => ep.workId);
          const href = firstPlayable
            ? loggedIn
              ? watchHref(firstPlayable.ownerUid, firstPlayable.workId)
              : "/login"
            : "/series";
          const episodeCount = series.seasons.reduce((n, s) => n + s.episodes.length, 0);
          return (
            <Link
              key={series.id}
              href={href}
              className="group rounded-2xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition"
            >
              <div className="relative aspect-video">
                {firstPlayable?.thumbnailUrl ? (
                  <Image
                    src={firstPlayable.thumbnailUrl}
                    alt=""
                    fill
                    sizes="360px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className={`absolute inset-0 ${gradientForTitle(series.title)}`} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3">
                  <p className="font-serif text-[16px] font-semibold text-white leading-tight">{series.title}</p>
                  <p className="text-[11px] text-white/55 mt-0.5">
                    {series.seasons.length}{" "}<UiText text={"Seasons ·"} />{" "}{episodeCount}{" "}<UiText text={"Episodes"} /></p>
                </div>
              </div>
              <div className="p-3.5">
                <p className="text-[12.5px] text-white/55 line-clamp-2">{series.synopsis}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function CategoryMockPage({ variant }: { variant: CategoryVariant }) {
  const _copy = useUiCopy();
  const { t } = useTranslations();
  const { user } = useAuth();
  const config = VARIANT_CONFIG[variant];
  const i18n = `category.mock.${variant}` as const;
  const { items, loading } = useCatalogFeed(config.section, 12);
  const { items: continueWatchingAll } = useContinueWatching();

  const continueWatchingItems = useMemo(
    () => continueWatchingAll.filter((it) => it.section === config.section),
    [continueWatchingAll, config.section]
  );
  const continueWatchingStories = useMemo(
    () => watchProgressItemsToHomeStories(continueWatchingItems),
    [continueWatchingItems]
  );
  const newEpisodes = useMemo(
    () => (variant === "series" ? newestEpisodesAcrossCatalog(items, 8) : []),
    [variant, items]
  );
  const bingeSeries = useMemo(
    () => (variant === "series" ? buildSeriesCatalog(items) : []),
    [variant, items]
  );

  const featured = items[0];

  const watchHrefPrimary = user
    ? featured
      ? watchHref(featured.ownerUid, featured.workId)
      : config.viewAllHref
    : "/login";

  const hasHero = variant === "films";

  return (
    <main className={`min-h-screen min-w-0 w-full ${MOCKUP_HOME.pageShell}`}>
      {hasHero ? (
        <section className="relative isolate min-h-[560px] overflow-hidden">
          <Image
            src={filmHeroImage}
            alt={_copy("A young filmmaker looking across a city at night")}
            fill
            priority
            unoptimized
            placeholder="blur"
            sizes="(min-width: 1024px) calc(100vw - 220px), 100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,11,13,0.94)_0%,rgba(11,11,13,0.62)_40%,rgba(11,11,13,0.08)_72%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,13,0.06)_0%,rgba(11,11,13,0.1)_62%,#0b0b0d_100%)]" />
          <div className={HERO_COPY_STAGE_CLASS}>
            <HeroCopy
              eyebrow={t("category.mock.nowShowing")}
              eyebrowTone="gold"
              title="Undertow"
              description={
                <><UiText text={"A dockworker's daughter searches the harbor town for the truth about her father's last voyage. Shot over eleven nights on the Oregon coast."} /></>
              }
            >
              <Link
                href={watchHrefPrimary}
                className="inline-flex h-12 items-center gap-2.5 rounded-full bg-[#f5f4f2] px-7 text-[14px] font-semibold text-[#0b0b0d] transition hover:bg-white"
              >
                <IconPlay className="w-3.5 h-3.5" /><UiText text={"Play Feature"} /></Link>
            </HeroCopy>
          </div>
        </section>
      ) : (
        <div className="px-4 pt-8 lg:px-12">
          <h1 className="font-serif text-[32px] font-semibold text-white mt-6 mb-2">
            {t(`${i18n}.heroTitle`)}
          </h1>
          <p className="text-[14px] text-white/50 max-w-[560px] mb-10">
            <span>{t(`${i18n}.heroSubtitleLine1`)} </span>
            <span>{t(`${i18n}.heroSubtitleLine2`)}</span>
          </p>
        </div>
      )}

      <div
        className={`relative z-10 bg-xiio-bg px-4 ${hasHero ? "pt-11" : ""} lg:px-12 ${MOCKUP_HOME.pageShell} ${MOCKUP_HOME.contentBodyGuard} pb-16 flex flex-col gap-11`}
      >
        {variant === "series" && continueWatchingStories.length > 0 ? (
          <HomeContentRow
            title={t("category.mock.continueWatching")}
            viewAllHref="/my-list"
            viewAllLabel={t("home.mock.viewAll")}
            items={continueWatchingStories}
            variant="featured"
          />
        ) : null}

        {variant === "series" ? (
          <NewEpisodesRow episodes={newEpisodes} t={t} loggedIn={Boolean(user)} />
        ) : null}
        {variant === "series" ? (
          <BingeCollectionsSection seriesList={bingeSeries} t={t} loggedIn={Boolean(user)} />
        ) : null}

        <section>
          <div className={MOCKUP_CAMPUS.sectionHeaderRow}>
            <SectionLabel>{t(`${i18n}.allTitle`)}</SectionLabel>
          </div>

          {loading ? (
            <p className="text-white/45">{t("common.loading")}</p>
          ) : items.length === 0 ? (
            <p className="text-white/45">{t("catalog.empty")}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map((item) => (
                <ContentCard
                  key={item.id}
                  href={watchHref(item.ownerUid, item.workId)}
                  title={item.title}
                  contentCategory={item.approvedCategory}
                  tags={item.approvedTags}
                  thumbnailUrl={item.thumbnailUrl}
                  gradient={gradientForTitle(item.title)}
                />
              ))}
            </div>
          )}
        </section>

        {variant === "films" ? <CriticsPicksSection items={items} t={t} /> : null}
      </div>
    </main>
  );
}
