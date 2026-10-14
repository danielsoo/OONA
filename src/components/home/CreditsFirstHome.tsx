"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";
import { CreditsIntro, CreditsRoll, useCreditsRollFeed } from "@/components/credits/CreditsHome";
import creditsStyles from "@/components/credits/CreditsHome.module.css";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import CinematicHomePage from "./CinematicHomePage";
import CreditsLightIntro from "./CreditsLightIntro";
import styles from "./CreditsFirstHome.module.css";

const POP_STAGGER_MS = 90;
const GLIDE_MS = 820;
/** How far into the glide the arriving screen pops: it lands as the glide ends. */
const POP_AT = 0.35;
/** After a glide or a stop at an edge, the rest of that scroll gesture is swallowed. */
const HOLD_MIN_MS = 450;
const HOLD_MAX_MS = 1400;
/**
 * The light intro plays once per page load: opening the site or reloading
 * it, not coming back to "/" from another page of the app (this survives
 * client-side navigation, not a reload). "/?intro" always plays it.
 */
let introPlayedThisLoad = false;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function isTypingTarget(target: EventTarget | null, space: boolean): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("input, textarea, select, [contenteditable='true']")) return true;
  // Space activates buttons and links; leave it to them.
  return space && !!target.closest("button, a, summary, video, audio");
}

/**
 * The credits and the home are two screens. One scroll down (wheel, swipe or
 * key) from the credits glides all the way to the home, which pops in as it
 * lands; one scroll up from the top of the home glides back. Inside the home,
 * scrolling is normal and each row pops up as it comes into view.
 */
function useCreditsToHome(
  homeRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  goHomeRef: MutableRefObject<(() => void) | null>
) {
  useEffect(() => {
    const home = homeRef.current;
    if (!enabled || !home || prefersReducedMotion()) return;

    // Where the home starts, and where the credits end (their bottom edge at
    // the bottom of the window; above 0 only when they are taller than it).
    const edges = () => {
      const top = home.getBoundingClientRect().top + window.scrollY;
      return { top, end: Math.max(0, top - window.innerHeight) };
    };
    const snapTarget = (down: boolean): number | null => {
      const y = window.scrollY;
      const { top, end } = edges();
      if (down && y >= end - 2 && y < top - 2) return top;
      if (!down && y > end + 2 && y <= top + 2) return end;
      return null;
    };

    // --- The pop ---
    let gliding = false;
    const targets = new Set<Element>();
    const pop = (els: Element[]) => {
      els.forEach((el, i) => {
        observer.unobserve(el);
        (el as HTMLElement).style.animationDelay = `${i * POP_STAGGER_MS}ms`;
        el.classList.remove(styles.popPending);
        el.classList.add(styles.popIn);
      });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (gliding) return; // the glide pops the screen it lands on
        pop(
          entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
            .map((entry) => entry.target)
        );
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0 }
    );
    // The hero, and each row inside the content block (rows that load late too).
    const collect = () => {
      home.querySelectorAll(":scope > main > section, :scope > main > div > *").forEach((el) => {
        if (targets.has(el)) return;
        targets.add(el);
        el.classList.add(styles.popPending);
        observer.observe(el);
      });
    };
    collect();
    const mutations = new MutationObserver(collect);
    mutations.observe(home, { childList: true, subtree: true });

    /** What will be on screen once the window's top is at `top`. */
    const screenAt = (top: number) =>
      [...targets]
        .map((el) => ({ el, rect: el.getBoundingClientRect() }))
        .filter(({ rect }) => {
          const elTop = rect.top + window.scrollY;
          return elTop < top + window.innerHeight * 0.94 && rect.bottom + window.scrollY > top;
        })
        .sort((a, b) => a.rect.top - b.rect.top)
        .map(({ el }) => el);

    // --- The glide ---
    let raf = 0;
    let holdUntil = 0;
    let holdCap = 0;
    const hold = (now: number, min: number) => {
      holdUntil = now + min;
      holdCap = now + HOLD_MAX_MS;
    };
    const glide = (to: number) => {
      const from = window.scrollY;
      if (Math.abs(to - from) < 2) return;
      // Going down, the screen it lands on pops in again every time.
      const arriving = to > from ? screenAt(to) : [];
      arriving.forEach((el) => {
        observer.unobserve(el);
        el.classList.remove(styles.popIn);
        el.classList.add(styles.popPending);
      });
      let popped = arriving.length === 0;
      gliding = true;
      cancelAnimationFrame(raf);
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / GLIDE_MS);
        window.scrollTo(0, from + (to - from) * easeInOutCubic(t));
        if (!popped && t >= POP_AT) {
          popped = true;
          pop(arriving);
        }
        if (t < 1) {
          raf = requestAnimationFrame(step);
          return;
        }
        gliding = false;
        hold(now, HOLD_MIN_MS);
      };
      raf = requestAnimationFrame(step);
    };
    goHomeRef.current = () => glide(edges().top);

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const now = performance.now();
      if (gliding) {
        e.preventDefault();
        return;
      }
      if (now < holdUntil) {
        e.preventDefault();
        holdUntil = Math.min(holdCap, now + 160);
        return;
      }
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      const to = snapTarget(dy > 0);
      if (to !== null) {
        e.preventDefault();
        glide(to);
        return;
      }
      // Scrolling toward the other screen from inside one: stop at the edge
      // first, so a long fling doesn't carry straight over.
      const y = window.scrollY;
      const { top, end } = edges();
      if (dy < 0 && y > top + 2 && y + dy <= top + 2) {
        e.preventDefault();
        window.scrollTo(0, top);
        hold(now, 200);
      } else if (dy > 0 && y < end - 2 && y + dy >= end - 2) {
        e.preventDefault();
        window.scrollTo(0, end);
        hold(now, 200);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const space = e.key === " ";
      let down: boolean;
      if (e.key === "ArrowDown" || e.key === "PageDown" || (space && !e.shiftKey)) down = true;
      else if (e.key === "ArrowUp" || e.key === "PageUp" || (space && e.shiftKey)) down = false;
      else return;
      if (isTypingTarget(e.target, space)) return;
      if (gliding) {
        e.preventDefault();
        return;
      }
      const to = snapTarget(down);
      if (to === null) return;
      e.preventDefault();
      glide(to);
    };

    // A swipe glides only if it starts at an edge; one that scrolls up to an
    // edge stops there (or settles, below), and the next swipe crosses over.
    let touch: { x: number; y: number; down: boolean; up: boolean; done: boolean } | null = null;
    let touching = false;
    const onTouchStart = (e: TouchEvent) => {
      touching = true;
      const t = e.touches[0];
      touch =
        e.touches.length === 1 && t
          ? { x: t.clientX, y: t.clientY, down: snapTarget(true) !== null, up: snapTarget(false) !== null, done: false }
          : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!touch || !t) return;
      if (gliding || touch.done) {
        if (e.cancelable) e.preventDefault();
        return;
      }
      const dy = touch.y - t.clientY; // > 0: the finger moves up, the page scrolls down
      if (dy === 0 || Math.abs(dy) < Math.abs(t.clientX - touch.x)) return;
      if (!(dy > 0 ? touch.down : touch.up)) return;
      const to = snapTarget(dy > 0);
      if (to === null) return;
      if (e.cancelable) e.preventDefault();
      if (Math.abs(dy) > 28) {
        touch.done = true;
        glide(to);
      }
    };
    const onTouchEnd = () => {
      touching = false;
      touch = null;
    };

    // A scroll that comes to rest between the two screens (a fling, the
    // scrollbar) goes back to the edge it just crossed if it barely crossed
    // it, and otherwise finishes the trip in the direction it was going.
    let lastY = window.scrollY;
    let direction = 1;
    let settleTimer = 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (y !== lastY) direction = y > lastY ? 1 : -1;
      lastY = y;
      // The last rows can sit inside the bottom margin even at the end of the
      // page; once the page can't scroll further, pop whatever is on screen.
      if (window.innerHeight + y >= document.documentElement.scrollHeight - 2) {
        pop([...home.querySelectorAll(`.${styles.popPending}`)].filter((el) => el.getBoundingClientRect().top < window.innerHeight));
      }
      window.clearTimeout(settleTimer);
      if (gliding) return;
      settleTimer = window.setTimeout(() => {
        if (gliding || touching) return;
        const now = window.scrollY;
        const { top, end } = edges();
        if (now <= end + 2 || now >= top - 2) return;
        const barely = window.innerHeight * 0.25;
        if (direction > 0) glide(now - end < barely ? end : top);
        else glide(top - now < barely ? top : end);
      }, 160);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(settleTimer);
      cancelAnimationFrame(raf);
      goHomeRef.current = null;
      mutations.disconnect();
      observer.disconnect();
      targets.forEach((el) => el.classList.remove(styles.popPending, styles.popIn));
    };
  }, [homeRef, enabled, goHomeRef]);
}

/** As the page leaves the credits, they shrink back and dim a little. */
function useRecedeOnScroll(targetRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const target = targetRef.current;
    if (!enabled || !target || prefersReducedMotion()) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const height = target.offsetHeight || window.innerHeight;
      const p = Math.min(1, Math.max(0, window.scrollY / (height * 0.9)));
      target.style.transform = `scale(${(1 - 0.06 * p).toFixed(4)})`;
      target.style.opacity = (1 - 0.5 * p).toFixed(3);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      target.style.transform = "";
      target.style.opacity = "";
    };
  }, [targetRef, enabled]);
}

/**
 * The header stays on screen on "/" (CinematicAppHeader .homeHeader): clear
 * over the credits and the hero, solid once the rows below pass under it.
 */
function useHomeHeaderState(homeRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const update = () => {
      raf = 0;
      const home = homeRef.current;
      if (!home) return;
      const hero = home.querySelector<HTMLElement>(":scope > main > section");
      const header = document.querySelector<HTMLElement>("header");
      const heroBottom = home.getBoundingClientRect().top + (hero?.offsetHeight ?? 0);
      root.dataset.homeHeader = heroBottom < (header?.offsetHeight ?? 82) ? "solid" : "clear";
    };
    const onChange = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange);
    return () => {
      window.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
      cancelAnimationFrame(raf);
      delete root.dataset.homeHeader;
    };
  }, [homeRef]);
}

/** Whether to play the light intro: once per page load, or whenever asked for with "?intro". */
function useIntroOnce(): [boolean, () => void] {
  const [playing, setPlaying] = useState(false);
  // Before paint, so the page doesn't flash before the intro covers it.
  useLayoutEffect(() => {
    const asked = new URLSearchParams(window.location.search).has("intro");
    if (!asked && (introPlayedThisLoad || prefersReducedMotion() || window.location.hash)) return;
    introPlayedThisLoad = true;
    // A reload would otherwise put the page back where it was scrolled to.
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    setPlaying(true);
  }, []);
  return [playing, useCallback(() => setPlaying(false), [])];
}

function DownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The main home: the credits roll fills the first screen ("Stay for the
 * credits"), and one scroll down glides to the cinematic home, which pops in.
 * With no credits yet (or if they fail to load) the cinematic home shows as before.
 */
export default function CreditsFirstHome() {
  const copy = useUiCopy();
  const { works } = useCreditsRollFeed();
  const loading = works === null;
  const hasCredits = !loading && works.length > 0;

  const homeRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const goHomeRef = useRef<(() => void) | null>(null);
  const [intro, endIntro] = useIntroOnce();
  useCreditsToHome(homeRef, hasCredits, goHomeRef);
  useRecedeOnScroll(innerRef, hasCredits);
  useHomeHeaderState(homeRef);

  const scrollToHome = useCallback(() => {
    if (goHomeRef.current) goHomeRef.current();
    else homeRef.current?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <>
      {intro ? <CreditsLightIntro ready={hasCredits ? true : loading ? null : false} onDone={endIntro} /> : null}
      {loading || hasCredits ? (
        <section className={`${creditsStyles.page} ${styles.first}`} aria-label={copy("Credits roll")}>
          <div ref={innerRef} className={styles.firstInner}>
            {hasCredits ? (
              <>
                <CreditsIntro />
                <CreditsRoll works={works} held={intro} />
                <button type="button" className={styles.cue} onClick={scrollToHome}>
                  <UiText text="Explore OONA" />
                  <DownIcon />
                </button>
              </>
            ) : (
              <p className={styles.loading} role="status">
                <UiText text="Loading the credits…" />
              </p>
            )}
          </div>
        </section>
      ) : null}
      <div ref={homeRef}>
        <CinematicHomePage />
      </div>
    </>
  );
}
