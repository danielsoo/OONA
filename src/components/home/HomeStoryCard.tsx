"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { IconPlus } from "@/components/icons/MockupIcons";
import { useSequentialVideoLoad } from "@/components/video/SequentialVideoLoadProvider";
import type { HomeStoryItem } from "@/lib/homeMockData";
import { MOCKUP_HOME } from "@/lib/mockupHomeSpec";
import { gradientForTitle } from "@/lib/works/catalog-ui";
import { useUiCopy } from "@/components/i18n/UiText";

const StreamHlsVideo = dynamic(() => import("@/components/shorts/StreamHlsVideo"), {
  ssr: false,
});

type Props = {
  item: HomeStoryItem;
  variant?: "featured" | "surface";
  videoQueueKey?: string;
  videoEnabled?: boolean;
};

function formatMeta(category: string, duration: string): string {
  if (category && duration) return `${category} · ${duration}`;
  return category || duration;
}

function CardThumbnail({
  item,
  sizes,
  className,
}: {
  item: HomeStoryItem;
  sizes: string;
  className?: string;
}) {
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    setThumbFailed(false);
  }, [item.imageUrl]);

  const showThumbnail = Boolean(item.imageUrl) && !thumbFailed;

  if (showThumbnail) {
    return (
      <Image
        src={item.imageUrl}
        alt=""
        fill
        className={`object-cover ${className ?? ""}`}
        style={item.imageStyle}
        sizes={sizes}
        unoptimized
        loading={item.videoUrl ? "eager" : "lazy"}
        onError={() => setThumbFailed(true)}
      />
    );
  }

  return <div className={`absolute inset-0 ${gradientForTitle(item.title)}`} />;
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
      <div
        className="h-full bg-xiio-accent"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

function CardMedia({
  item,
  sizes,
  videoQueueKey,
  videoEnabled,
}: {
  item: HomeStoryItem;
  sizes: string;
  videoQueueKey: string;
  videoEnabled: boolean;
}) {
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const { shouldLoad, complete } = useSequentialVideoLoad(
    videoQueueKey,
    videoEnabled && Boolean(item.videoUrl)
  );

  useEffect(() => {
    setVideoReady(false);
    setVideoFailed(false);
  }, [item.videoUrl]);

  return (
    <>
      <div className={`absolute inset-0 ${gradientForTitle(item.title)}`} />
      <CardThumbnail item={item} sizes={sizes} />
      {shouldLoad && item.videoUrl && !videoFailed ? (
        <StreamHlsVideo
          src={item.videoUrl}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
          style={item.imageStyle}
          muted
          loop
          playsInline
          preload="auto"
          autoPlay
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

export default function HomeStoryCard({
  item,
  variant = "featured",
  videoQueueKey = `card:${item.id}`,
  videoEnabled = false,
}: Props) {
  const _copy = useUiCopy();
  const isFeatured = variant === "featured";
  const href = item.href ?? "/movies";
  const widthClass = isFeatured ? MOCKUP_HOME.featuredCardWidth : MOCKUP_HOME.surfaceCardWidth;
  const meta = formatMeta(item.category, item.duration);

  if (isFeatured) {
    return (
      <Link
        href={href}
        className={`group relative min-w-0 ${widthClass} ${MOCKUP_HOME.cardRadius} overflow-hidden border border-white/[0.08] hover:border-white/15 hover:scale-[1.03] hover:shadow-xl hover:shadow-black/40 transition-[transform,box-shadow,border-color] duration-200 ease-out`}
      >
        <div className="relative aspect-[233/134] w-full">
          <CardMedia
            item={item}
            sizes="300px"
            videoQueueKey={videoQueueKey}
            videoEnabled={videoEnabled}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <button
            type="button"
            className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white/90 hover:bg-black/70"
            aria-label={_copy("Add to list")}
            onClick={(e) => e.preventDefault()}
          >
            <IconPlus />
          </button>
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="font-semibold text-white text-sm leading-tight">{item.title}</p>
            {meta ? (
              <p className="text-[11px] text-white/55 mt-0.5">{meta}</p>
            ) : null}
          </div>
          {item.progressPercent != null ? <ProgressBar percent={item.progressPercent} /> : null}
        </div>
      </Link>
    );
  }

  const surfaceMeta = item.duration || item.category;

  return (
    <Link href={href} className={`group min-w-0 ${widthClass}`}>
      <div
        className={`relative aspect-[177/111] w-full ${MOCKUP_HOME.cardRadius} overflow-hidden border border-white/[0.08] group-hover:border-white/15 group-hover:scale-[1.03] group-hover:shadow-xl group-hover:shadow-black/40 transition-[transform,box-shadow,border-color] duration-200 ease-out mb-2`}
      >
        <CardMedia
          item={item}
          sizes="200px"
          videoQueueKey={videoQueueKey}
          videoEnabled={videoEnabled}
        />
        {item.progressPercent != null ? <ProgressBar percent={item.progressPercent} /> : null}
      </div>
      <p className="font-medium text-white text-sm leading-tight px-0.5">{item.title}</p>
      {surfaceMeta ? (
        <p className="text-[11px] text-white/45 mt-0.5 px-0.5">{surfaceMeta}</p>
      ) : null}
    </Link>
  );
}
