"use client";

import { useCallback, useRef, useState } from "react";
import StreamHlsVideo from "@/components/shorts/StreamHlsVideo";
import GuestPreviewOverlay from "@/components/watch/GuestPreviewOverlay";
import { guestPreviewLimitSeconds } from "@/lib/watch/guestPreview";

type Props = {
  src: string;
  durationSec?: number;
  className?: string;
  loginHref?: string;
};

export default function GuestLimitedPlayer({
  src,
  durationSec,
  className = "absolute inset-0 w-full h-full object-contain bg-black",
  loginHref,
}: Props) {
  const limitRef = useRef(0);
  const [limitReached, setLimitReached] = useState(false);

  const resolveLimit = useCallback(
    (videoDuration: number) => {
      const fromApi =
        durationSec != null && Number.isFinite(durationSec) && durationSec > 0
          ? guestPreviewLimitSeconds(durationSec)
          : 0;
      const fromVideo =
        Number.isFinite(videoDuration) && videoDuration > 0
          ? guestPreviewLimitSeconds(videoDuration)
          : 0;
      return fromApi > 0 ? fromApi : fromVideo;
    },
    [durationSec]
  );

  const clampToLimit = useCallback((video: HTMLVideoElement) => {
    const limit = limitRef.current;
    if (limit <= 0) return;
    if (video.currentTime > limit) {
      video.currentTime = limit;
    }
  }, []);

  const handleLoadedMetadata = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const video = e.currentTarget;
      limitRef.current = resolveLimit(video.duration);
    },
    [resolveLimit]
  );

  const handleTimeUpdate = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const video = e.currentTarget;
      const limit = limitRef.current;
      if (limit <= 0) return;
      if (video.currentTime >= limit - 0.05) {
        video.pause();
        video.currentTime = limit;
        setLimitReached(true);
      }
    },
    []
  );

  const handleSeeking = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      clampToLimit(e.currentTarget);
    },
    [clampToLimit]
  );

  const handleSeeked = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const video = e.currentTarget;
      clampToLimit(video);
      const limit = limitRef.current;
      if (limit > 0 && video.currentTime >= limit - 0.05) {
        video.pause();
        setLimitReached(true);
      }
    },
    [clampToLimit]
  );

  return (
    <div className="relative w-full h-full">
      <StreamHlsVideo
        src={src}
        className={className}
        playsInline
        muted={false}
        loop={false}
        preload="metadata"
        autoPlay={false}
        controls
        preferHighStart
        showQualitySelector
        ariaLabel="XIIO video player"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onSeeking={handleSeeking}
        onSeeked={handleSeeked}
      />
      {limitReached && <GuestPreviewOverlay loginHref={loginHref} />}
    </div>
  );
}
