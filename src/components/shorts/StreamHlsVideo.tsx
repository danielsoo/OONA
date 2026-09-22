"use client";

import Hls from "hls.js";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from "react";
import { isHlsSource } from "@/lib/video/isHlsSource";
import UiText from "@/components/i18n/UiText";

export type StreamHlsVideoHandle = {
  play: () => Promise<void>;
  pause: () => void;
  get currentTime(): number;
  set currentTime(value: number);
};

type Props = {
  src: string;
  className?: string;
  style?: CSSProperties;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  preload?: "auto" | "metadata" | "none";
  autoPlay?: boolean;
  /** 히어로 teaser 등 — 첫 재생을 가능한 한 높은 레벨에서 시작 */
  preferHighStart?: boolean;
  /** 전체 작품 플레이어 — HLS 화질을 사용자가 직접 선택 */
  showQualitySelector?: boolean;
  ariaLabel?: string;
  onEnded?: () => void;
  onReady?: () => void;
  onError?: () => void;
  onPause?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  controls?: boolean;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onTimeUpdate?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onSeeking?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onSeeked?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onQualityChange?: (height: number | null) => void;
};

const HLS_BUFFER_OPTS: Partial<Hls["config"]> = {
  enableWorker: true,
  maxBufferLength: 15,
  maxMaxBufferLength: 30,
};

/** 일반 숏츠 피드 — ABR·대역폭 프로브 유지 */
const HLS_OPTIONS_ABR: Partial<Hls["config"]> = {
  ...HLS_BUFFER_OPTS,
  startLevel: -1,
  testBandwidth: true,
  capLevelToPlayerSize: true,
};

/** 히어로 teaser — 최고 레벨만 로드, 프로브 세그먼트 없음 */
const HLS_OPTIONS_HIGH_START: Partial<Hls["config"]> = {
  ...HLS_BUFFER_OPTS,
  startLevel: -1,
  testBandwidth: false,
  autoStartLoad: false,
  capLevelToPlayerSize: false,
};

function displayQualityHeight(width?: number, height?: number): number {
  if (width && height) return Math.min(width, height);
  return height ?? width ?? 0;
}

function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = String(whole % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}`
    : `${minutes}:${secs}`;
}

function canPlayNativeHls(): boolean {
  if (typeof document === "undefined") return false;
  const v = document.createElement("video");
  return v.canPlayType("application/vnd.apple.mpegurl") !== "";
}

const StreamHlsVideo = forwardRef(function StreamHlsVideo(
  {
    src,
    className = "",
    style,
    muted = true,
    loop = false,
    playsInline = true,
    preload = "metadata",
    autoPlay = false,
    preferHighStart = false,
    showQualitySelector = false,
    ariaLabel,
    onEnded,
    onReady,
    onError,
    onPause,
    controls = false,
    onLoadedMetadata,
    onTimeUpdate,
    onSeeking,
    onSeeked,
    onQualityChange,
  }: Props,
  ref: Ref<StreamHlsVideoHandle>
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const attachedSrcRef = useRef<string | null>(null);
  const readyFiredRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const onQualityChangeRef = useRef(onQualityChange);
  const playerShellRef = useRef<HTMLDivElement>(null);
  const qualityMenuRef = useRef<HTMLDetailsElement>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const [qualityLevels, setQualityLevels] = useState<
    Array<{ index: number; height: number; label: string }>
  >([]);
  const [selectedQuality, setSelectedQuality] = useState(-1);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
    onQualityChangeRef.current = onQualityChange;
  }, [onReady, onError, onQualityChange]);

  useImperativeHandle(ref, () => ({
    play: async () => {
      const video = videoRef.current;
      if (!video) return;
      await video.play().catch(() => {});
    },
    pause: () => videoRef.current?.pause(),
    get currentTime() {
      return videoRef.current?.currentTime ?? 0;
    },
    set currentTime(value: number) {
      if (videoRef.current) videoRef.current.currentTime = value;
    },
  }));

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (attachedSrcRef.current === src) {
      return;
    }

    readyFiredRef.current = false;
    setQualityLevels([]);
    setSelectedQuality(-1);
    setCurrentQuality(-1);

    const fireReady = () => {
      if (readyFiredRef.current) return;
      readyFiredRef.current = true;
      onReadyRef.current?.();
    };

    const handleError = () => onErrorRef.current?.();

    let targetMaxLevel = -1;
    let useHlsJsHighStart = false;

    const tryFireReadyAtMaxLevel = () => {
      const hls = hlsRef.current;
      if (!hls || targetMaxLevel < 0) return;
      if (hls.currentLevel !== targetMaxLevel) return;
      if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return;
      fireReady();
    };

    const handleCanPlay = () => {
      if (useHlsJsHighStart) {
        tryFireReadyAtMaxLevel();
        return;
      }
      fireReady();
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    attachedSrcRef.current = null;
    useHlsJsHighStart = false;

    if (!isHlsSource(src)) {
      video.src = src;
      attachedSrcRef.current = src;
    } else if (canPlayNativeHls() && !showQualitySelector) {
      video.src = src;
      attachedSrcRef.current = src;
    } else if (Hls.isSupported()) {
      const highStart = preferHighStart;
      useHlsJsHighStart = highStart;
      const hls = new Hls(highStart ? HLS_OPTIONS_HIGH_START : HLS_OPTIONS_ABR);
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      attachedSrcRef.current = src;

      if (highStart) {
        const onManifestParsed = () => {
          if (hls.levels.length === 0) {
            hls.startLoad(-1);
            return;
          }
          const levels = hls.levels
            .map((level, index) => {
              const height = displayQualityHeight(level.width, level.height);
              return {
                index,
                height,
                label: height ? `${height}p` : `Level ${index + 1}`,
              };
            })
            .sort((a, b) => b.height - a.height);
          setQualityLevels(levels);
          const max = levels[0]?.index ?? hls.levels.length - 1;
          targetMaxLevel = max;
          setSelectedQuality(max);
          hls.startLevel = max;
          hls.nextLoadLevel = max;
          hls.loadLevel = max;
          hls.startLoad(-1);
        };
        hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          setCurrentQuality(data.level);
          const level = hls.levels[data.level];
          onQualityChangeRef.current?.(displayQualityHeight(level?.width, level?.height) || null);
          tryFireReadyAtMaxLevel();
        });
        hls.on(Hls.Events.FRAG_BUFFERED, tryFireReadyAtMaxLevel);
      } else if (showQualitySelector) {
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setQualityLevels(
            hls.levels
              .map((level, index) => {
                const height = displayQualityHeight(level.width, level.height);
                return {
                  index,
                  height,
                  label: height ? `${height}p` : `Level ${index + 1}`,
                };
              })
              .sort((a, b) => b.height - a.height)
          );
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          setCurrentQuality(data.level);
          const level = hls.levels[data.level];
          onQualityChangeRef.current?.(displayQualityHeight(level?.width, level?.height) || null);
        });
      }

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) handleError();
      });
    } else {
      video.src = src;
      attachedSrcRef.current = src;
    }

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
    };
  }, [src, preferHighStart, showQualitySelector]);

  const selectQuality = (level: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    setSelectedQuality(level);
    if (level < 0) {
      hls.currentLevel = -1;
      hls.nextLevel = -1;
      hls.loadLevel = -1;
    } else {
      hls.currentLevel = level;
      hls.nextLevel = level;
      hls.loadLevel = level;
    }
    qualityMenuRef.current?.removeAttribute("open");
  };

  const clearControlsTimer = () => {
    if (controlsTimerRef.current != null) {
      window.clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
  };

  const revealControls = () => {
    setControlsVisible(true);
    clearControlsTimer();
    if (!videoRef.current?.paused) {
      controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2_200);
    }
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
    revealControls();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    revealControls();
  };

  const toggleFullscreen = async () => {
    const shell = playerShellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    else await shell.requestFullscreen().catch(() => {});
    revealControls();
  };

  useEffect(() => {
    return () => {
      clearControlsTimer();
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      attachedSrcRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerShellRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (autoPlay) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [autoPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onEnded) return;
    const handler = () => onEnded();
    video.addEventListener("ended", handler);
    return () => video.removeEventListener("ended", handler);
  }, [onEnded]);

  const currentLabel =
    selectedQuality < 0
      ? `Auto${currentQuality >= 0 ? ` · ${qualityLevels.find((level) => level.index === currentQuality)?.label ?? ""}` : ""}`
      : qualityLevels.find((level) => level.index === selectedQuality)?.label ?? "High";

  const videoElement = (
    <video
      ref={videoRef}
      className={className}
      style={style}
      aria-label={ariaLabel}
      playsInline={playsInline}
      muted={muted}
      loop={loop}
      preload={preload}
      controls={controls && !showQualitySelector}
      controlsList={controls && !showQualitySelector ? "nodownload" : undefined}
      onClick={showQualitySelector ? togglePlayback : undefined}
      onDoubleClick={showQualitySelector ? () => void toggleFullscreen() : undefined}
      onPlay={() => {
        setIsPlaying(true);
        revealControls();
      }}
      onLoadedMetadata={(event) => {
        setDuration(event.currentTarget.duration || 0);
        setVolume(event.currentTarget.volume);
        setIsMuted(event.currentTarget.muted);
        const intrinsicHeight = displayQualityHeight(
          event.currentTarget.videoWidth,
          event.currentTarget.videoHeight
        );
        if (intrinsicHeight > 0) onQualityChangeRef.current?.(intrinsicHeight);
        onLoadedMetadata?.(event);
      }}
      onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
      onTimeUpdate={(event) => {
        setCurrentTime(event.currentTarget.currentTime);
        onTimeUpdate?.(event);
      }}
      onPause={(event) => {
        setIsPlaying(false);
        setControlsVisible(true);
        clearControlsTimer();
        onPause?.(event);
      }}
      onEnded={() => setIsPlaying(false)}
      onVolumeChange={(event) => {
        setVolume(event.currentTarget.volume);
        setIsMuted(event.currentTarget.muted);
      }}
      onSeeking={onSeeking}
      onSeeked={onSeeked}
    />
  );

  if (!showQualitySelector) return videoElement;

  const playedPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      ref={playerShellRef}
      className={`group relative h-full w-full overflow-hidden bg-black ${controlsVisible ? "cursor-default" : "cursor-none"}`}
      tabIndex={0}
      onMouseMove={revealControls}
      onMouseLeave={() => {
        if (isPlaying && !qualityMenuRef.current?.open) setControlsVisible(false);
      }}
      onFocus={revealControls}
      onKeyDown={(event) => {
        const video = videoRef.current;
        if (!video) return;
        if (event.key === " " || event.key.toLowerCase() === "k") {
          event.preventDefault();
          togglePlayback();
        } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          video.currentTime = Math.max(
            0,
            Math.min(duration || video.duration || 0, video.currentTime + (event.key === "ArrowLeft" ? -5 : 5))
          );
          revealControls();
        } else if (event.key.toLowerCase() === "m") {
          toggleMute();
        } else if (event.key.toLowerCase() === "f") {
          void toggleFullscreen();
        }
      }}
    >
      {videoElement}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/65 to-transparent px-4 pb-3 pt-14 transition-opacity duration-200 ${controlsVisible || !isPlaying ? "opacity-100" : "opacity-0"}`}
      >
        <div className="pointer-events-auto">
          <input
            type="range"
            min={0}
            max={Math.max(duration, 0.1)}
            step={0.05}
            value={Math.min(currentTime, Math.max(duration, 0.1))}
            onChange={(event) => {
              if (videoRef.current) videoRef.current.currentTime = Number(event.target.value);
              revealControls();
            }}
            aria-label="Playback position"
            className="h-1 w-full cursor-pointer appearance-none rounded-full accent-white"
            style={{
              background: `linear-gradient(90deg, #ffffff ${playedPercent}%, rgba(255,255,255,0.34) ${playedPercent}%)`,
            }}
          />
          <div className="mt-3 flex h-8 items-center gap-3 text-white">
            <button
              type="button"
              onClick={togglePlayback}
              className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "Ⅱ" : "▶"}
            </button>
            <span className="min-w-[92px] text-[13px] font-medium tabular-nums text-white/90">
              {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={toggleMute}
              className="h-8 rounded-md px-2 text-[11px] font-semibold tracking-wide text-white/85 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? "MUTE" : "VOL"}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(event) => {
                const next = Number(event.target.value);
                const video = videoRef.current;
                if (video) {
                  video.volume = next;
                  video.muted = next === 0;
                }
                revealControls();
              }}
              aria-label="Volume"
              className="h-1 w-20 cursor-pointer accent-white max-sm:hidden"
            />
            {qualityLevels.length > 0 ? (
              <details
                ref={qualityMenuRef}
                className="group/quality relative text-xs text-white"
                onToggle={(event) => {
                  if (event.currentTarget.open) {
                    clearControlsTimer();
                    setControlsVisible(true);
                  } else {
                    revealControls();
                  }
                }}
              >
                <summary
                  className="flex h-8 list-none cursor-pointer items-center gap-1.5 rounded-md px-2 font-semibold transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  aria-label="Select video quality"
                  title={`Quality ${currentLabel}`}
                >
                  <span aria-hidden="true">⚙</span>
                  <span className="hidden sm:inline">{currentLabel}</span>
                </summary>
                <div className="absolute bottom-full right-0 mb-3 min-w-[150px] overflow-hidden rounded-lg border border-white/15 bg-[#111214]/95 py-1.5 shadow-2xl backdrop-blur-xl">
                  <p className="border-b border-white/10 px-3 py-2 text-[11px] font-semibold text-white/50"><UiText text={"Quality"} /></p>
                  <button
                    type="button"
                    onClick={() => selectQuality(-1)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-white/10 ${selectedQuality < 0 ? "text-white" : "text-white/60"}`}
                  >
                    <span><UiText text={"Auto"} /></span>
                    {selectedQuality < 0 ? <span>✓</span> : null}
                  </button>
                  {qualityLevels.map((level, index) => (
                    <button
                      key={`${level.index}-${level.label}`}
                      type="button"
                      onClick={() => selectQuality(level.index)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-white/10 ${selectedQuality === level.index ? "text-white" : "text-white/60"}`}
                    >
                      <span>{level.label}{index === 0 ? " · Highest" : ""}</span>
                      {selectedQuality === level.index ? <span>✓</span> : null}
                    </button>
                  ))}
                </div>
              </details>
            ) : null}
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? "↙" : "⛶"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default StreamHlsVideo;
