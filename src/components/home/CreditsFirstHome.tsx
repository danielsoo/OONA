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
/** Set once the intro has played, so coming back to "/" in the app doesn't replay it. */
let introPlayedThisLoad = false;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The credits and the home are two screens, one stop apart. The browser's own
 * scroll snapping does the stopping (html[data-home-snap] and .snapStop in
 * the module CSS): a scroll down from the credits comes to rest at the top of
 * the home, and one up from there at the credits, with a trackpad's momentum
 * and a finger's fling carried by the browser rather than fought by script.
 * Inside the home, which is taller than the window, scrolling is free; each
 * row pops up as it comes into view.
 */
function useCreditsToHome(
  homeRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  glideRef: MutableRefObject<{ home: () => void; top: () => void } | null>
) {
  useEffect(() => {
    const home = homeRef.current;
    if (!enabled || !home || prefersReducedMotion()) return;
    const root = document.documentElement;
    root.dataset.homeSnap = "";

    // --- The pop ---
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

    // The last rows can sit inside the bottom margin even at the end of the
    // page; once the page can't scroll further, pop whatever is on screen.
    const onScroll = () => {
      if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 2) return;
      pop([...home.querySelectorAll(`.${styles.popPending}`)].filter((el) => el.getBoundingClientRect().top < window.innerHeight));
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const homeTop = () => home.getBoundingClientRect().top + window.scrollY;
    glideRef.current = {
      home: () => window.scrollTo({ top: homeTop(), behavior: "smooth" }),
      top: () => window.scrollTo({ top: 0, behavior: "smooth" }),
    };

    return () => {
      delete root.dataset.homeSnap;
      window.removeEventListener("scroll", onScroll);
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
 * credits") over a row of many small works, and one scroll down snaps to the
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
        <section className={`${creditsStyles.page} ${styles.first} ${styles.snapStop}`} aria-label={copy("Credits roll")}>
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
      <div ref={homeRef} className={styles.snapStop}>
        <CinematicHomePage />
      </div>
    </>
  );
}
