"use client";

import { useCallback, useEffect, useRef } from "react";
import UiText from "@/components/i18n/UiText";
import styles from "./CreditsLightIntro.module.css";

/** Length of the CSS part (spotlight, the lit O, the line); see the module's keyframes. */
const BURST_MS = 1900;
/** If the credits still haven't loaded by then, the intro just fades away. */
const GIVE_UP_MS = 6000;

// The second "O" of the wordmark: a ring split by a horizontal slit (XiioWordmark).
const ARC_X = 19.375;
const ARC_Y = 2.2;

/**
 * The first visit to "/": in the dark, a spotlight snaps on from the top and
 * pours down onto the slit "O" of the wordmark. Light fills the slit, the O
 * opens and the light stretches into a line that flies to the credit roll's
 * center line and opens into its frame, while the dark falls away.
 *
 * `ready`: true once the roll is on the page, false if there are no credits
 * (the intro then just fades to the home), null while loading.
 * Any wheel, touch, click or key skips it.
 */
export default function CreditsLightIntro({ ready, onDone }: { ready: boolean | null; onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const lineARef = useRef<HTMLDivElement>(null);
  const lineBRef = useRef<HTMLDivElement>(null);
  const state = useRef({ burstDone: false, leaving: false, ready });
  state.current.ready = ready;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const fadeAway = useCallback((ms: number) => {
    const root = rootRef.current;
    if (!root || state.current.leaving) return;
    state.current.leaving = true;
    root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: "ease", fill: "forwards" })
      .finished.then(() => onDoneRef.current(), () => onDoneRef.current());
  }, []);

  const land = useCallback(() => {
    const root = rootRef.current;
    const wrap = wrapRef.current;
    const lineA = lineARef.current;
    const lineB = lineBRef.current;
    if (!root || !wrap || !lineA || !lineB || state.current.leaving) return;
    const target = document.querySelector<HTMLElement>("[data-credits-center]")?.getBoundingClientRect();
    const onScreen = !!target && target.width > 0 && target.top >= 0 && target.bottom <= window.innerHeight;
    if (!onScreen) {
      fadeAway(700);
      return;
    }
    state.current.leaving = true;
    root.classList.add(styles.leaving);
    const from = lineA.getBoundingClientRect();
    const dx = target.left + target.width / 2 - window.innerWidth / 2;
    const dy = target.top + target.height / 2 - window.innerHeight / 2;
    const sx = from.width > 0 ? target.width / from.width : 1;
    const finish = () => onDoneRef.current();
    wrap
      .animate([{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scaleX(${sx})` }], {
        duration: 760,
        easing: "cubic-bezier(0.65, 0, 0.35, 1)",
        fill: "forwards",
      })
      .finished.then(() => {
        // The line opens into the two edges of the band that holds the name,
        // the way the O opened to let the light out.
        const half = target.height / 2;
        const open = { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" as const };
        lineA.animate([{ transform: "none" }, { transform: `translateY(${-half}px)` }], open);
        return lineB.animate([{ transform: "none" }, { transform: `translateY(${half}px)` }], open).finished;
      })
      .then(() => wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, fill: "forwards" }).finished)
      .then(finish, finish);
  }, [fadeAway]);

  // The CSS part plays first; then land on the roll, or fade if there is none.
  useEffect(() => {
    const burst = window.setTimeout(() => {
      state.current.burstDone = true;
      if (state.current.ready === true) land();
      else if (state.current.ready === false) fadeAway(600);
    }, BURST_MS);
    const giveUp = window.setTimeout(() => fadeAway(600), GIVE_UP_MS);
    return () => {
      window.clearTimeout(burst);
      window.clearTimeout(giveUp);
    };
  }, [land, fadeAway]);

  useEffect(() => {
    if (!state.current.burstDone) return;
    if (ready === true) land();
    else if (ready === false) fadeAway(600);
  }, [ready, land, fadeAway]);

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
        <div className={styles.flash} />
        <div className={styles.spot}>
          <div className={styles.cone} />
        </div>
        <div className={styles.pool} />
        <div className={styles.haze} />
        <svg className={styles.mark} viewBox="-30 -30 60 60">
          <path className={styles.arcTop} d={`M${-ARC_X} ${-ARC_Y}A19.5 19.5 0 0 1 ${ARC_X} ${-ARC_Y}`} />
          <path className={styles.arcBottom} d={`M${ARC_X} ${ARC_Y}A19.5 19.5 0 0 1 ${-ARC_X} ${ARC_Y}`} />
        </svg>
        <p className={styles.tagline}>
          <UiText text="Stay for the credits" />
        </p>
      </div>
      <div ref={wrapRef} className={styles.lines}>
        <div ref={lineARef} className={styles.line} />
        <div ref={lineBRef} className={`${styles.line} ${styles.lineB}`} />
      </div>
    </div>
  );
}
