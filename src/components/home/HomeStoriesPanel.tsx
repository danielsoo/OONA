"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconPlayOutline } from "@/components/icons/MockupIcons";
import { useSequentialVideoLoad } from "@/components/video/SequentialVideoLoadProvider";
import { useDesktopViewport } from "@/hooks/useDesktopViewport";
import { gradientForTitle } from "@/lib/works/catalog-ui";
import { useUiCopy } from "@/components/i18n/UiText";

const StreamHlsVideo = dynamic(() => import("@/components/shorts/StreamHlsVideo"), {
  ssr: false,
});

export type HomeStoryPanelItem = {
  id: string;
  title: string;
  meta: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  href: string;
};

type Props = {
  label: string;
  stories: HomeStoryPanelItem[];
};

const STORY_DURATION_MS = 4800;
const TICK_MS = 100;
const SWIPE_THRESHOLD_PX = 40;

function StoryMedia({
  story,
  index,
  active,
  videoEnabled,
}: {
  story: HomeStoryPanelItem;
  index: number;
  active: boolean;
  videoEnabled: boolean;
}) {
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const { shouldLoad, complete } = useSequentialVideoLoad(
    `hero-story:${index}:${story.id}`,
    videoEnabled && Boolean(story.videoUrl)
  );

  useEffect(() => {
    setVideoReady(false);
    setVideoFailed(false);
  }, [story.videoUrl]);

  return (
    <>
      <div className={`absolute inset-0 ${gradientForTitle(story.title)}`} />
      {story.thumbnailUrl ? (
        <Image
          src={story.thumbnailUrl}
          alt=""
          fill
          sizes="176px"
          className="object-cover"
          unoptimized
          loading="eager"
        />
      ) : null}
      {shouldLoad && story.videoUrl && !videoFailed ? (
        <StreamHlsVideo
          src={story.videoUrl}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
          muted
          loop
          playsInline
          preload="auto"
          autoPlay={active}
          onReady={() => {
            setVideoReady(true);
            complete();
          }}
          onError={() => {
            setVideoFailed(true);
            complete();
          }}
        />
      ) : null}
    </>
  );
}

export default function HomeStoriesPanel({ label, stories }: Props) {
  const _copy = useUiCopy();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const isDesktop = useDesktopViewport();

  const count = stories.length;

  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = setInterval(() => {
      setElapsedMs((prev) => {
        const next = prev + TICK_MS;
        if (next >= STORY_DURATION_MS) {
          setActiveIndex((i) => (i + 1) % count);
          return 0;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [count, paused]);

  useEffect(() => {
    setActiveIndex(0);
    setElapsedMs(0);
  }, [count]);

  if (count === 0) return null;

  const goToStory = (i: number) => {
    setActiveIndex(i);
    setElapsedMs(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    setPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartX.current;
    setPaused(false);
    touchStartX.current = null;
    if (startX === null) return;
    const endX = e.changedTouches[0]?.clientX ?? startX;
    const delta = endX - startX;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta < 0) {
      goToStory((activeIndex + 1) % count);
    } else {
      goToStory((activeIndex - 1 + count) % count);
    }
  };

  const active = stories[activeIndex];

  return (
    <div className="flex max-w-full flex-col items-end text-right">
      <div className="flex items-baseline justify-between w-[176px] mb-2.5">
        <span className="text-[11.5px] font-semibold tracking-[0.02em] text-white/85">{label}</span>
        <span className="text-[10.5px] text-white/50">
          {activeIndex + 1}/{count}
        </span>
      </div>
      <div
        className="group relative w-[176px] aspect-[9/16] shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-black cursor-pointer transition-transform duration-300 hover:scale-[1.03]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => router.push(active.href)}
        role="button"
        tabIndex={0}
        aria-label={`Play story: ${active.title}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") router.push(active.href);
        }}
      >
        <div
          className="absolute inset-0 flex h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)`, width: `${count * 100}%` }}
        >
          {stories.map((story, index) => (
            <div key={story.id} className="relative h-full shrink-0" style={{ width: `${100 / count}%` }}>
              <StoryMedia
                story={story}
                index={index}
                active={index === activeIndex}
                videoEnabled={isDesktop === true}
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30" />

        <div className="absolute top-2.5 inset-x-2.5 flex gap-1">
          {stories.map((story, i) => {
            const fill =
              i < activeIndex ? 100 : i === activeIndex ? (elapsedMs / STORY_DURATION_MS) * 100 : 0;
            return (
              <button
                key={story.id}
                type="button"
                className="h-[2px] flex-1 rounded-full bg-white/25 overflow-hidden"
                onClick={(e) => {
                  e.stopPropagation();
                  goToStory(i);
                }}
                aria-label={`Go to story ${i + 1}`}
              >
                <span
                  className="block h-full bg-white transition-[width] duration-100 ease-linear"
                  style={{ width: `${fill}%` }}
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="absolute top-6 right-2.5 w-7 h-7 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white/90 hover:bg-black/70"
          aria-label={_copy("Play")}
          onClick={(e) => {
            e.stopPropagation();
            router.push(active.href);
          }}
        >
          <IconPlayOutline className="w-3.5 h-3.5" />
        </button>

        <div className="absolute inset-x-0 bottom-0 p-3 text-left">
          <p className="font-semibold text-white text-[13px] leading-tight line-clamp-2">{active.title}</p>
          <p className="text-[11px] text-white/60 mt-0.5">{active.meta}</p>
        </div>
      </div>
    </div>
  );
}
