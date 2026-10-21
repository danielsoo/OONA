"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { useCatalogFeed } from "@/hooks/useCatalogFeed";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { usePromoFeed } from "@/hooks/usePromoFeed";
import { useSchoolsFeed } from "@/hooks/useSchoolsFeed";
import { UPLOAD_HREF } from "@/lib/appNav";
import { peopleProfileHref } from "@/lib/dm/peopleProfileHref";
import { formatCompactStat } from "@/lib/formatStat";
import { schoolPosterGradient } from "@/lib/school-brand";
import { fillCatalogItems, uniqueCatalogItems } from "@/lib/showcaseCatalog";
import { promoCropToVideoStyle } from "@/lib/works/promo-crop-interaction";
import { watchHref } from "@/lib/works/catalog-ui";
import type { PromoShort } from "@/types/promoShort";
import type { SchoolListItem } from "@/types/school";
import type { CatalogFeedItem, WatchProgressItem } from "@/types/work";
import styles from "./CinematicHomePage.module.css";
import UiText, { useUiCopy } from "@/components/i18n/UiText";

type HeroSlide = {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
};

type DisplayCard = {
  id: string;
  title: string;
  meta: string;
  image: string;
  href: string;
  imageStyle?: CSSProperties;
  progressPercent?: number;
  spaced?: boolean;
};

const heroSlides: HeroSlide[] = [
  {
    eyebrow: "Emerging creators",
    title: "Ideas\nin Motion.",
    body: "Watch. Share. Be part of what’s next.",
    href: "/movies",
    cta: "Explore Films",
  },
  {
    eyebrow: "Stories on the surface",
    title: "Find a new\npoint of view.",
    body: "Original work from the next generation of filmmakers.",
    href: "/discover",
    cta: "Start Discovering",
  },
  {
    eyebrow: "A world in progress",
    title: "Meet the\nnext voices.",
    body: "Follow creators and connect with a global community.",
    href: "/society",
    cta: "Meet Creators",
  },
  {
    eyebrow: "Made everywhere",
    title: "Create.\nConnect. Grow.",
    body: "Explore work from schools around the world.",
    href: "/schools",
    cta: "Explore Schools",
  },
];

const fallbackImages = [
  "/images/hero/home-under-water.png",
  "/images/hero/home-wave.png",
  "/images/hero/campus-wave1.png",
  "/images/hero/campus-wave2.png",
  "/images/hero/campus-wave3.png",
  "/images/hero/show-catalog-v1.png",
];

function ArrowIcon({ direction = "right" }: { direction?: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path d={direction === "right" ? "M8 4l8 8-8 8" : "M16 4l-8 8 8 8"} />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path d="M12 18V5M7 10l5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function fallbackImage(index: number): string {
  return fallbackImages[index % fallbackImages.length]!;
}

function catalogToCard(item: CatalogFeedItem, index: number, copy: ReturnType<typeof useUiCopy>): DisplayCard {
  const views = item.viewCount ?? 0;
  return {
    id: item.id,
    title: item.title,
    meta: views > 0 ? copy(views === 1 ? "{count} view" : "{count} views", { count: formatCompactStat(views) }) : item.director?.trim() || (item.approvedCategory ? copy(item.approvedCategory) : "OONA"),
    image: item.thumbnailUrl || fallbackImage(index),
    href: watchHref(item.ownerUid, item.workId),
    imageStyle: item.thumbnailCrop ? promoCropToVideoStyle(item.thumbnailCrop) : undefined,
  };
}

function progressToCard(item: WatchProgressItem, index: number, copy: ReturnType<typeof useUiCopy>): DisplayCard {
  return {
    ...catalogToCard(item, index, copy),
    meta: copy("{percent}% watched", { percent: Math.max(1, Math.round(item.progressPercent)) }),
    progressPercent: item.progressPercent,
  };
}

function promoToCard(item: PromoShort, index: number, copy: ReturnType<typeof useUiCopy>): DisplayCard | null {
  if (!item.ownerUid || !item.workId) return null;
  return {
    id: item.id,
    title: item.title,
    meta: item.director?.trim() || copy("Short"),
    image: item.thumbnailUrl || fallbackImage(index + 2),
    href: watchHref(item.ownerUid, item.workId),
    imageStyle: item.frameCrop ? promoCropToVideoStyle(item.frameCrop) : undefined,
  };
}

function SectionHeading({ children, href }: { children: ReactNode; href: string }) {
  return (
    <div className={styles.sectionHeader}>
      <Link href={href} prefetch={false}>{children}<ArrowIcon /></Link>
    </div>
  );
}

function FilmSection({
  title,
  href,
  items,
  loading = false,
}: {
  title: string;
  href: string;
  items: DisplayCard[];
  loading?: boolean;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const copy = useUiCopy();
  const scrollRail = () => {
    railRef.current?.scrollBy({
      left: Math.max(260, railRef.current.clientWidth * 0.72),
      behavior: "smooth",
    });
  };

  return (
    <section className={styles.section}>
      <SectionHeading href={href}>{copy(title)}</SectionHeading>
      <div className={styles.railWrap}>
        <div ref={railRef} className={styles.trendingRail}>
          {loading && items.length === 0
            ? Array.from({ length: 6 }, (_, index) => (
                <span key={index} className={styles.filmCardSkeleton} aria-hidden="true" />
              ))
            : null}
          {items.map((item) => <PreviewFilmCard key={item.id} item={item} />)}
        </div>
        {items.length > 5 ? (
          <button type="button" className={styles.railButton} onClick={scrollRail} aria-label={copy("See more {title}", { title: copy(title) })}>
            <ArrowIcon />
          </button>
        ) : null}
      </div>
    </section>
  );
}

// No hover video: catalog items carry no preview clip of their own (the
// placeholder sample clips that played here were not the works).
function PreviewFilmCard({ item }: { item: DisplayCard }) {
  return (
    <Link href={item.href} prefetch={false} className={styles.filmCard}>
      <Image
        src={item.image}
        alt=""
        fill
        unoptimized={item.image.startsWith("http://") || item.image.startsWith("https://")}
        sizes="(max-width: 760px) 72vw, 230px"
        className={styles.cardImage}
        style={item.imageStyle}
      />
      <span className={styles.cardShade} aria-hidden="true" />
      <span className={`${styles.cardTitle} ${item.spaced ? styles.spacedTitle : ""}`}>{item.title}</span>
      <span className={styles.duration}>{item.meta}</span>
      {item.progressPercent !== undefined ? (
        <span className={styles.progressTrack} aria-hidden="true">
          <span style={{ width: `${Math.min(100, Math.max(0, item.progressPercent))}%` }} />
        </span>
      ) : null}
    </Link>
  );
}

function SchoolCard({ school }: { school: SchoolListItem }) {
  const copy = useUiCopy();
  return (
    <Link href={`/school/${school.id}`} className={styles.schoolCard}>
      {school.logoUrl ? (
        <span className={styles.schoolLogo}>
          <Image src={school.logoUrl} alt="" fill unoptimized sizes="48px" className={styles.schoolLogoImage} />
        </span>
      ) : (
        <span
          className={styles.schoolInitials}
          style={{ background: schoolPosterGradient(school.colorPrimary, school.colorSecondary) }}
        >
          {school.initials}
        </span>
      )}
      <span className={styles.schoolCopy}>
        <strong>{school.shortName || school.name}</strong>
        <small>{copy(school.workCount === 1 ? "{count} work" : "{count} works", { count: formatCompactStat(school.workCount ?? 0) })}</small>
      </span>
      <ArrowIcon />
    </Link>
  );
}

export default function CinematicHomePage() {
  const _copy = useUiCopy();
  const copy = useUiCopy();
  const { user } = useAuth();
  const { items: movies, loading: moviesLoading } = useCatalogFeed("movies", 12);
  const { items: series, loading: seriesLoading } = useCatalogFeed("series", 12);
  const { items: entertainment, loading: entertainmentLoading } = useCatalogFeed("entertainment", 12);
  const { items: promoItems } = usePromoFeed({ fallbackToDemo: false });
  const { items: continueWatchingItems } = useContinueWatching();
  const { items: schoolItems } = useSchoolsFeed(6);
  const [heroIndex, setHeroIndex] = useState(0);
  const activeHero = heroSlides[heroIndex]!;

  const catalog = useMemo(() => {
    return uniqueCatalogItems([...movies, ...series, ...entertainment]);
  }, [entertainment, movies, series]);

  const trendingCards = useMemo(() => {
    const live = fillCatalogItems([...catalog]
      .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
      .slice(0, 12), 12)
      .map((item, index) => catalogToCard(item, index, copy));
    return live;
  }, [catalog, copy]);

  const catalogLoading = moviesLoading || seriesLoading || entertainmentLoading;

  const continueCards = useMemo(
    () => continueWatchingItems.slice(0, 12).map((item, index) => progressToCard(item, index, copy)),
    [continueWatchingItems, copy]
  );

  const shortCards = useMemo(() => {
    const promos = promoItems
      .map((item, index) => promoToCard(item, index, copy))
      .filter((item): item is DisplayCard => item !== null)
      .map((item) => ({ ...item, id: `promo-${item.id}` }))
      .slice(0, 12);
    const catalogFallbacks = fillCatalogItems(catalog, 12)
      .map((item, index) => catalogToCard(item, index, copy))
      .map((item) => ({ ...item, id: `catalog-${item.id}` }));
    return [...promos, ...catalogFallbacks].slice(0, 12);
  }, [catalog, promoItems, copy]);

  const creators = useMemo(() => {
    const result = new Map<string, { uid: string; name: string; works: number }>();
    for (const item of catalog) {
      const name = item.director?.trim();
      if (!name) continue;
      const current = result.get(item.ownerUid);
      if (current) current.works += 1;
      else result.set(item.ownerUid, { uid: item.ownerUid, name, works: 1 });
    }
    return Array.from(result.values()).sort((a, b) => b.works - a.works).slice(0, 6);
  }, [catalog]);

  const changeHero = (delta: number) => {
    setHeroIndex((current) => (current + delta + heroSlides.length) % heroSlides.length);
  };

  const authHref = (href: string) => user ? href : "/login";

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{copy(activeHero.eyebrow)}</p>
          <h1>{copy(activeHero.title).split("\n").map((line) => <span key={line}>{line}</span>)}</h1>
          <p className={styles.heroBody}>{copy(activeHero.body)}</p>
          <div className={styles.heroActions}>
            <Link href={activeHero.href} prefetch={false} className={styles.primaryButton}>
              {copy(activeHero.cta)}
              <ArrowIcon />
            </Link>
            <Link href={authHref(UPLOAD_HREF)} prefetch={false} className={styles.uploadButton}>
              <UploadIcon /><UiText text={"Upload"} /></Link>
          </div>
        </div>

        <aside className={styles.heroAside}>
          <p><UiText text={"More voices."} /><br /><UiText text={"A brighter"} /><br /><UiText text={"tomorrow."} /></p>
          <span />
        </aside>

        <div className={styles.heroPager}>
          <span>{String(heroIndex + 1).padStart(2, "0")} / {String(heroSlides.length).padStart(2, "0")}</span>
          <button type="button" onClick={() => changeHero(-1)} aria-label={_copy("Previous hero")}>
            <ArrowIcon direction="left" />
          </button>
          <i aria-hidden="true" />
          <button type="button" onClick={() => changeHero(1)} aria-label={_copy("Next hero")}>
            <ArrowIcon />
          </button>
        </div>
      </section>

      <div className={styles.content}>
        {continueCards.length > 0 ? (
          <FilmSection title={_copy("Continue Watching")} href="/my-list" items={continueCards} />
        ) : null}

        <FilmSection title={_copy("Trending on OONA")} href="/discover" items={trendingCards} loading={catalogLoading} />

        {shortCards.length > 0 ? (
          <FilmSection title={_copy("Fresh Shorts")} href="/shorts" items={shortCards} />
        ) : null}

        {creators.length > 0 ? (
          <section className={styles.section}>
            <SectionHeading href="/society?tab=discover"><UiText text={"Creators to Watch"} /></SectionHeading>
            <div className={styles.creatorGrid}>
              {creators.map((creator) => {
                const initials = creator.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <Link key={creator.uid} href={peopleProfileHref(null, creator.uid) ?? "/society"} prefetch={false} className={styles.creatorCard}>
                    <span className={styles.creatorAvatar}>{initials}</span>
                    <span>
                      <strong>{creator.name}</strong>
                      <small>{copy(creator.works === 1 ? "{count} work" : "{count} works", { count: creator.works })}</small>
                    </span>
                    <ArrowIcon />
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {schoolItems.length > 0 ? (
          <section className={styles.section}>
            <SectionHeading href="/schools"><UiText text={"Schools Across OONA"} /></SectionHeading>
            <div className={styles.schoolGrid}>
              {schoolItems.slice(0, 6).map((school) => <SchoolCard key={school.id} school={school} />)}
            </div>
          </section>
        ) : null}

        <footer className={styles.footer}>
          <p><UiText text={"A global community"} /><br /><UiText text={"of student creators."} /></p>
          <span className={styles.footerLine} aria-hidden="true" />
          <p className={styles.footerMotto}><UiText text={"Different places."} /><br /><UiText text={"Same creative tide."} /></p>
        </footer>
      </div>
    </main>
  );
}
