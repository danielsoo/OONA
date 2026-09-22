"use client";

import { IconPlayOutline } from "@/components/icons/MockupIcons";
import { MOCKUP_HOME } from "@/lib/mockupHomeSpec";
import { useUiCopy } from "@/components/i18n/UiText";

type Props = {
  label: string;
  title: string;
  meta: string;
  slideCount?: number;
  activeIndex?: number;
};

export default function HomeFeaturedStoryPanel({
  label,
  title,
  meta,
  slideCount = 4,
  activeIndex = 0,
}: Props) {
  const _copy = useUiCopy();
  return (
    <div className="flex max-w-full flex-col items-end text-right">
      <p className={MOCKUP_HOME.featuredLabel}>{label}</p>
      <div className="flex items-start justify-end gap-3">
        <div className="min-w-0 text-right">
          <p className={MOCKUP_HOME.featuredTitle}>{title}</p>
          <p className={MOCKUP_HOME.featuredMeta}>{meta}</p>
        </div>
        <button
          type="button"
          className={MOCKUP_HOME.featuredPlay}
          aria-label={_copy("Play featured story")}
        >
          <IconPlayOutline className="w-5 h-5" />
        </button>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        {Array.from({ length: slideCount }).map((_, i) => (
          <span
            key={i}
            className={`h-0.5 rounded-full transition-all ${
              i === activeIndex ? "w-7 bg-white" : "w-3 bg-white/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
