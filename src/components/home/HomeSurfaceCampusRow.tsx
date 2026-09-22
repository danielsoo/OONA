"use client";

import Link from "next/link";
import { useRef } from "react";
import CampusCurrentsBanner from "@/components/home/CampusCurrentsBanner";
import HomeStoryCard from "@/components/home/HomeStoryCard";
import SectionLabel from "@/components/layout/SectionLabel";
import { IconScrollNext } from "@/components/icons/MockupIcons";
import { MOCKUP_HOME } from "@/lib/mockupHomeSpec";
import { MOCKUP_MEASURES } from "@/lib/mockupLayout";
import type { HomeStoryItem } from "@/lib/homeMockData";
import { useUiCopy } from "@/components/i18n/UiText";

type Props = {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
  items: HomeStoryItem[];
};

function SectionHeader({
  title,
  viewAllHref,
  viewAllLabel,
  onScroll,
}: {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
  onScroll: () => void;
}) {
  const _copy = useUiCopy();
  return (
    <div className="flex items-center justify-between gap-4 flex-nowrap min-w-0">
      <div className="shrink-0">
        <SectionLabel>{title}</SectionLabel>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link href={viewAllHref} className={`text-white/40 hover:text-white/70 transition ${MOCKUP_HOME.viewAllLink}`}>
          {viewAllLabel}
        </Link>
        <button
          type="button"
          onClick={onScroll}
          className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 lg:hidden"
          aria-label={_copy("Scroll next")}
        >
          <IconScrollNext />
        </button>
      </div>
    </div>
  );
}

export default function HomeSurfaceCampusRow({
  title,
  viewAllHref,
  viewAllLabel,
  items,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scroll = () => {
    scrollerRef.current?.scrollBy({
      left: MOCKUP_MEASURES.surfaceCardWidth + 14,
      behavior: "smooth",
    });
  };

  return (
    <section className="min-w-0 w-full">
      <div className="mb-4">
        <SectionHeader
          title={title}
          viewAllHref={viewAllHref}
          viewAllLabel={viewAllLabel}
          onScroll={scroll}
        />
      </div>

      <div
        className={`hidden lg:grid min-w-0 w-full max-w-full ${MOCKUP_HOME.surfaceRowGap} ${MOCKUP_HOME.surfaceRowWidth}`}
        style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
      >
        {items.map((item) => (
          <HomeStoryCard key={item.id} item={item} variant="surface" />
        ))}
      </div>

      <div
        ref={scrollerRef}
        className={`flex overflow-x-auto pb-1 scrollbar-none min-w-0 lg:hidden ${MOCKUP_HOME.surfaceRowGap}`}
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item) => (
          <div key={item.id} className={MOCKUP_HOME.surfaceMobileCardWidth}>
            <HomeStoryCard item={item} variant="surface" />
          </div>
        ))}
      </div>

      <div className="mt-4 lg:mt-6">
        <CampusCurrentsBanner />
      </div>
    </section>
  );
}
