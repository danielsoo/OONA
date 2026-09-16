"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useSequentialVideoLoad } from "@/components/video/SequentialVideoLoadProvider";
import { gradientForTitle } from "@/lib/works/catalog-ui";

const StreamHlsVideo = dynamic(() => import("@/components/shorts/StreamHlsVideo"), {
  ssr: false,
});

export type WorkCardRatio = "landscape" | "poster" | "vertical";

const RATIO_CLASS: Record<WorkCardRatio, string> = {
  landscape: "aspect-video",
  poster: "aspect-[2/3]",
  vertical: "aspect-[9/16]",
};

const SIZES: Record<WorkCardRatio, string> = {
  landscape: "(min-width: 1024px) 300px, 60vw",
  poster: "(min-width: 1024px) 200px, 40vw",
  vertical: "(min-width: 1024px) 180px, 40vw",
};

export type WorkCardProps = {
  href: string;
  title: string;
  /** One line under the title: category, runtime, creator. */
  meta?: string;
  imageUrl?: string;
  imageStyle?: CSSProperties;
  /** Muted preview that plays when the card's turn comes in the sequential loader. */
  videoUrl?: string;
  videoQueueKey?: string;
  videoEnabled?: boolean;
  videoPreviewMode?: "sequential" | "hover";
  ratio?: WorkCardRatio;
  /** 0–100, draws a resume bar along the bottom edge of the image. */
  progressPercent?: number;
  /** Small label on the image, e.g. "New". */
  badge?: ReactNode;
  className?: string;
};

function CardMedia({
  title,
  imageUrl,
  imageStyle,
  videoUrl,
  videoQueueKey,
  videoEnabled,
  videoPreviewMode,
  previewActive,
  sizes,
}: {
  title: string;
  imageUrl?: string;
  imageStyle?: CSSProperties;
  videoUrl?: string;
  videoQueueKey: string;
  videoEnabled: boolean;
  videoPreviewMode: "sequential" | "hover";
  previewActive: boolean;
  sizes: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const { shouldLoad, complete } = useSequentialVideoLoad(
    videoQueueKey,
    videoPreviewMode === "sequential" && videoEnabled && Boolean(videoUrl)
  );
  const shouldShowVideo = videoPreviewMode === "hover"
    ? videoEnabled && previewActive && Boolean(videoUrl)
    : shouldLoad;

  useEffect(() => setImageFailed(false), [imageUrl]);
  useEffect(() => {
    setVideoReady(false);
    setVideoFailed(false);
  }, [videoUrl]);

  return (
    <>
      <div className={`absolute inset-0 ${gradientForTitle(title)}`} aria-hidden />
      {imageUrl && !imageFailed ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes={sizes}
          unoptimized
          className="object-cover"
          style={imageStyle}
          onError={() => setImageFailed(true)}
        />
      ) : null}
      {shouldShowVideo && videoUrl && !videoFailed ? (
        <StreamHlsVideo
          src={videoUrl}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
          style={imageStyle}
          muted
          loop
          playsInline
          preload="auto"
          autoPlay
          onReady={() => {
            setVideoReady(true);
            if (videoPreviewMode === "sequential") complete();
          }}
          onError={() => {
            setVideoFailed(true);
            if (videoPreviewMode === "sequential") complete();
          }}
        />
      ) : null}
    </>
  );
}

/**
 * The one card for a piece of work. The image keeps a fixed aspect ratio and the
 * text always sits below it, so titles never collide with buttons at any width.
 */
export default function WorkCard({
  href,
  title,
  meta,
  imageUrl,
  imageStyle,
  videoUrl,
  videoQueueKey,
  videoEnabled = false,
  videoPreviewMode = "sequential",
  ratio = "landscape",
  progressPercent,
  badge,
  className = "",
}: WorkCardProps) {
  const [previewActive, setPreviewActive] = useState(false);

  return (
    <Link
      href={href}
      onPointerEnter={() => setPreviewActive(true)}
      onPointerLeave={() => setPreviewActive(false)}
      onFocus={() => setPreviewActive(true)}
      onBlur={() => setPreviewActive(false)}
      className={`group block min-w-0 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xiio-accent/70 ${className}`.trim()}
    >
      <div
        className={`relative w-full overflow-hidden rounded-card bg-white/[0.04] ring-1 ring-inset ring-line transition-[transform,box-shadow] duration-200 ease-out group-hover:scale-[1.03] group-hover:shadow-xl group-hover:shadow-black/40 motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${RATIO_CLASS[ratio]}`}
      >
        <CardMedia
          title={title}
          imageUrl={imageUrl}
          imageStyle={imageStyle}
          videoUrl={videoUrl}
          videoQueueKey={videoQueueKey ?? `card:${href}`}
          videoEnabled={videoEnabled}
          videoPreviewMode={videoPreviewMode}
          previewActive={previewActive}
          sizes={SIZES[ratio]}
        />
        {badge ? (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-xiio-accent px-2 py-0.5 text-micro font-semibold uppercase text-white">
            {badge}
          </span>
        ) : null}
        <span
          className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition duration-200 group-hover:bg-black/20 group-hover:opacity-100"
          aria-hidden
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/90 text-xiio-bg shadow-lg">
            <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
        {progressPercent != null ? (
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20" aria-hidden>
            <span
              className="block h-full bg-xiio-accent"
              style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
            />
          </span>
        ) : null}
      </div>
      <p className="mt-2.5 line-clamp-2 text-body font-semibold leading-snug text-ink">{title}</p>
      {meta ? <p className="mt-0.5 truncate text-small text-ink-3">{meta}</p> : null}
    </Link>
  );
}
