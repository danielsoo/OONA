"use client";

import { useEffect, type RefObject } from "react";

/** About a second and a half: long enough to feel the view tilt up. */
const GLIDE_MS = 1400;
/** After a glide, the rest of the same wheel or trackpad gesture is held back, at most this long. */
const HOLD_MAX_MS = 1200;
const NEW_GESTURE_GAP_MS = 90;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function isTypingTarget(target: EventTarget | null, space: boolean): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("input, textarea, select, [contenteditable='true']")) return true;
  // Space activates buttons and links; leave it to them.
  return space && !!target.closest("button, a, summary, video, audio");
}

/**
 * The sea and the sky above it are two screens, as the credits and the home
 * are on "/" (CreditsFirstHome): one scroll down (wheel, swipe or key) on the
 * sea glides all the way up into the sky, and one scroll up in the sky glides
 * back down to the sea. Below the sky, scrolling is normal.
 *
 * `sectionRef` is the pinned section whose scroll position drives the scene.
 */
export function useSkyGlide(sectionRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const section = sectionRef.current;
    if (!enabled || !section) return;

    const edges = () => {
      const sea = section.getBoundingClientRect().top + window.scrollY;
      return { sea, sky: sea + Math.max(0, section.offsetHeight - window.innerHeight) };
    };
    const snapTarget = (down: boolean): number | null => {
      const y = window.scrollY;
      const { sea, sky } = edges();
      const near = window.innerHeight * 0.2;
      if (down && y >= sea - 2 && y < sky - near) return sky;
      if (!down && y > sea + near && y <= sky + 2) return sea;
      return null;
    };

    let gliding = false;
    let raf = 0;
    let holdUntil = 0;
    let holdCap = 0;
    const hold = (now: number) => {
      holdUntil = now + 160;
      holdCap = now + HOLD_MAX_MS;
    };
    const glide = (to: number) => {
      const from = window.scrollY;
      if (Math.abs(to - from) < 2) return;
      arm(true);
      gliding = true;
      cancelAnimationFrame(raf);
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / GLIDE_MS);
        window.scrollTo(0, from + (to - from) * easeInOutCubic(t));
        if (t < 1) {
          raf = requestAnimationFrame(step);
          return;
        }
        gliding = false;
        hold(now);
      };
      raf = requestAnimationFrame(step);
    };

    let lastWheelAt = 0;
    let lastWheelSize = 0;
    let lastWheelSign = 0;
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
      // Scrolling back up from the page below: stop at the sky first, so a
      // long fling doesn't carry straight down to the sea.
      const y = window.scrollY;
      const { sky } = edges();
      if (dy < 0 && y > sky + 2 && y + dy <= sky + 2) {
        e.preventDefault();
        window.scrollTo(0, sky);
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

    // A swipe glides only if it starts on one of the two screens.
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

    // A scroll that comes to rest between sea and sky (the scrollbar, a fling)
    // finishes the trip it started, or goes back if it barely left.
    let lastY = window.scrollY;
    let direction = 1;
    let settleTimer = 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (y !== lastY) direction = y > lastY ? 1 : -1;
      lastY = y;
      window.clearTimeout(settleTimer);
      if (gliding) return;
      settleTimer = window.setTimeout(() => {
        if (gliding || touching) return;
        const now = window.scrollY;
        const { sea, sky } = edges();
        if (now <= sea + 2 || now >= sky - 2) return;
        const barely = (sky - sea) * 0.2;
        if (direction > 0) glide(now - sea < barely ? sea : sky);
        else glide(sky - now < barely ? sky : sea);
      }, 160);
    };

    // Listeners that can cancel a scroll make the browser wait for this script
    // on every scroll step, so they're attached only near the sea and sky.
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
    const rearm = () => arm(gliding || window.scrollY <= edges().sky + window.innerHeight);

    rearm();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", rearm, { passive: true });
    window.addEventListener("resize", rearm);

    return () => {
      arm(false);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", rearm);
      window.removeEventListener("resize", rearm);
      window.clearTimeout(settleTimer);
      cancelAnimationFrame(raf);
    };
  }, [sectionRef, enabled]);
}
