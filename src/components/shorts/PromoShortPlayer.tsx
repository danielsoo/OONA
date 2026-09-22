"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import ReportContentModal from "@/components/report/ReportContentModal";
import LoginPromptDialog from "@/components/auth/LoginPromptDialog";
import StreamHlsVideo, { type StreamHlsVideoHandle } from "@/components/shorts/StreamHlsVideo";
import type { PromoShortPeekDimLevel } from "@/components/shorts/PromoShortPeekPreview";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { useElementFullscreen } from "@/hooks/useElementFullscreen";
import { usePromoDescriptionExpand } from "@/hooks/usePromoDescriptionExpand";
import { useRecordEngagementView } from "@/hooks/useRecordEngagementView";
import { isLongDescription } from "@/lib/works/description";
import { promoCropToVideoStyle } from "@/lib/works/promo-crop-interaction";
import { watchHref as workWatchHref } from "@/lib/works/catalog-ui";
import type { PromoShort } from "@/types/promoShort";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-7 h-7 transition drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] ${filled ? "fill-xiio-accent text-xiio-accent" : "fill-none text-white"}`}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.75}
      aria-hidden
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-7 h-7 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v14" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-7 h-7 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1-1-4-1-5 2-8 2-4-1-4-1z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 22v-3" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-7 h-7 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-7 h-7 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
    </svg>
  );
}

export type PromoShortLayout = "overlay" | "stacked";
export type PromoShortVariant = "default" | "teaser";
export type PromoShortPlayerSize = "default" | "homeHeroSmall";
/** 홈 캐러셀 중앙 티저 — 탭 시 전체화면 vs 카드 전체 시청 링크 */
export type TeaserCenterAction = "expand" | "watch-overlay";

/** 홈 히어로 teaser — 영상 원본 비율과 무관한 고정 프레임 */
export const HOME_HERO_TEASER_FRAME_CLASS =
  "w-[200px] sm:w-[236px] aspect-[9/16] shrink-0";
export const HOME_HERO_TEASER_VIEWPORT_CLASS = `relative mx-auto ${HOME_HERO_TEASER_FRAME_CLASS}`;
import {
  HOME_HERO_PEEK_SIDE_FRAME_CLASS,
  HOME_HERO_PEEK_VIEWPORT_CLASS,
} from "@/components/shorts/promoShortConstants";
export { HOME_HERO_PEEK_SIDE_FRAME_CLASS, HOME_HERO_PEEK_VIEWPORT_CLASS };

/** 확대 뷰어 triptych — 중앙 카드 측정·슬롯 (히어로 teaser 프레임보다 큼) */
export const EXPANDED_VIEWER_CENTER_FRAME_CLASS =
  "w-full max-w-lg aspect-[9/16] shrink-0 rounded-[14px] overflow-hidden";
/** 확대 뷰어 — 좌·우 피크 슬롯 (중앙과 동일 9:16, 너비만 작게) */
export const EXPANDED_VIEWER_PEEK_FRAME_CLASS =
  "w-full max-w-[14rem] sm:max-w-[16rem] aspect-[9/16] shrink-0 rounded-[14px] overflow-hidden";
/** 확대 뷰어 — ±2 외곽 피크 (인스타 스트립 바깥 카드) */
export const EXPANDED_VIEWER_OUTER_PEEK_FRAME_CLASS =
  "w-full max-w-[10rem] sm:max-w-[12rem] aspect-[9/16] shrink-0 rounded-[14px] overflow-hidden";

function PromoDescriptionBlock({
  description,
  tall,
  expandable,
  progress,
  onToggle,
}: {
  description: string;
  tall: boolean;
  expandable: boolean;
  progress: number;
  onToggle: () => void;
}) {
  const measureRef = useRef<HTMLParagraphElement>(null);
  const [fullPx, setFullPx] = useState(0);

  const textClass = tall
    ? "mt-2 text-sm md:text-base text-white/85 leading-relaxed"
    : "text-xs md:text-sm text-white/65 mt-1.5 leading-snug";

  const collapsedPx = tall ? 52 : 36;

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const update = () => setFullPx(el.scrollHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [description, tall]);

  if (!description) return null;

  if (!expandable) {
    return (
      <p className={`${textClass} whitespace-pre-wrap break-words`}>{description}</p>
    );
  }

  const maxH = collapsedPx + progress * Math.max(0, fullPx - collapsedPx);
  const fullyOpen = progress >= 1;

  const toggleProps = {
    role: "button" as const,
    tabIndex: 0,
    "aria-expanded": fullyOpen,
    onClick: (e: MouseEvent) => {
      e.stopPropagation();
      onToggle();
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }
    },
    className: "cursor-pointer min-w-0",
  };

  if (fullyOpen) {
    return (
      <div {...toggleProps}>
        <p className={`${textClass} whitespace-pre-wrap break-words`}>{description}</p>
      </div>
    );
  }

  return (
    <>
      <p
        ref={measureRef}
        className={`${textClass} invisible absolute left-0 right-0 pointer-events-none whitespace-pre-wrap break-words`}
        aria-hidden
      >
        {description}
      </p>
      <div {...toggleProps}>
        <p
          className={`${textClass} overflow-hidden whitespace-pre-wrap break-words`}
          style={{ maxHeight: Math.max(collapsedPx, maxH) }}
        >
          {description}
        </p>
      </div>
    </>
  );
}

function PlayerChrome({
  item,
  isActive,
  isFullscreen,
  layout,
  compact,
  variant,
  playerSize,
  peekSide,
  scrollExpand,
  scrollRootRef,
  loop = true,
  onPlaybackEnded,
  playbackEnabled,
  preserveFrame = false,
  videoPreload,
  heroCarouselEmbed = false,
  carouselAdjacentEmbed = false,
  carouselAdjacentDimLevel = "default",
  transitionDimLevel = null,
  forcePortraitFrame = false,
  teaserCenterAction = "watch-overlay",
  expandedEmbed = false,
  showChrome = true,
  onTeaserExpandRequest,
  onToggleFullscreen,
  onExitFullscreen,
}: {
  item: PromoShort;
  isActive: boolean;
  /** false면 재생/리셋 보류 (캐러셀 전환 중) */
  playbackEnabled?: boolean;
  /** true면 비활성 시 currentTime 유지 (슬라이드 아웃 프레임) */
  preserveFrame?: boolean;
  videoPreload?: "auto" | "metadata" | "none";
  /** 홈 히어로 triptych — 부모 프레임에 맞춰 모서리 클리핑 */
  heroCarouselEmbed?: boolean;
  /** ±1 인접 슬롯 — HLS 선로딩, 피크 딤 오버레이 */
  carouselAdjacentEmbed?: boolean;
  carouselAdjacentDimLevel?: PromoShortPeekDimLevel;
  /** center -> side 전환 시작 즉시 딤 오버레이 */
  transitionDimLevel?: PromoShortPeekDimLevel | null;
  /** 메타 노출과 무관하게 9:16 프레임 고정 */
  forcePortraitFrame?: boolean;
  teaserCenterAction?: TeaserCenterAction;
  expandedEmbed?: boolean;
  showChrome?: boolean;
  onTeaserExpandRequest?: () => void;
  isFullscreen: boolean;
  layout: PromoShortLayout;
  compact?: boolean;
  variant?: PromoShortVariant;
  playerSize?: PromoShortPlayerSize;
  peekSide?: boolean;
  /** 숏츠 화면 등에서만 스크롤로 소개 펼침 */
  scrollExpand?: boolean;
  scrollRootRef?: RefObject<HTMLElement | null>;
  loop?: boolean;
  onPlaybackEnded?: () => void;
  onToggleFullscreen: () => void;
  onExitFullscreen: () => void;
}) {
  const effectiveFullscreen = isFullscreen || expandedEmbed;
  const isCarouselCenterEmbed =
    heroCarouselEmbed || expandedEmbed || carouselAdjacentEmbed;
  const isTeaser = variant === "teaser" && !effectiveFullscreen && !carouselAdjacentEmbed;
  const hideHeroChrome =
    !showChrome ||
    (heroCarouselEmbed && !effectiveFullscreen) ||
    carouselAdjacentEmbed ||
    Boolean(transitionDimLevel);
  const { t } = useTranslations();
  const { user, loading: authLoading } = useAuth();
  const videoRef = useRef<StreamHlsVideoHandle>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const metaMeasureRef = useRef<HTMLDivElement>(null);
  const metaScrollRef = useRef<HTMLDivElement>(null);
  const persisted = Boolean(item.ownerUid && item.workId);
  const description = item.description?.trim() ?? "";
  const expandable = isLongDescription(description);
  const scrollListenerRef = effectiveFullscreen || !scrollRootRef ? cardRef : scrollRootRef;
  const { progress, toggle } = usePromoDescriptionExpand({
    enabled: isActive && expandable && (Boolean(scrollExpand) || effectiveFullscreen),
    itemId: item.id,
    compact,
    scrollRootRef: scrollListenerRef,
    metaScrollRef,
  });
  const [liked, setLiked] = useState(item.likedByMe ?? false);
  const [likeCount, setLikeCount] = useState(item.likeCount ?? 0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [loginReturnTo, setLoginReturnTo] = useState<string | null>(null);
  const [shareHint, setShareHint] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  useEffect(() => { setLoginReturnTo(null); setReportOpen(false); }, [user?.uid, item.id, isActive]);

  const requestLogin = useCallback(() => {
    setLoginReturnTo(`${window.location.pathname}${window.location.search}`);
  }, []);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoSourceSize, setVideoSourceSize] = useState({ width: 0, height: 0 });
  const hasBeenReadyRef = useRef(false);
  const readyItemIdRef = useRef<string | null>(null);

  useRecordEngagementView(item.ownerUid, item.workId, "promo", isActive && persisted);

  useEffect(() => {
    setLiked(item.likedByMe ?? false);
    setLikeCount(item.likeCount ?? 0);
  }, [item.id, item.likedByMe, item.likeCount]);

  useEffect(() => {
    if (readyItemIdRef.current !== item.id) {
      readyItemIdRef.current = item.id;
      hasBeenReadyRef.current = false;
    }
    setVideoFailed(false);
    setVideoSourceSize({ width: 0, height: 0 });
    if (!hasBeenReadyRef.current) {
      setVideoReady(false);
    }
  }, [item.videoUrl, item.id]);

  const handleVideoReady = useCallback(() => {
    hasBeenReadyRef.current = true;
    setVideoReady(true);
  }, []);

  const shouldPlay = (playbackEnabled ?? isActive) && loginReturnTo === null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (shouldPlay) {
      void video.play().catch(() => {});
    } else {
      video.pause();
      if (!preserveFrame && loginReturnTo === null) {
        video.currentTime = 0;
      }
    }
  }, [shouldPlay, preserveFrame, item.videoUrl, loginReturnTo]);

  const shareUrl = useCallback(() => {
    if (item.ownerUid && item.workId) {
      const path = workWatchHref(item.ownerUid, item.workId);
      return typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    }
    const path = `/?promo=${encodeURIComponent(item.id)}`;
    return typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  }, [item.id, item.ownerUid, item.workId]);

  const toggleLike = useCallback(async () => {
    if (authLoading) return;
    if (!user) { requestLogin(); return; }
    if (persisted) {
      if (likeBusy) return;
      const nextLiked = !liked;
      setLikeBusy(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/engagement/like", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ownerUid: item.ownerUid,
            workId: item.workId,
            liked: nextLiked,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { likeCount?: number; liked?: boolean };
        if (res.ok) {
          setLiked(Boolean(data.liked ?? nextLiked));
          if (typeof data.likeCount === "number") setLikeCount(data.likeCount);
          else setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
        }
      } finally {
        setLikeBusy(false);
      }
      return;
    }

    setLiked((prev) => {
      setLikeCount((c) => c + (prev ? -1 : 1));
      return !prev;
    });
  }, [authLoading, requestLogin, persisted, user, likeBusy, liked, item.ownerUid, item.workId]);

  const handleShare = useCallback(async () => {
    const url = shareUrl();
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: item.title, text: item.description, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareHint(true);
      window.setTimeout(() => setShareHint(false), 2000);
    } catch {
      /* cancelled */
    }
  }, [item.description, item.title, shareUrl]);

  const tallMeta = layout === "stacked" || effectiveFullscreen;

  const [cardH, setCardH] = useState(480);
  const [metaContentPx, setMetaContentPx] = useState(120);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const update = () => setCardH(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [effectiveFullscreen, compact, progress]);

  useEffect(() => {
    const el = metaMeasureRef.current;
    if (!el) return;
    const update = () => setMetaContentPx(el.scrollHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [item.title, item.director, description, tallMeta, compact]);

  const bandMinPx = compact ? 80 : 96;
  const bandPaddingPx = compact ? 28 : 32;
  const bandExpandedCap = Math.min(cardH * 0.88, metaContentPx + bandPaddingPx);
  const bandMaxHeightPx = expandable
    ? bandMinPx + progress * Math.max(0, bandExpandedCap - bandMinPx)
    : undefined;

  const fixedTeaserFrame = isTeaser && playerSize === "homeHeroSmall" && !peekSide;
  const peekSideFrame = isTeaser && peekSide;
  const fixedPortraitFrame =
    fixedTeaserFrame || peekSideFrame || expandedEmbed || forcePortraitFrame;
  const smallShell = peekSideFrame
    ? HOME_HERO_PEEK_SIDE_FRAME_CLASS
    : fixedTeaserFrame
    ? HOME_HERO_TEASER_FRAME_CLASS
    : playerSize === "homeHeroSmall"
        ? "max-w-[220px] sm:max-w-[260px] max-h-[min(42vh,400px)]"
        : compact
          ? "max-h-[min(72vh,680px)]"
          : "max-h-[min(85vh,780px)]";
  const maxWidthClass =
    fixedPortraitFrame || playerSize === "homeHeroSmall" ? "" : "max-w-lg";

  const cardShellClass = isCarouselCenterEmbed
    ? "relative h-full w-full overflow-hidden rounded-[14px] bg-black"
    : effectiveFullscreen
      ? "relative w-full h-full max-w-lg mx-auto rounded-[14px] overflow-hidden bg-black"
      : `relative mx-auto ${fixedPortraitFrame ? "" : "w-full "} ${maxWidthClass} rounded-[14px] overflow-hidden bg-black border border-white/10 shadow-2xl shadow-black/50 ${smallShell}`;

  const cardAspectStyle =
    isCarouselCenterEmbed || fixedPortraitFrame
      ? undefined
      : { aspectRatio: item.aspectRatio };

  const videoObjectClass =
    fixedPortraitFrame || isCarouselCenterEmbed ? "object-cover" : "object-contain";
  const videoFrameStyle =
    item.frameCrop && (fixedPortraitFrame || isCarouselCenterEmbed)
      ? promoCropToVideoStyle(
          item.frameCrop,
          videoSourceSize.width > 0 && videoSourceSize.height > 0
            ? {
                width: videoSourceSize.width,
                height: videoSourceSize.height,
                frameAspect: 9 / 16,
              }
            : undefined
        )
      : undefined;

  const overlayBandClass = compact
    ? "h-auto min-h-[5rem] max-h-[min(38%,12rem)]"
    : "h-auto min-h-[5.5rem] max-h-[min(42%,14rem)]";

  const overlayBandStyle = expandable
    ? { maxHeight: bandMaxHeightPx }
    : undefined;

  const actionButtons = hideHeroChrome ? null : (
    <div className="flex flex-col items-center justify-center gap-4 shrink-0">
      <button
        type="button"
        onClick={() => void toggleLike()}
        disabled={authLoading || likeBusy}
        className="flex flex-col items-center gap-1 disabled:opacity-60 hover:opacity-80 transition-opacity"
        aria-pressed={liked}
        aria-label={t("home.promoLike")}
      >
        <HeartIcon filled={liked} />
        <span className="text-xs font-semibold text-white tabular-nums drop-shadow-sm">
          {likeCount.toLocaleString()}
        </span>
      </button>
      <button
        type="button"
        onClick={() => void handleShare()}
        className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
        aria-label={t("home.promoShare")}
      >
        <ShareIcon />
        {shareHint && (
          <span className="text-[10px] font-medium text-white/90 drop-shadow-sm">
            {t("home.promoShareCopied")}
          </span>
        )}
      </button>
      {persisted && item.ownerUid && item.workId && (
        <button
          type="button"
          onClick={() => {
            if (authLoading) return;
            if (!user) {
              requestLogin();
              return;
            }
            setReportOpen(true);
          }}
          className="hover:opacity-80 transition-opacity"
          aria-label={t("watch.report")}
        >
          <ReportIcon />
        </button>
      )}
    </div>
  );

  const titleClass = tallMeta
    ? "text-xl md:text-2xl text-white font-bold leading-tight truncate"
    : "text-lg md:text-2xl text-white font-bold leading-tight truncate";
  const directorClass = `text-sm ${tallMeta ? "text-white/75 mt-1" : "text-white/80 mt-0.5 md:mt-1"}`;
  const descMeasureClass = tallMeta
    ? "mt-2 text-sm md:text-base text-white/85 leading-relaxed whitespace-pre-wrap break-words"
    : "text-xs md:text-sm text-white/65 mt-1.5 leading-snug whitespace-pre-wrap break-words";

  const teaserWatchHref =
    item.ownerUid && item.workId ? workWatchHref(item.ownerUid, item.workId) : null;

  const metaBlock = (
    <>
      {expandable && (
        <div
          ref={metaMeasureRef}
          className="invisible absolute left-0 right-0 top-0 px-4 md:px-6 pointer-events-none"
          aria-hidden
        >
          <h3 className={titleClass}>{item.title}</h3>
          <p className={directorClass}>{t("home.promoDirector", { name: item.director })}</p>
          {description ? <p className={descMeasureClass}>{description}</p> : null}
        </div>
      )}
      <div className="relative min-w-0 text-left shrink-0">
        <h3 className={titleClass}>{item.title}</h3>
        <p className={directorClass}>{t("home.promoDirector", { name: item.director })}</p>
        {effectiveFullscreen && teaserWatchHref ? (
          <Link
            href={teaserWatchHref}
            className="inline-block mt-2 text-sm font-semibold text-xiio-accent hover:text-white underline underline-offset-2"
          >
            {t("home.promoWatch", { title: item.title })}
          </Link>
        ) : null}
      </div>
      <div
        ref={metaScrollRef}
        className={`relative min-w-0 min-h-0 ${
          expandable && progress >= 1 ? "flex-1 overflow-y-auto overscroll-contain" : "overflow-hidden"
        }`}
      >
        <PromoDescriptionBlock
          description={description}
          tall={tallMeta}
          expandable={expandable}
          progress={progress}
          onToggle={toggle}
        />
      </div>
    </>
  );

  const fullscreenControls = !expandedEmbed && effectiveFullscreen ? (
    <div className="absolute top-3 right-3 z-20">
      <button
        type="button"
        onClick={onExitFullscreen}
        className="hover:opacity-80 transition-opacity"
        aria-label={t("shorts.exitFullscreen")}
      >
        <CollapseIcon />
      </button>
    </div>
  ) : null;

  const bottomOverlay = isTeaser || hideHeroChrome ? null : (
    <div
      className={`absolute inset-x-0 bottom-0 pointer-events-none ${
        expandable ? "h-auto min-h-[5rem]" : overlayBandClass
      }`}
      style={overlayBandStyle}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[6px] supports-[backdrop-filter]:bg-black/5" />
      <div
        className={`relative z-10 flex flex-col min-h-0 min-w-0 px-4 pt-3 pb-4 pr-[4.75rem] pointer-events-auto md:px-6 md:pt-3.5 md:pb-5 md:pr-20 ${
          expandable ? "overflow-hidden" : ""
        }`}
        style={expandable ? { maxHeight: bandMaxHeightPx } : undefined}
      >
        {metaBlock}
      </div>
      <div className="absolute right-3 bottom-3 z-20 flex flex-col items-center pointer-events-auto md:right-4 md:bottom-4">
        {actionButtons}
      </div>
    </div>
  );

  const teaserExpandTap =
    isTeaser && !peekSide && teaserCenterAction === "expand" ? (
      <button
        type="button"
        data-promo-expand
        onClick={() => {
          if (onTeaserExpandRequest) onTeaserExpandRequest();
          else onToggleFullscreen();
        }}
        className="absolute inset-0 z-[15] rounded-[14px] cursor-pointer bg-transparent border-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-xiio-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        aria-label={t("shorts.fullscreen")}
      />
    ) : null;

  const teaserWatchOverlay =
    isTeaser && !peekSide && teaserCenterAction === "watch-overlay" && teaserWatchHref ? (
      <Link
        href={teaserWatchHref}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        className="absolute inset-0 z-[15] rounded-[14px] focus:outline-none focus-visible:ring-2 focus-visible:ring-xiio-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        aria-label={t("home.promoWatch", { title: item.title })}
      />
    ) : null;

  const adjacentDimClass: Record<PromoShortPeekDimLevel, string> = {
    default: "bg-black/35",
    strong: "bg-black/55",
    expandedSide: "bg-black/50",
    expandedOuter: "bg-black/65",
  };

  const showThumbnailBackdrop = Boolean(item.thumbnailUrl) && (
    isTeaser || !videoReady || videoFailed
  );

  const useVideoOpacityFade = showThumbnailBackdrop || isTeaser;
  const overlayDimLevel = transitionDimLevel ?? (carouselAdjacentEmbed ? carouselAdjacentDimLevel : null);

  return (
    <>
      <LoginPromptDialog open={!authLoading && !user && loginReturnTo !== null} onClose={() => setLoginReturnTo(null)} returnTo={loginReturnTo ?? "/"} />
      {persisted && item.ownerUid && item.workId && (
        <ReportContentModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="promo"
          targetOwnerUid={item.ownerUid}
          targetWorkId={item.workId}
        />
      )}
      <div
        ref={cardRef}
        className={cardShellClass}
        style={cardAspectStyle}
      >
        {showThumbnailBackdrop && item.thumbnailUrl && (
          <img
            src={item.thumbnailUrl}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover ${videoObjectClass} transition-opacity duration-300 ${
              videoReady && !videoFailed ? "opacity-0" : "opacity-100"
            }`}
            loading="eager"
            decoding="async"
            style={videoFrameStyle}
          />
        )}
        {videoFailed && item.thumbnailUrl && !isTeaser ? (
          <img
            src={item.thumbnailUrl}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover ${videoObjectClass}`}
            style={videoFrameStyle}
          />
        ) : (
          <StreamHlsVideo
            ref={videoRef}
            src={item.videoUrl}
            className={`absolute inset-0 w-full h-full bg-black ${videoObjectClass} ${
              useVideoOpacityFade
                ? `transition-opacity duration-300 ${videoReady ? "opacity-100" : "opacity-0"}`
                : ""
            }`}
            style={videoFrameStyle}
            playsInline
            muted
            loop={loop}
            preload={videoPreload ?? (isActive ? "auto" : "none")}
            preferHighStart={isTeaser}
            autoPlay={shouldPlay}
            onReady={handleVideoReady}
            onLoadedMetadata={(event) => {
              const { videoWidth, videoHeight } = event.currentTarget;
              if (videoWidth > 0 && videoHeight > 0) {
                setVideoSourceSize({ width: videoWidth, height: videoHeight });
              }
            }}
            onEnded={
              onPlaybackEnded && isActive ? () => onPlaybackEnded() : undefined
            }
            onError={() => setVideoFailed(true)}
          />
        )}

        {overlayDimLevel ? (
          <div
            className={`absolute inset-0 z-[5] pointer-events-none transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${adjacentDimClass[overlayDimLevel]}`}
            aria-hidden
          />
        ) : null}

        {teaserExpandTap}
        {teaserWatchOverlay}
        {!isTeaser && fullscreenControls}
        {bottomOverlay}
      </div>
    </>
  );
}

export default function PromoShortPlayer({
  item,
  isActive,
  embedded = true,
  layout,
  variant = "default",
  playerSize = "default",
  peekSide = false,
  compact = false,
  scrollExpand = false,
  scrollRootRef,
  loop = true,
  onPlaybackEnded,
  playbackEnabled,
  preserveFrame = false,
  videoPreload,
  heroCarouselEmbed = false,
  carouselAdjacentEmbed = false,
  carouselAdjacentDimLevel = "default",
  transitionDimLevel = null,
  forcePortraitFrame = false,
  teaserCenterAction = "watch-overlay",
  expandedEmbed = false,
  showChrome,
  expandedChrome = false,
  onTeaserExpandRequest,
  onFullscreenChange,
  className = "",
}: {
  item: PromoShort;
  isActive: boolean;
  playbackEnabled?: boolean;
  preserveFrame?: boolean;
  videoPreload?: "auto" | "metadata" | "none";
  heroCarouselEmbed?: boolean;
  carouselAdjacentEmbed?: boolean;
  carouselAdjacentDimLevel?: PromoShortPeekDimLevel;
  transitionDimLevel?: PromoShortPeekDimLevel | null;
  forcePortraitFrame?: boolean;
  teaserCenterAction?: TeaserCenterAction;
  expandedEmbed?: boolean;
  showChrome?: boolean;
  expandedChrome?: boolean;
  onTeaserExpandRequest?: () => void;
  onFullscreenChange?: (active: boolean) => void;
  embedded?: boolean;
  layout?: PromoShortLayout;
  variant?: PromoShortVariant;
  playerSize?: PromoShortPlayerSize;
  peekSide?: boolean;
  /** 홈 스포트라이트 등 낮은 카드 높이 */
  compact?: boolean;
  /** true일 때 scrollRootRef(또는 카드) 안에서만 스크롤 펼침 */
  scrollExpand?: boolean;
  scrollRootRef?: RefObject<HTMLElement | null>;
  loop?: boolean;
  onPlaybackEnded?: () => void;
  className?: string;
}) {
  const resolvedLayout: PromoShortLayout = layout ?? "stacked";
  const useExpandedEmbed = expandedEmbed || expandedChrome;
  const useShowChrome = showChrome ?? useExpandedEmbed;
  const { ref, active, fallbackActive, toggle, exit } = useElementFullscreen<HTMLDivElement>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!useExpandedEmbed) onFullscreenChange?.(active);
  }, [active, useExpandedEmbed, onFullscreenChange]);

  const chrome = (
    <PlayerChrome
      item={item}
      isActive={isActive}
      isFullscreen={useExpandedEmbed ? false : active}
      expandedEmbed={useExpandedEmbed}
      showChrome={useShowChrome}
      layout={resolvedLayout}
      variant={variant}
      playerSize={playerSize}
      peekSide={peekSide}
      compact={compact}
      scrollExpand={scrollExpand}
      scrollRootRef={scrollRootRef}
      loop={loop}
      onPlaybackEnded={onPlaybackEnded}
      playbackEnabled={playbackEnabled}
      preserveFrame={preserveFrame}
      videoPreload={videoPreload}
      heroCarouselEmbed={heroCarouselEmbed}
      carouselAdjacentEmbed={carouselAdjacentEmbed}
      carouselAdjacentDimLevel={carouselAdjacentDimLevel}
      transitionDimLevel={transitionDimLevel}
      forcePortraitFrame={forcePortraitFrame}
      teaserCenterAction={teaserCenterAction}
      onTeaserExpandRequest={onTeaserExpandRequest}
      onToggleFullscreen={() => void toggle()}
      onExitFullscreen={() => void exit()}
    />
  );

  if (useExpandedEmbed) {
    return <div className={className}>{chrome}</div>;
  }

  const shellClass = active
    ? fallbackActive
      ? "fixed inset-0 z-[200] flex items-center justify-center bg-black"
      : "w-full h-full min-h-screen bg-black flex items-center justify-center"
    : className;

  const inner = (
    <div ref={ref} className={shellClass}>
      {chrome}
    </div>
  );

  if (fallbackActive && mounted) {
    return createPortal(inner, document.body);
  }

  return inner;
}
