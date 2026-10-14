"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import UiText from "@/components/i18n/UiText";
import styles from "./CreditsLightIntro.module.css";

/** Length of the CSS part (the light, the lit O); see the module's keyframes. */
const BURST_MS = 1900;
/** If the page still hasn't settled by then, the O goes to the logo anyway. */
const GIVE_UP_MS = 6000;
const FLIGHT_MS = 950;

// The second "O" of the wordmark: a ring split by a horizontal slit. Same
// geometry as XiioWordmark (viewBox 0 0 234 58, this O centered at 88,29).
const ARC_X = 19.375;
const ARC_Y = 2.2;
const WORDMARK_W = 234;
const WORDMARK_H = 58;
const WORDMARK_O = { x: 88, y: 29 };

/**
 * The first visit to "/": in the dark, a small light snaps on above the
 * center and a narrow beam falls from it onto the slit "O" of the wordmark,
 * catching its top edge first, then the whole O, with a pool of light under
 * it and faint rings around it. Then the O rises to the header, lands on the
 * wordmark's own O and the wordmark appears around it, while the dark falls
 * away to the page.
 *
 * `ready`: null while the credits are loading (the O waits); otherwise the
 * page is ready to show. Any wheel, touch, click or key skips the intro.
 * Whether it plays at all (a new visit, reduced motion) is up to the caller,
 * CreditsFirstHome; "/?intro" plays it even with reduced motion.
 */
export default function CreditsLightIntro({ ready, onDone }: { ready: boolean | null; onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const emblemRef = useRef<HTMLDivElement>(null);
  const slitRef = useRef<HTMLDivElement>(null);
  const state = useRef({ burstDone: false, leaving: false, ready });
  state.current.ready = ready;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // The header's wordmark stays hidden until the O arrives (CinematicAppHeader).
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.homeIntro = "";
    return () => {
      delete root.dataset.homeIntro;
    };
  }, []);

  const fadeAway = useCallback((ms: number) => {
    const root = rootRef.current;
    if (!root || state.current.leaving) return;
    state.current.leaving = true;
    delete document.documentElement.dataset.homeIntro;
    root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: "ease", fill: "forwards" })
      .finished.then(() => onDoneRef.current(), () => onDoneRef.current());
  }, []);

  const flyToLogo = useCallback(() => {
    const root = rootRef.current;
    const emblem = emblemRef.current;
    if (!root || !emblem || state.current.leaving) return;
    const logo = document.querySelector<SVGSVGElement>("[data-home-logo] svg")?.getBoundingClientRect();
    if (!logo || logo.width === 0 || logo.bottom < 0) {
      fadeAway(700);
      return;
    }
    state.current.leaving = true;
    root.classList.add(styles.leaving);

    // Where the wordmark's O is on screen (the SVG keeps its aspect, centered).
    const unit = Math.min(logo.width / WORDMARK_W, logo.height / WORDMARK_H);
    const left = logo.left + (logo.width - WORDMARK_W * unit) / 2;
    const top = logo.top + (logo.height - WORDMARK_H * unit) / 2;
    const size = 60 * unit; // the emblem's viewBox is 60 units across
    const from = emblem.getBoundingClientRect();
    const to = {
      left: left + WORDMARK_O.x * unit - size / 2,
      top: top + WORDMARK_O.y * unit - size / 2,
    };
    // Box, not transform: the arcs keep a fixed stroke width (non-scaling),
    // so the O lands drawn exactly like the wordmark.
    const flight = emblem.animate(
      [
        { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` },
        { left: `${to.left}px`, top: `${to.top}px`, width: `${size}px`, height: `${size}px` },
      ],
      { duration: FLIGHT_MS, easing: "cubic-bezier(0.65, 0, 0.3, 1)", fill: "forwards" }
    );
    emblem.querySelectorAll("path").forEach((arc) => {
      arc.animate([{ strokeWidth: "2.4px" }, { strokeWidth: "1.85px" }], { duration: FLIGHT_MS, fill: "forwards" });
    });
    slitRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FLIGHT_MS * 0.5, fill: "forwards" });
    emblem.animate([{ filter: "drop-shadow(0 0 5px rgba(185, 190, 255, 0.75))" }, { filter: "none" }], {
      duration: FLIGHT_MS,
      fill: "forwards",
    });
    // The rest of the wordmark comes in as the O arrives.
    const reveal = window.setTimeout(() => {
      delete document.documentElement.dataset.homeIntro;
    }, FLIGHT_MS * 0.82);
    const finish = () => {
      window.clearTimeout(reveal);
      onDoneRef.current();
    };
    flight.finished
      .then(() => emblem.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" }).finished)
      .then(finish, finish);
  }, [fadeAway]);

  // The CSS part plays first; then the O goes once the page behind is ready.
  useEffect(() => {
    const burst = window.setTimeout(() => {
      state.current.burstDone = true;
      if (state.current.ready !== null) flyToLogo();
    }, BURST_MS);
    const giveUp = window.setTimeout(flyToLogo, GIVE_UP_MS);
    return () => {
      window.clearTimeout(burst);
      window.clearTimeout(giveUp);
    };
  }, [flyToLogo]);

  useEffect(() => {
    if (state.current.burstDone && ready !== null) flyToLogo();
  }, [ready, flyToLogo]);

  // Any input skips it. The page underneath doesn't scroll meanwhile.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const skip = (e: Event) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      fadeAway(320);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      skip(e);
    };
    root.addEventListener("wheel", skip, { passive: false });
    root.addEventListener("touchstart", skip, { passive: false });
    root.addEventListener("touchmove", skip, { passive: false });
    root.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      root.removeEventListener("wheel", skip);
      root.removeEventListener("touchstart", skip);
      root.removeEventListener("touchmove", skip);
      root.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, [fadeAway]);

  return (
    <div ref={rootRef} className={styles.intro} aria-hidden="true">
      <div className={styles.backdrop} />
      <div className={styles.fx}>
        <svg className={styles.rings} viewBox="-100 -100 200 200">
          <circle r="34" />
          <circle r="58" />
          <circle r="86" />
        </svg>
        <div className={styles.beam}>
          <div className={styles.shaft} />
        </div>
        <div className={styles.source} />
        <div className={styles.pool} />
        <p className={styles.tagline}>
          <UiText text="Stay for the credits" />
        </p>
      </div>
      <div ref={emblemRef} className={styles.emblem}>
        <svg className={styles.mark} viewBox="-30 -30 60 60">
          <path className={styles.arcTop} d={`M${-ARC_X} ${-ARC_Y}A19.5 19.5 0 0 1 ${ARC_X} ${-ARC_Y}`} />
          <path className={styles.arcBottom} d={`M${ARC_X} ${ARC_Y}A19.5 19.5 0 0 1 ${-ARC_X} ${ARC_Y}`} />
        </svg>
        <div ref={slitRef} className={styles.slit}>
          <div className={styles.slitLight} />
        </div>
      </div>
    </div>
  );
}
