"use client";

import { useEffect } from "react";
import { markActive } from "@/lib/visit-clock";

const TICK_MS = 60 * 1000;

/** Keeps "last in use" fresh while any page of the site is open and visible (lib/visit-clock). */
export function useVisitClock() {
  useEffect(() => {
    markActive();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") markActive();
    }, TICK_MS);
    const onLeave = () => markActive();
    const onVisibility = () => markActive();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onLeave);
    };
  }, []);
}
