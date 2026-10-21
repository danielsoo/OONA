"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";
import { CreditsIntro, CreditsRoll, useCreditsRollFeed } from "@/components/credits/CreditsHome";
import creditsStyles from "@/components/credits/CreditsHome.module.css";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import { isDemoVisit } from "@/lib/demo-flags";
import { HOME_TO_TOP_EVENT } from "@/lib/home-events";
import { isNewVisit, markActive, readLastActiveAt } from "@/lib/visit-clock";
import CinematicHomePage from "./CinematicHomePage";
import HomeWorksStrip from "./HomeWorksStrip";
import CreditsLightIntro from "./CreditsLightIntro";
import styles from "./CreditsFirstHome.module.css";

const POP_STAGGER_MS = 90;
const GLIDE_MS = 820;
/** How far into the glide the arriving screen pops: it lands as the glide ends. */
const POP_AT = 0.35;
/**
 * After a glide or a stop at an edge, the rest of that scroll gesture (a
 * trackpad's momentum, which only ever fades) is swallowed, up to
 * HOLD_MAX_MS. Anything that isn't fading momentum gets through at once: a
 * pause in the wheel events, a change of direction, or a push that grows
 * again (a new swipe, even one that cuts the momentum short).
 */
const HOLD_MAX_MS = 1200;
const NEW_GESTURE_GAP_MS = 90;
/** Set once the intro has played, so coming back to "/" in the app doesn't replay it. */
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
  glideRef: MutableRefObject<{ home: () => void; top: () => void } | null>
) {
  useEffect(() => {
    const home = homeRef.current;
    if (!enabled || !home || prefersReducedMotion()) return;

    // Where the home starts, and where the credits end (their bottom edge at
    // the bottom of the window). Credits only a little taller than the window
    // count as one screen (end 0), so the first scroll goes straight to the
    // home rather than nudging a few pixels; only much taller ones (phones)
    // scroll inside first.
    const edges = () => {
      const top = home.getBoundingClientRect().top + window.scrollY;
      const overflow = top - window.innerHeight;
      return { top, end: overflow > window.innerHeight * 0.25 ? overflow : 0 };
    };
    // Glide only from one screen to the other: from the credits down, or from
    // the top of the home up. Already at (or almost at) the home, or still
    // inside a credits screen taller than the window, scrolling is normal.
    const snapTarget = (down: boolean): number | null => {
      const y = window.scrollY;
      const { top, end } = edges();
      const near = window.innerHeight * 0.2;
      if (down && y >= end - 2 && y < top - near) return top;
      if (!down && y > end + near && y <= top + 2) return end;
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
    // Each row inside the content block (rows that load late too).
    const collect = () => {
      home.querySelectorAll(":scope > main > div > *").forEach((el) => {
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
    const hold = (now: number) => {
      holdUntil = now + 160;
      holdCap = now + HOLD_MAX_MS;
    };
    let lastWheelAt = 0;
    let lastWheelSize = 0;
    let lastWheelSign = 0;
    const glide = (to: number) => {
      const from = window.scrollY;
      if (Math.abs(to - from) < 2) return;
      arm(true); // input during the glide is held back (see below)
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
        hold(now);
      };
      raf = requestAnimationFrame(step);
    };
    glideRef.current = { home: () => glide(edges().top), top: () => glide(0) };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const now = performance.now();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      const size = Math.abs(dy);
      const sign = Math.sign(dy);
      const newGesture = now - lastWheelAt > NEW_GESTURE_GAP_MS || sign !== lastWheelSign || size > lastWheelSize + 3;
      lastWheelAt = now;
      lastWheelSize = size;
      lastWheelSign = sign;
      if (gliding) {
        e.preventDefault();
        return;
      }
      if (now < holdUntil && !newGesture) {
        e.preventDefault();
        holdUntil = Math.min(holdCap, now + 160);
        return;
      }
      holdUntil = 0;
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
        hold(now);
      } else if (dy > 0 && y < end - 2 && y + dy >= end - 2) {
        e.preventDefault();
        window.scrollTo(0, end);
        hold(now);
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

    // Wheel and touchmove listeners that can cancel the scroll make the browser
    // wait for this script before every scroll step, so they're attached only
    // near the credits (up to a screen into the home), where a glide or an edge
    // stop can happen. Deeper in the home, scrolling is the browser's own.
    let armed = false;
    function arm(on: boolean) {
      if (on === armed) return;
      armed = on;
      if (on) {
        window.addEventListener("wheel", onWheel, { passive: false });
        window.addEventListener("touchmove", onTouchMove, { passive: false });
      } else {
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("touchmove", onTouchMove);
      }
    }
    const rearm = () => arm(gliding || window.scrollY <= edges().top + window.innerHeight);
    const onScrollArm = () => rearm();

    rearm();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScrollArm, { passive: true });
    window.addEventListener("resize", onScrollArm);

    return () => {
      arm(false);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScrollArm);
      window.removeEventListener("resize", onScrollArm);
      window.clearTimeout(settleTimer);
      cancelAnimationFrame(raf);
      glideRef.current = null;
      mutations.disconnect();
      observer.disconnect();
      targets.forEach((el) => el.classList.remove(styles.popPending, styles.popIn));
    };
  }, [homeRef, enabled, glideRef]);
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
 * over the credits, solid once the home's rows reach it.
 */
function useHomeHeaderState(homeRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const update = () => {
      raf = 0;
      const home = homeRef.current;
      if (!home) return;
      const header = document.querySelector<HTMLElement>("header");
      const mode = home.getBoundingClientRect().top < (header?.offsetHeight ?? 82) ? "solid" : "clear";
      if (root.dataset.homeHeader !== mode) root.dataset.homeHeader = mode;
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

/** Whether this page load began at "/" (not a later in-app move to it). */
function loadStartedAtHome(): boolean {
  const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!entry) return true;
  try {
    return new URL(entry.name).pathname === "/";
  } catch {
    return true;
  }
}

/**
 * Whether to play the light intro. Like an app's intro on a fresh launch: it
 * plays when someone arrives at "/" after being away a while (lib/visit-clock),
 * not on a reload or a new tab mid-visit, nor on coming back to "/" from
 * another page. "/?intro" always plays it, and so does every load of "/" in
 * the demo (lib/demo-flags), reloads included, so it's always there to show.
 *
 * On a fresh load at "/" the same conditions were already read before the
 * first paint (./intro-boot), and the dark has been over the page since; this
 * decides again, now that React is running, and either hands that dark to the
 * intro (CreditsLightIntro clears the attribute as it mounts) or lifts it.
 */
function useIntroOnce(): [boolean, () => void] {
  const [playing, setPlaying] = useState(false);
  // Before paint, so the page doesn't flash before the intro covers it.
  useLayoutEffect(() => {
    const asked = new URLSearchParams(window.location.search).has("intro");
    if (!asked) {
      if (
        introPlayedThisLoad ||
        prefersReducedMotion() ||
        window.location.hash ||
        !loadStartedAtHome() ||
        !(isNewVisit(readLastActiveAt(), Date.now()) || isDemoVisit())
      ) {
        delete document.documentElement.dataset.homeIntroPending;
        return;
      }
    }
    introPlayedThisLoad = true;
    markActive();
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
 * credits") over a row of many small works, and one scroll down glides to the
 * cinematic home, which pops in.
 * With no credits yet (or if they fail to load) the cinematic home shows as before.
 */
export default function CreditsFirstHome() {
  const copy = useUiCopy();
  const { works } = useCreditsRollFeed();
  const loading = works === null;
  const hasCredits = !loading && works.length > 0;

  const homeRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const glideRef = useRef<{ home: () => void; top: () => void } | null>(null);
  const [intro, endIntro] = useIntroOnce();
  useCreditsToHome(homeRef, hasCredits, glideRef);

  // "Home" pressed while already here: back up to the credits, as scrolling up does.
  useEffect(() => {
    const toTop = () => {
      if (glideRef.current) glideRef.current.top();
      else window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    };
    window.addEventListener(HOME_TO_TOP_EVENT, toTop);
    return () => window.removeEventListener(HOME_TO_TOP_EVENT, toTop);
  }, []);
  useRecedeOnScroll(innerRef, hasCredits);
  useHomeHeaderState(homeRef);

  const scrollToHome = useCallback(() => {
    if (glideRef.current) glideRef.current.home();
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
                <div className={styles.stripSlot}>
                  <HomeWorksStrip
                    action={
                      <button type="button" className={styles.cue} onClick={scrollToHome}>
                        <UiText text="Explore OONA" />
                        <DownIcon />
                      </button>
                    }
                  />
                </div>
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
