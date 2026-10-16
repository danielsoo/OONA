"use client";

import { useEffect } from "react";
import { prefetchPublicWatch } from "@/lib/watchDataCache";

/** How long the pointer rests on a work before its watch data is fetched. */
const HOVER_DWELL_MS = 150;

function watchTarget(event: Event): [string, string] | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const anchor = target.closest<HTMLAnchorElement>('a[href^="/watch/"]');
  const href = anchor?.getAttribute("href");
  if (!href) return null;
  const parts = href.split("/").filter(Boolean);
  if (parts.length !== 3 || parts[0] !== "watch") return null;
  return [parts[1]!, parts[2]!];
}

function prefetchNow(event: Event) {
  const target = watchTarget(event);
  if (target) prefetchPublicWatch(target[0], target[1]);
}

export default function WatchRoutePrefetcher() {
  useEffect(() => {
    // Hover waits a moment: cards that only slide under a resting cursor while
    // the page scrolls shouldn't each start a fetch. Focus and touch are deliberate.
    let timer = 0;
    const onPointerOver = (event: Event) => {
      window.clearTimeout(timer);
      const target = watchTarget(event);
      if (target) timer = window.setTimeout(() => prefetchPublicWatch(target[0], target[1]), HOVER_DWELL_MS);
    };
    const onPointerOut = () => window.clearTimeout(timer);
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    document.addEventListener("focusin", prefetchNow);
    document.addEventListener("touchstart", prefetchNow, { passive: true });
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("focusin", prefetchNow);
      document.removeEventListener("touchstart", prefetchNow);
    };
  }, []);

  return null;
}
