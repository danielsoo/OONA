"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useCatalogFeed } from "@/hooks/useCatalogFeed";
import { fillCatalogItems, uniqueCatalogItems } from "@/lib/showcaseCatalog";
import { promoCropToVideoStyle } from "@/lib/works/promo-crop-interaction";
import { watchHref } from "@/lib/works/catalog-ui";
import type { CatalogFeedItem } from "@/types/work";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import styles from "./HomeWorksStrip.module.css";

/** Enough small screens to read as "there is a lot to watch here". */
const STRIP_MIN = 10;
const STRIP_MAX = 24;

const fallbackImages = [
  "/images/hero/home-under-water.png",
  "/images/hero/home-wave.png",
  "/images/hero/campus-wave1.png",
  "/images/hero/campus-wave2.png",
  "/images/hero/campus-wave3.png",
];

/** FNV-1a: a stable rank for each work within one visit. */
function rank(seed: string, id: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${seed}:${id}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The first screen's bottom row: many works, small, so a visitor sees there is
 * plenty here before scrolling. The order is shuffled once per visit (like the
 * credits) and stays put while the three feeds arrive.
 */
export default function HomeWorksStrip({ action }: { action?: ReactNode }) {
  const copy = useUiCopy();
  const { items: movies, loading: moviesLoading } = useCatalogFeed("movies", 12);
  const { items: series, loading: seriesLoading } = useCatalogFeed("series", 12);
  const { items: shows, loading: showsLoading } = useCatalogFeed("entertainment", 12);
  const loading = moviesLoading || seriesLoading || showsLoading;
  const [seed] = useState(() => Math.random().toString(36).slice(2));

  const works = useMemo(() => {
    const unique = uniqueCatalogItems([...movies, ...series, ...shows])
      .sort((a, b) => rank(seed, a.id) - rank(seed, b.id))
      .slice(0, STRIP_MAX);
    return unique.length < STRIP_MIN ? fillCatalogItems(unique, STRIP_MIN) : unique;
  }, [movies, series, shows, seed]);

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
          ? Array.from({ length: STRIP_MIN }, (_, i) => (
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
          sizes="236px"
          className={styles.image}
          style={work.thumbnailCrop ? promoCropToVideoStyle(work.thumbnailCrop) : undefined}
        />
      </span>
      <span className={styles.cardTitle}>{work.title}</span>
    </Link>
  );
}
