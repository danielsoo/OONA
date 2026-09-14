"use client";

import { Children, isValidElement, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type RailSize = "landscape" | "poster" | "vertical" | "wide";

/** Fixed card widths per ratio, so a row never stretches or leaves a card alone on a new line. */
const ITEM_WIDTH: Record<RailSize, string> = {
  landscape: "w-[240px] sm:w-[264px] lg:w-[280px]",
  poster: "w-[140px] sm:w-[160px] lg:w-[176px]",
  vertical: "w-[128px] sm:w-[148px] lg:w-[160px]",
  wide: "w-[300px] sm:w-[360px] lg:w-[400px]",
};

type Props = {
  children: ReactNode;
  size?: RailSize;
  ariaLabel?: string;
  /** Page gutter the rail bleeds into; must match the parent's horizontal padding. */
  bleed?: "page" | "none";
};

function ArrowButton({
  direction,
  onClick,
  visible,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  visible: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label={direction === "prev" ? "Scroll back" : "Scroll forward"}
      className={`absolute top-[calc(50%-24px)] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line-strong bg-xiio-bg/85 text-ink backdrop-blur transition-opacity duration-150 hover:bg-xiio-card lg:flex ${
        direction === "prev" ? "left-2" : "right-2"
      } ${visible ? "opacity-0 group-hover/rail:opacity-100 focus-visible:opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={direction === "prev" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"}
        />
      </svg>
    </button>
  );
}

/** Horizontal, snap-scrolling row of equally sized cards. */
export default function Rail({ children, size = "landscape", ariaLabel, bleed = "page" }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  // Items can arrive after mount (feeds load in turn); re-measure so the arrows appear.
  const itemCount = Children.count(children);
  useEffect(() => {
    update();
  }, [itemCount, update]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro?.disconnect();
    };
  }, [update]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  };

  const bleedClass =
    bleed === "page" ? "-mx-4 px-4 scroll-px-4 lg:-mx-12 lg:px-12 lg:scroll-px-12" : "";

  return (
    <div className="group/rail relative">
      <div
        ref={scrollerRef}
        role="list"
        aria-label={ariaLabel}
        className={`scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pt-1 ${bleedClass}`}
      >
        {Children.toArray(children).map((child, index) => (
          <div
            key={isValidElement(child) && child.key != null ? child.key : index}
            role="listitem" className={`shrink-0 snap-start ${ITEM_WIDTH[size]}`}>
            {child}
          </div>
        ))}
      </div>
      <ArrowButton direction="prev" onClick={() => scrollBy(-1)} visible={canPrev} />
      <ArrowButton direction="next" onClick={() => scrollBy(1)} visible={canNext} />
    </div>
  );
}
