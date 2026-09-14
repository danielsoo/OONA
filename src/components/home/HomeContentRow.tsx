"use client";

import Rail, { type RailSize } from "@/components/ui/Rail";
import SectionHeader from "@/components/ui/SectionHeader";
import WorkCard, { type WorkCardRatio } from "@/components/ui/WorkCard";
import type { HomeStoryItem } from "@/lib/homeMockData";
import { useDesktopViewport } from "@/hooks/useDesktopViewport";

type Props = {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
  items: HomeStoryItem[];
  /** Kept for existing call sites; both render the same landscape card now. */
  variant?: "featured" | "selects";
  ratio?: WorkCardRatio;
  headerOnly?: boolean;
  hideHeader?: boolean;
  /** Autoplay muted previews in turn (needs a SequentialVideoLoadProvider above). */
  previews?: boolean;
};

export function storyMeta(item: Pick<HomeStoryItem, "category" | "duration">): string {
  const parts = [item.category, item.duration].map((p) => p?.trim()).filter(Boolean);
  // Drop a repeated value such as "daily · daily".
  return Array.from(new Set(parts)).join(" · ");
}

/** Section title + horizontal rail of work cards. */
export default function HomeContentRow({
  title,
  viewAllHref,
  viewAllLabel,
  items,
  ratio = "landscape",
  headerOnly = false,
  hideHeader = false,
  previews = false,
}: Props) {
  const isDesktop = useDesktopViewport();
  const header = <SectionHeader title={title} action={{ href: viewAllHref, label: viewAllLabel }} />;

  if (headerOnly) return header;
  if (items.length === 0) return null;

  const railSize: RailSize = ratio;

  return (
    <section className="min-w-0 w-full">
      {!hideHeader ? header : null}
      <Rail size={railSize} ariaLabel={title}>
        {items.map((item, index) => (
          <WorkCard
            key={item.id}
            href={item.href ?? "/movies"}
            title={item.title}
            meta={storyMeta(item)}
            imageUrl={item.imageUrl}
            imageStyle={item.imageStyle}
            videoUrl={previews ? item.videoUrl : undefined}
            videoQueueKey={`${title}:${index}:${item.id}`}
            videoEnabled={previews && isDesktop === true}
            progressPercent={item.progressPercent}
            ratio={ratio}
          />
        ))}
      </Rail>
    </section>
  );
}
