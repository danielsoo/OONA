"use client";

import { useEffect } from "react";

/** About a second and a half for the long tilt from the sea up to the sky; shorter hops are quicker. */
const GLIDE_MS_MAX = 1400;
const GLIDE_MS_MIN = 800;
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
 * Society as screens, the way the credits and the home are on "/"
 * (CreditsFirstHome): one scroll (wheel, swipe or key) glides from one stop
 * to the next — the sea, the sky above it, then each section marked with
 * data-glide-stop — and one scroll back glides to the one before. Past the
 * last stop, scrolling is normal again, and coming back up it rests there
 * first. `stops()` gives the stops' scroll positions, top to bottom.
 */
export function useSnapGlide(stops: () => number[], enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const points = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return [...new Set(stops().map((p) => Math.round(Math.max(0, Math.min(max, p)))))].sort((a, b) => a - b);
    };
    const snapTarget = (down: boolean): number | null => {
      const y = window.scrollY;
      const pts = points();
      if (pts.length < 2) return null;
      const last = pts[pts.length - 1]!;
      if (down) return y < last - 2 ? pts.find((p) => p > y + 2) ?? null : null;
      if (y > last + 2 || y <= pts[0]! + 2) return null;
      return [...pts].reverse().find((p) => p < y - 2) ?? null;
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
      const ms = Math.max(GLIDE_MS_MIN, Math.min(GLIDE_MS_MAX, 500 + Math.abs(to - from) * 0.6));
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
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
      // Scrolling back up from the page below: stop at the last stop first,
      // so a long fling doesn't carry straight past it.
      const y = window.scrollY;
      const pts = points();
      const last = pts[pts.length - 1];
      if (last !== undefined && dy < 0 && y > last + 2 && y + dy <= last + 2) {
        e.preventDefault();
        window.scrollTo(0, last);
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

    // A swipe glides only if it starts where one would.
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

    // A scroll that comes to rest between two stops (the scrollbar, a fling)
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
        const pts = points();
        const below = [...pts].reverse().find((p) => p <= now + 2);
        const above = pts.find((p) => p >= now - 2);
        if (below === undefined || above === undefined || Math.abs(above - below) <= 4) return;
        if (Math.abs(now - below) <= 2 || Math.abs(now - above) <= 2) return;
        const barely = (above - below) * 0.2;
        if (direction > 0) glide(now - below < barely ? below : above);
        else glide(above - now < barely ? above : below);
      }, 160);
    };

    // Listeners that can cancel a scroll make the browser wait for this script
    // on every scroll step, so they're attached only near the stops.
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
    const rearm = () => {
      const pts = points();
      arm(gliding || window.scrollY <= (pts[pts.length - 1] ?? 0) + window.innerHeight);
    };

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
  }, [stops, enabled]);
}
