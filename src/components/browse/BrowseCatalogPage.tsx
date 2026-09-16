"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, type CSSProperties } from "react";
import HomeContentRow from "@/components/home/HomeContentRow";
import EmptyState from "@/components/ui/EmptyState";
import WorkCard from "@/components/ui/WorkCard";
import { useAuth } from "@/context/AuthContext";
import { useCatalogFeed } from "@/hooks/useCatalogFeed";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { useShowcaseCatalog } from "@/hooks/useShowcaseCatalog";
import { SERIES_MOCK_VIDEO_URLS } from "@/data/seriesMockMedia";
import { UPLOAD_HREF } from "@/lib/appNav";
import { watchProgressItemsToHomeStories } from "@/lib/categoryCatalogAdapter";
import { promoCropToVideoStyle } from "@/lib/works/promo-crop-interaction";
import { watchHref } from "@/lib/works/catalog-ui";
import type { CatalogFeedItem, WorkSection } from "@/types/work";
import styles from "./BrowseCatalogPage.module.css";

type Section = Extract<WorkSection, "movies" | "series" | "entertainment">;

type Props = {
  section: Section;
};

const COPY: Record<Section, {
  eyebrow: string;
  title: string;
  description: string;
  primarySection: string;
  secondarySection: string;
  cta: string;
}> = {
  movies: {
    eyebrow: "Featured film",
    title: "Films",
    description: "Independent stories, told by the next generation of filmmakers.",
    primarySection: "New voices",
    secondarySection: "Curated for tonight",
    cta: "Watch now",
  },
  series: {
    eyebrow: "Featured series",
    title: "Series",
    description: "Stories that keep unfolding, one chapter at a time.",
    primarySection: "Featured dramas",
    secondarySection: "All series",
    cta: "View series",
  },
  entertainment: {
    eyebrow: "Featured show",
    title: "Shows",
    description: "Unscripted voices, conversations, and moments worth sharing.",
    primarySection: "Trending shows",
    secondarySection: "New & returning shows",
    cta: "View show",
  },
};

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.8v12.4L18.5 12 8 5.8Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M5 12h14M14 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function itemMeta(item: CatalogFeedItem): string {
  return [item.approvedCategory, item.director, item.approvedSchoolName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" · ");
}

function itemImageStyle(item: CatalogFeedItem): CSSProperties | undefined {
  return item.thumbnailCrop ? promoCropToVideoStyle(item.thumbnailCrop) : undefined;
}

function HeroImage({ item, priority = false }: { item: CatalogFeedItem; priority?: boolean }) {
  if (!item.thumbnailUrl) {
    return <div className={styles.heroFallback} aria-hidden="true" />;
  }

  return (
    <Image
      src={item.thumbnailUrl}
      alt=""
      fill
      priority={priority}
      unoptimized
      sizes="(min-width: 1100px) 72vw, 100vw"
      className={styles.heroImage}
      style={itemImageStyle(item)}
    />
  );
}

function SideFeature({ item, label }: { item: CatalogFeedItem; label: string }) {
  return (
    <Link href={watchHref(item.ownerUid, item.workId)} className={styles.sideFeature}>
      <div className={styles.sideMedia}>
        <HeroImage item={item} />
        <div className={styles.sideShade} />
        <div className={styles.sideCopy}>
          <span>{label}</span>
          <h3>{item.title}</h3>
          <p>{itemMeta(item)}</p>
        </div>
      </div>
    </Link>
  );
}

function CrossCategoryFeatures() {
  const { items: seriesItems } = useCatalogFeed("series", 1);
  const { items: showItems } = useCatalogFeed("entertainment", 1);
  const features = [
    seriesItems[0] ? { item: seriesItems[0], label: "Series" } : null,
    showItems[0] ? { item: showItems[0], label: "Shows" } : null,
  ].filter((feature): feature is { item: CatalogFeedItem; label: string } => Boolean(feature));

  if (features.length === 0) return null;

  return (
    <aside className={styles.sideStack} aria-label="Featured series and shows">
      {features.map(({ item, label }) => (
        <SideFeature key={`${label}-${item.id}`} item={item} label={label} />
      ))}
    </aside>
  );
}

export default function BrowseCatalogPage({ section }: Props) {
  const copy = COPY[section];
  const { user } = useAuth();
  const { items, loading } = useShowcaseCatalog(section, 19);
  const { items: continueWatchingAll } = useContinueWatching();

  const continueWatching = useMemo(
    () =>
      watchProgressItemsToHomeStories(
        continueWatchingAll.filter((item) => item.section === section)
      ),
    [continueWatchingAll, section]
  );

  const featured = items[0];
  const firstRow = items.slice(1, 7);
  const secondRow = items.slice(7, 19);

  if (!loading && !featured) {
    return (
      <main className={styles.emptyPage}>
        <header className={styles.emptyHeader}>
          <p>{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <span>{copy.description}</span>
        </header>
        <EmptyState
          title="No published work yet"
          body="The first approved work in this category will appear here."
          action={{ href: user ? UPLOAD_HREF : "/login", label: "Upload a work" }}
          className={styles.emptyState}
        />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {featured ? (
        <section className={`${styles.heroGrid} ${section === "movies" ? styles.filmGrid : styles.fullGrid}`}>
          <Link href={watchHref(featured.ownerUid, featured.workId)} className={styles.hero}>
            <HeroImage item={featured} priority />
            <div className={styles.heroShade} />
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{copy.eyebrow}</p>
              <h1>{featured.title}</h1>
              <p className={styles.heroDescription}>
                {itemMeta(featured) || copy.description}
              </p>
              {featured.approvedTags.length > 0 ? (
                <p className={styles.heroTags}>{featured.approvedTags.slice(0, 3).join(" · ")}</p>
              ) : null}
              <span className={styles.watchButton}>
                <PlayIcon />
                {copy.cta}
              </span>
            </div>
          </Link>

          {section === "movies" ? <CrossCategoryFeatures /> : null}
        </section>
      ) : (
        <div className={styles.heroLoading} aria-hidden="true" />
      )}

      <div className={styles.catalog}>
        {firstRow.length > 0 ? (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>{copy.primarySection}</h2>
              <Link href={`/${section === "movies" ? "movies" : section === "series" ? "series" : "entertainment"}`}>
                View all <ArrowIcon />
              </Link>
            </div>
            <ul className={styles.cardGrid}>
              {firstRow.map((item, index) => (
                <li key={item.id}>
                  <WorkCard
                    href={watchHref(item.ownerUid, item.workId)}
                    title={item.title}
                    meta={itemMeta(item)}
                    imageUrl={item.thumbnailUrl}
                    imageStyle={itemImageStyle(item)}
                    videoUrl={SERIES_MOCK_VIDEO_URLS[index % SERIES_MOCK_VIDEO_URLS.length]}
                    videoEnabled
                    videoPreviewMode="hover"
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {continueWatching.length > 0 ? (
          <HomeContentRow
            title="Continue watching"
            viewAllHref="/my-list"
            viewAllLabel="View all"
            items={continueWatching}
          />
        ) : null}

        {secondRow.length > 0 ? (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>{copy.secondarySection}</h2>
            </div>
            <ul className={styles.cardGrid}>
              {secondRow.map((item, index) => (
                <li key={item.id}>
                  <WorkCard
                    href={watchHref(item.ownerUid, item.workId)}
                    title={item.title}
                    meta={itemMeta(item)}
                    imageUrl={item.thumbnailUrl}
                    imageStyle={itemImageStyle(item)}
                    videoUrl={SERIES_MOCK_VIDEO_URLS[(index + firstRow.length) % SERIES_MOCK_VIDEO_URLS.length]}
                    videoEnabled
                    videoPreviewMode="hover"
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
