"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import AdminHomeColorPicker from "@/components/home/AdminHomeColorPicker";
import HomeContentRow from "@/components/home/HomeContentRow";
import HomeStoriesPanel, { type HomeStoryPanelItem } from "@/components/home/HomeStoriesPanel";
import HeroCopy, { HERO_COPY_STAGE_CLASS, HERO_SECTION_CLASS } from "@/components/hero/HeroCopy";
import { ButtonLink } from "@/components/ui/Button";
import Rail from "@/components/ui/Rail";
import SectionHeader from "@/components/ui/SectionHeader";
import WorkCard from "@/components/ui/WorkCard";
import { SequentialVideoLoadProvider } from "@/components/video/SequentialVideoLoadProvider";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { useCatalogFeed } from "@/hooks/useCatalogFeed";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { usePromoFeed } from "@/hooks/usePromoFeed";
import { useSchoolsFeed } from "@/hooks/useSchoolsFeed";
import { UPLOAD_HREF } from "@/lib/appNav";
import {
  catalogItemsToHomeStories,
  promoToHomeStory,
  watchProgressItemsToHomeStories,
} from "@/lib/categoryCatalogAdapter";
import { DEMO_MODE } from "@/lib/demoMode";
import { peopleProfileHref } from "@/lib/dm/peopleProfileHref";
import { SELECTS_STORIES, SURFACE_STORIES } from "@/lib/homeMockData";
import { plural } from "@/lib/i18nPlural";
import { schoolPosterGradient } from "@/lib/school-brand";
import { gradientForTitle, watchHref } from "@/lib/works/catalog-ui";
import type { CatalogFeedItem, PromoFeedItem } from "@/types/work";
import type { SchoolListItem } from "@/types/school";
import heroImage from "../../../discover_hero.webp";

type Props = {
  initialPromoItems?: PromoFeedItem[];
  initialMovies?: CatalogFeedItem[];
  initialSeries?: CatalogFeedItem[];
  schools?: SchoolListItem[];
};

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** Home + Discover merged: brand hero, then real works, people and schools. */
export default function HomeMockPage({
  initialPromoItems,
  initialMovies,
  initialSeries,
  schools,
}: Props) {
  const { t } = useTranslations();
  const { user } = useAuth();
  const { items: promoItems } = usePromoFeed({
    fallbackToDemo: false,
    initialItems: initialPromoItems,
  });
  const { items: movies } = useCatalogFeed("movies", 12, initialMovies);
  const { items: series } = useCatalogFeed("series", 12, initialSeries);
  const { items: entertainment } = useCatalogFeed("entertainment", 12);
  const { items: schoolItems } = useSchoolsFeed(6, schools);
  const { items: continueWatchingItems } = useContinueWatching();

  const catalog = useMemo(() => {
    const seen = new Set<string>();
    return [...movies, ...series, ...entertainment].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [movies, series, entertainment]);

  const newOnXiio = useMemo(() => {
    const live = catalogItemsToHomeStories(catalog.slice(0, 12));
    return live.length > 0 || !DEMO_MODE ? live : SURFACE_STORIES;
  }, [catalog]);

  const continueWatching = useMemo(
    () => watchProgressItemsToHomeStories(continueWatchingItems),
    [continueWatchingItems]
  );

  const promoStories = useMemo(
    () => promoItems.filter((p) => p.ownerUid && p.workId).map(promoToHomeStory),
    [promoItems]
  );

  const storyPanelItems: HomeStoryPanelItem[] = useMemo(
    () =>
      promoItems
        .filter((promo) => Boolean(promo.ownerUid && promo.workId))
        .slice(0, 5)
        .map((promo) => ({
          id: promo.id,
          title: promo.title,
          meta: promo.director,
          thumbnailUrl: promo.thumbnailUrl,
          videoUrl: promo.videoUrl,
          href: user ? watchHref(promo.ownerUid!, promo.workId!) : "/login",
        })),
    [promoItems, user]
  );

  const mostWatched = useMemo(
    () =>
      [...catalog]
        .filter((item) => (item.viewCount ?? 0) > 0)
        .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
        .slice(0, 5),
    [catalog]
  );

  const creators = useMemo(() => {
    const byOwner = new Map<string, { uid: string; name: string; works: number; title: string }>();
    for (const item of catalog) {
      const name = item.director?.trim();
      if (!name) continue;
      const existing = byOwner.get(item.ownerUid);
      if (existing) existing.works += 1;
      else byOwner.set(item.ownerUid, { uid: item.ownerUid, name, works: 1, title: item.title });
    }
    return Array.from(byOwner.values())
      .sort((a, b) => b.works - a.works)
      .slice(0, 8);
  }, [catalog]);

  const selects = DEMO_MODE ? SELECTS_STORIES : [];

  return (
    <SequentialVideoLoadProvider>
      <main className="min-h-screen w-full min-w-0">
        <section className={HERO_SECTION_CLASS}>
          <Image
            src={heroImage}
            alt="A film crew shooting a stormy ocean scene at dusk"
            fill
            priority
            unoptimized
            placeholder="blur"
            sizes="(min-width: 1024px) calc(100vw - 220px), 100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,11,13,0.9)_0%,rgba(11,11,13,0.55)_45%,rgba(11,11,13,0.1)_80%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-xiio-bg to-transparent" />

          <div
            className={`${HERO_COPY_STAGE_CLASS} lg:grid lg:grid-cols-[minmax(0,640px)_minmax(190px,1fr)] lg:items-center lg:gap-10`}
          >
            <HeroCopy
              eyebrow={t("ui.home.heroEyebrow")}
              title={t("ui.home.heroTitle")}
              description={t("ui.home.heroBody")}
            >
              <div className="flex flex-wrap items-center gap-3">
                <ButtonLink href="/movies" variant="primary" size="lg">
                  {t("ui.home.browseCta")}
                </ButtonLink>
                <ButtonLink href={user ? UPLOAD_HREF : "/login"} variant="secondary" size="lg">
                  {t("ui.home.uploadCta")}
                </ButtonLink>
              </div>
            </HeroCopy>

            {storyPanelItems.length > 0 ? (
              <div className="hidden justify-self-end lg:block">
                <HomeStoriesPanel label={t("home.mock.storiesLabel")} stories={storyPanelItems} />
              </div>
            ) : null}
          </div>
        </section>

        <div className="relative z-10 flex w-full min-w-0 flex-col gap-12 overflow-x-clip bg-xiio-bg px-4 pb-16 pt-4 lg:px-12 lg:pt-8">
          {continueWatching.length > 0 ? (
            <HomeContentRow
              title={t("ui.home.continueWatching")}
              viewAllHref="/my-list"
              viewAllLabel={t("ui.home.viewAll")}
              items={continueWatching}
            />
          ) : null}

          {promoStories.length > 0 ? (
            <section className="lg:hidden">
              <SectionHeader title={t("ui.home.promos")} />
              <Rail size="vertical" ariaLabel={t("ui.home.promos")}>
                {promoStories.map((story) => (
                  <WorkCard
                    key={story.id}
                    href={user ? story.href ?? "/movies" : "/login"}
                    title={story.title}
                    meta={story.duration}
                    imageUrl={story.imageUrl}
                    imageStyle={story.imageStyle}
                    ratio="vertical"
                  />
                ))}
              </Rail>
            </section>
          ) : null}

          {newOnXiio.length > 0 ? (
            <HomeContentRow
              title={t("ui.home.newOnXiio")}
              viewAllHref="/movies"
              viewAllLabel={t("ui.home.viewAll")}
              items={newOnXiio}
            />
          ) : null}

          {mostWatched.length > 0 ? <MostWatched items={mostWatched} t={t} /> : null}

          {creators.length > 0 ? <CreatorsToFollow creators={creators} t={t} /> : null}

          <SchoolsSpotlight schools={schoolItems} t={t} loggedIn={Boolean(user)} />

          {selects.length > 0 ? (
            <HomeContentRow
              title={t("ui.home.selects")}
              viewAllHref="/series"
              viewAllLabel={t("ui.home.viewAll")}
              items={selects}
            />
          ) : null}
        </div>

        <AdminHomeColorPicker />
      </main>
    </SequentialVideoLoadProvider>
  );
}

function MostWatched({ items, t }: { items: CatalogFeedItem[]; t: Translate }) {
  return (
    <section>
      <SectionHeader title={t("ui.home.mostWatched")} />
      <ol className="grid gap-x-10 md:grid-cols-2">
        {items.map((item, index) => (
          <li key={item.id} className="border-b border-line">
            <Link
              href={watchHref(item.ownerUid, item.workId)}
              className="group flex items-center gap-4 py-3 transition-colors hover:bg-white/[0.02]"
            >
              <span className="w-7 shrink-0 text-center font-serif text-h2 text-ink-4 tabular-nums">
                {index + 1}
              </span>
              <span className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-control ring-1 ring-inset ring-line">
                <span className={`absolute inset-0 ${gradientForTitle(item.title)}`} aria-hidden />
                {item.thumbnailUrl ? (
                  <Image src={item.thumbnailUrl} alt="" fill sizes="96px" unoptimized className="object-cover" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold text-ink">{item.title}</span>
                <span className="block truncate text-small text-ink-3">
                  {[item.approvedCategory, plural(t, "ui.home.views", item.viewCount ?? 0)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CreatorsToFollow({
  creators,
  t,
}: {
  creators: { uid: string; name: string; works: number; title: string }[];
  t: Translate;
}) {
  return (
    <section>
      <SectionHeader
        title={t("ui.home.creators")}
        action={{ href: "/society?tab=discover", label: t("ui.home.creatorsAction") }}
      />
      <Rail size="poster" ariaLabel={t("ui.home.creators")}>
        {creators.map((creator) => {
          const href = peopleProfileHref(null, creator.uid) ?? "/society";
          const initials = creator.name
            .split(/\s+/)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <Link
              key={creator.uid}
              href={href}
              className="group flex h-full flex-col items-center rounded-card border border-line bg-white/[0.02] px-3 py-5 text-center transition-colors hover:border-line-strong hover:bg-white/[0.04]"
            >
              <span
                className={`mb-3 flex h-16 w-16 items-center justify-center rounded-full text-h3 font-semibold text-ink ${gradientForTitle(creator.name)}`}
                aria-hidden
              >
                {initials}
              </span>
              <span className="w-full truncate text-body font-semibold text-ink">{creator.name}</span>
              <span className="mt-0.5 w-full truncate text-small text-ink-3">
                {plural(t, "ui.home.creatorWorks", creator.works)}
              </span>
              <span className="mt-3 text-small font-medium text-xiio-accent group-hover:text-xiio-accent-hover">
                {t("ui.home.viewProfile")}
              </span>
            </Link>
          );
        })}
      </Rail>
    </section>
  );
}

function SchoolsSpotlight({
  schools,
  t,
  loggedIn,
}: {
  schools: SchoolListItem[];
  t: Translate;
  loggedIn: boolean;
}) {
  return (
    <section>
      <SectionHeader
        title={t("ui.home.schools")}
        action={{ href: "/schools", label: t("ui.home.schoolsAction") }}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col justify-between gap-4 rounded-card border border-line bg-white/[0.02] p-5">
          <p className="text-body text-ink-2">{t("ui.home.schoolsBody")}</p>
          <ButtonLink
            href={loggedIn ? UPLOAD_HREF : "/login"}
            variant="secondary"
            size="md"
            className="self-start"
          >
            {t("ui.schools.uploadCta")}
          </ButtonLink>
        </div>
        {schools.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {schools.slice(0, 6).map((school) => (
              <li key={school.id}>
                <Link
                  href={`/school/${school.id}`}
                  className="flex h-full items-center gap-3 rounded-card border border-line bg-white/[0.02] p-3 transition-colors hover:border-line-strong hover:bg-white/[0.04]"
                >
                  {school.logoUrl ? (
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-control bg-black/30">
                      <Image src={school.logoUrl} alt="" fill sizes="40px" unoptimized className="object-contain p-1" />
                    </span>
                  ) : (
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-small font-bold text-ink"
                      style={{ background: schoolPosterGradient(school.colorPrimary, school.colorSecondary) }}
                    >
                      {school.initials}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-small font-semibold text-ink">
                      {school.shortName || school.name}
                    </span>
                    <span className="block truncate text-small text-ink-3">
                      {plural(t, "ui.schools.workCount", school.workCount ?? 0)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
