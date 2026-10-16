"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useCatalogFeed } from "@/hooks/useCatalogFeed";
import { uniqueCatalogItems } from "@/lib/showcaseCatalog";
import { newVisitSeed, visitRank } from "@/lib/visit-order";
import { promoCropToVideoStyle } from "@/lib/works/promo-crop-interaction";
import { watchHref } from "@/lib/works/catalog-ui";
import type { CatalogFeedItem } from "@/types/work";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import styles from "./HomeWorksStrip.module.css";

/** Six works fit side by side on the first screen. */
const STRIP_MAX = 6;

const fallbackImages = [
  "/images/hero/home-under-water.png",
  "/images/hero/home-wave.png",
  "/images/hero/campus-wave1.png",
  "/images/hero/campus-wave2.png",
  "/images/hero/campus-wave3.png",
];

/**
 * The first screen's bottom row: up to six works, so a visitor sees there is
 * plenty here before scrolling. Each work shows once (no repeats to pad the
 * row); which six, and their order, is shuffled once per visit (like the
 * credits) and stays put while the three feeds arrive.
 */
export default function HomeWorksStrip({ action }: { action?: ReactNode }) {
  const copy = useUiCopy();
  const { items: movies, loading: moviesLoading } = useCatalogFeed("movies", 12);
  const { items: series, loading: seriesLoading } = useCatalogFeed("series", 12);
  const { items: shows, loading: showsLoading } = useCatalogFeed("entertainment", 12);
  const loading = moviesLoading || seriesLoading || showsLoading;
  const [seed] = useState(newVisitSeed);

  const works = useMemo(
    () =>
      uniqueCatalogItems([...movies, ...series, ...shows])
        .sort((a, b) => visitRank(seed, a.id) - visitRank(seed, b.id))
        .slice(0, STRIP_MAX),
    [movies, series, shows, seed]
  );

  if (!loading && works.length === 0) {
    return action ? <div className={styles.actionOnly}>{action}</div> : null;
  }

  return (
    <section className={styles.strip} aria-label={copy("Now showing on OONA")}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          <UiText text="Now showing on OONA" />
        </h2>
        {action}
      </div>
      <div className={styles.rail}>
        {works.length === 0
          ? Array.from({ length: STRIP_MAX }, (_, i) => (
              <span key={i} className={styles.card} aria-hidden="true">
                <span className={`${styles.thumb} ${styles.skeleton}`} />
                <span className={styles.cardTitle}>&nbsp;</span>
              </span>
            ))
          : works.map((work, i) => <StripCard key={work.id} work={work} index={i} />)}
      </div>
    </section>
  );
}

function StripCard({ work, index }: { work: CatalogFeedItem; index: number }) {
  const image = work.thumbnailUrl || fallbackImages[index % fallbackImages.length]!;
  return (
    <Link href={watchHref(work.ownerUid, work.workId)} prefetch={false} className={styles.card}>
      <span className={styles.thumb}>
        <Image
          src={image}
          alt=""
          fill
          unoptimized={image.startsWith("http://") || image.startsWith("https://")}
          sizes="(max-width: 480px) 50vw, (max-width: 760px) 33vw, 17vw"
          className={styles.image}
          style={work.thumbnailCrop ? promoCropToVideoStyle(work.thumbnailCrop) : undefined}
        />
      </span>
      <span className={styles.cardTitle}>{work.title}</span>
    </Link>
  );
}
