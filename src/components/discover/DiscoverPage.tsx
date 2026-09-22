"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import HomeContentRow from "@/components/home/HomeContentRow";
import HeroCopy, { HERO_COPY_STAGE_CLASS } from "@/components/hero/HeroCopy";
import SectionLabel from "@/components/layout/SectionLabel";
import { IconPlay } from "@/components/icons/MockupIcons";
import { useTranslations } from "@/context/LocaleContext";
import { useCatalogFeed } from "@/hooks/useCatalogFeed";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { usePromoFeed } from "@/hooks/usePromoFeed";
import { useSchoolsFeed } from "@/hooks/useSchoolsFeed";
import { catalogItemsToHomeStories, watchProgressItemsToHomeStories } from "@/lib/categoryCatalogAdapter";
import { peopleProfileHref } from "@/lib/dm/peopleProfileHref";
import { MOCKUP_CAMPUS } from "@/lib/mockupCampusSpec";
import { MOCKUP_HOME } from "@/lib/mockupHomeSpec";
import { schoolPosterGradient } from "@/lib/school-brand";
import { gradientForTitle, watchHref } from "@/lib/works/catalog-ui";
import type { CatalogFeedItem, PromoFeedItem } from "@/types/work";
import type { PromoShort } from "@/types/promoShort";
import type { SchoolListItem } from "@/types/school";
import discoverHeroImage from "../../../discover_hero.webp";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";

function FeaturedPromosRow({ items, t }: { items: PromoShort[]; t: (k: string) => string }) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className={MOCKUP_CAMPUS.sectionHeaderRow}>
        <SectionLabel>{t("discoverPage.mock.featuredPromos")}</SectionLabel>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {items.map((promo) => (
          <Link
            key={promo.id}
            href={promo.ownerUid && promo.workId ? watchHref(promo.ownerUid, promo.workId) : "/movies"}
            className="group shrink-0 w-[220px]"
          >
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-2.5">
              {promo.thumbnailUrl ? (
                <Image src={promo.thumbnailUrl} alt="" fill sizes="220px" className="object-cover" unoptimized />
              ) : (
                <div className={`absolute inset-0 ${gradientForTitle(promo.title)}`} />
              )}
              <div className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center">
                <IconPlay className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
            <p className="text-[14px] font-semibold text-white truncate">{promo.title}</p>
            <p className="text-[12px] text-white/40">{promo.director}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function DiscoverSchoolCard({ school }: { school: SchoolListItem }) {
  return (
    <Link
      href={`/school/${school.id}`}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 hover:border-white/20 transition"
    >
      {school.logoUrl ? (
        <div className="relative w-8 h-8 rounded-lg overflow-hidden mb-4 bg-black/30">
          <Image src={school.logoUrl} alt="" fill sizes="32px" className="object-contain p-1" unoptimized />
        </div>
      ) : (
        <div
          className="w-8 h-8 rounded-lg mb-4"
          style={{ background: schoolPosterGradient(school.colorPrimary, school.colorSecondary) }}
        />
      )}
      <p className="text-[14px] font-semibold text-white mb-0.5">{school.name}</p>
    </Link>
  );
}

type Props = {
  initialPromoItems?: PromoFeedItem[];
  initialMovies?: CatalogFeedItem[];
  initialSeries?: CatalogFeedItem[];
  schools?: SchoolListItem[];
};

function TrendingRow({ items, t }: { items: CatalogFeedItem[]; t: (k: string) => string }) {
  const ranked = [...items].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0)).slice(0, 6);
  if (ranked.length === 0) return null;
  return (
    <section>
      <div className={MOCKUP_CAMPUS.sectionHeaderRow}>
        <SectionLabel>{t("discoverPage.mock.trending")}</SectionLabel>
      </div>
      <div className="flex flex-col">
        {ranked.map((item, i) => (
          <Link
            key={item.id}
            href={watchHref(item.ownerUid, item.workId)}
            className="flex items-center gap-4 py-3 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.02] transition group"
          >
            <span className="font-serif text-2xl text-white/25 w-8 text-center shrink-0">{i + 1}</span>
            <div className={`relative w-[64px] aspect-[2/3] rounded-md overflow-hidden shrink-0 ${gradientForTitle(item.title)}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-white truncate group-hover:text-white">{item.title}</p>
              <p className="text-[11.5px] text-white/45 mt-0.5">{item.approvedCategory ?? item.section}</p>
            </div>
            {item.viewCount != null ? (
              <span className="text-[11px] text-white/35 shrink-0 tabular-nums">{item.viewCount.toLocaleString()}{" "}<UiText text={"views"} /></span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

function FeaturedCreatorSection({ item, t }: { item: CatalogFeedItem | undefined; t: (k: string) => string }) {
  if (!item?.director) return null;
  const href = peopleProfileHref(null, item.ownerUid);
  return (
    <section>
      <div className={MOCKUP_CAMPUS.sectionHeaderRow}>
        <SectionLabel>{t("discoverPage.mock.featuredCreator")}</SectionLabel>
      </div>
      <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className={`w-20 h-20 rounded-full shrink-0 ${gradientForTitle(item.director)}`} />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-xl font-semibold text-white">{item.director}</p>
          <p className="text-[13px] text-white/50 mt-1">
            {item.approvedCategory ?? item.section} · “{item.title}”</p>
        </div>
        {href ? (
          <Link
            href={href}
            className="shrink-0 rounded-full border border-white/20 px-4 py-2 text-[13px] font-medium text-white hover:bg-white/[0.06] transition"
          >
            {t("discoverPage.mock.viewProfile")}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export default function DiscoverPage({ initialPromoItems, initialMovies, initialSeries, schools }: Props) {
  const _copy = useUiCopy();
  const { t } = useTranslations();
  const { items: promoItems } = usePromoFeed({ fallbackToDemo: false, initialItems: initialPromoItems });
  const { items: movies } = useCatalogFeed("movies", 8, initialMovies);
  const { items: series } = useCatalogFeed("series", 8, initialSeries);
  const { items: schoolItems } = useSchoolsFeed(4, schools);
  const { items: continueWatchingItems } = useContinueWatching();

  const featuredPromos = useMemo(() => promoItems.slice(0, 6), [promoItems]);
  const combined = useMemo(() => [...movies, ...series], [movies, series]);
  const newThisWeekStories = useMemo(() => catalogItemsToHomeStories(combined.slice(0, 8)), [combined]);
  const continueWatchingStories = useMemo(
    () => watchProgressItemsToHomeStories(continueWatchingItems),
    [continueWatchingItems]
  );

  return (
    <main className={`min-h-screen min-w-0 w-full ${MOCKUP_HOME.pageShell}`}>
      <section className="relative isolate min-h-[560px] overflow-hidden">
        <Image
          src={discoverHeroImage}
          alt={_copy("A film crew shooting a stormy ocean scene at dusk")}
          fill
          priority
          unoptimized
          placeholder="blur"
          sizes="(min-width: 1024px) calc(100vw - 220px), 100vw"
          className="object-contain object-center 2xl:object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,11,13,0.78)_0%,rgba(11,11,13,0.34)_42%,rgba(11,11,13,0.02)_72%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-xiio-bg to-transparent" />
        <div className={HERO_COPY_STAGE_CLASS}>
          <HeroCopy
            eyebrow={t("discoverPage.mock.badge")}
            title={t("discoverPage.mock.heroTitle")}
            description={
              <>
                <span className="block">{t("discoverPage.mock.heroSubtitleLine1")}</span>
                <span className="block">{t("discoverPage.mock.heroSubtitleLine2")}</span>
              </>
            }
          />
        </div>
      </section>

      <div
        className={`relative z-10 bg-xiio-bg px-4 pt-11 lg:px-12 ${MOCKUP_HOME.pageShell} ${MOCKUP_HOME.contentBodyGuard} pb-16 flex flex-col gap-11`}
      >
        <FeaturedPromosRow items={featuredPromos} t={t} />

        {newThisWeekStories.length > 0 ? (
          <HomeContentRow
            title={t("discoverPage.mock.newThisWeek")}
            viewAllHref="/movies"
            viewAllLabel={t("discoverPage.mock.viewAll")}
            items={newThisWeekStories}
            variant="selects"
          />
        ) : null}

        <TrendingRow items={combined} t={t} />

        <FeaturedCreatorSection item={combined[0]} t={t} />

        {schoolItems.length > 0 ? (
          <section>
            <div className={MOCKUP_CAMPUS.sectionHeaderRow}>
              <SectionLabel>{t("discoverPage.mock.schoolsSpotlight")}</SectionLabel>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {schoolItems.slice(0, 4).map((school) => (
                <DiscoverSchoolCard key={school.id} school={school} />
              ))}
            </div>
          </section>
        ) : null}

        {continueWatchingStories.length > 0 ? (
          <HomeContentRow
            title={t("discoverPage.mock.continueWatching")}
            viewAllHref="/my-list"
            viewAllLabel={t("discoverPage.mock.viewAll")}
            items={continueWatchingStories}
            variant="featured"
          />
        ) : null}
      </div>
    </main>
  );
}
