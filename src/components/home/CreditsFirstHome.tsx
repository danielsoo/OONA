"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { CreditsIntro, CreditsRoll, useCreditsRollFeed, useLayoutChoice } from "@/components/credits/CreditsHome";
import creditsStyles from "@/components/credits/CreditsHome.module.css";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import CinematicHomePage from "./CinematicHomePage";
import styles from "./CreditsFirstHome.module.css";

const POP_STAGGER_MS = 90;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Each part of the home (the hero, then every row) waits hidden until it
 * scrolls into view, then springs up. Rows that appear later (feeds that
 * load after the first paint) are picked up as they are added.
 */
function usePopReveal(rootRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root || prefersReducedMotion()) return;

    const seen = new WeakSet<Element>();
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
    // The last rows can sit inside the bottom margin even at the end of the
    // page; once the page can't scroll further, pop whatever is on screen.
    const onScroll = () => {
      if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 2) return;
      pop([...root.querySelectorAll(`.${styles.popPending}`)].filter((el) => el.getBoundingClientRect().top < window.innerHeight));
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // The hero, and each row inside the content block.
    const collect = () => {
      root.querySelectorAll(":scope > main > section, :scope > main > div > *").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        el.classList.add(styles.popPending);
        observer.observe(el);
      });
    };
    collect();
    const mutations = new MutationObserver(collect);
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      mutations.disconnect();
      observer.disconnect();
      root.querySelectorAll(`.${styles.popPending}, .${styles.popIn}`).forEach((el) => {
        el.classList.remove(styles.popPending, styles.popIn);
      });
    };
  }, [rootRef, enabled]);
}

/** As the page scrolls past the credits, they shrink back and dim a little. */
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

function DownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The main home: the credits roll fills the first screen ("Stay for the
 * credits"), and scrolling down pops the cinematic home into view. With no
 * credits yet (or if they fail to load) the cinematic home shows as before.
 */
export default function CreditsFirstHome() {
  const copy = useUiCopy();
  const { works } = useCreditsRollFeed();
  const [layout, setLayout] = useLayoutChoice();
  const loading = works === null;
  const hasCredits = !loading && works.length > 0;

  const homeRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  usePopReveal(homeRef, hasCredits);
  useRecedeOnScroll(innerRef, hasCredits);

  const scrollToHome = useCallback(() => {
    homeRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }, []);

  return (
    <>
      {loading || hasCredits ? (
        <section className={`${creditsStyles.page} ${styles.first}`} aria-label={copy("Credits roll")}>
          <div ref={innerRef} className={styles.firstInner}>
            {hasCredits ? (
              <>
                <CreditsIntro layout={layout} onLayout={setLayout} />
                <CreditsRoll works={works} layout={layout} />
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
