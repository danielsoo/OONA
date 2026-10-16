"use client";

import { useCallback, useEffect, useState } from "react";
import { shuffleForVisit } from "@/lib/credits-roll";
import type { CreditsRollWork } from "@/types/creditsRoll";

// Its own module (not CreditsHome's), so pages that only need the data don't
// also load the credits screens and their video player.
/** Works with confirmed credits (GET /api/feed/credits-roll); `works` is null while loading. */
export function useCreditsRollFeed() {
  const [works, setWorks] = useState<CreditsRollWork[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setWorks(null);
    setFailed(false);
    fetch("/api/feed/credits-roll")
      .then(async (res) => {
        if (!res.ok) throw new Error(`credits_roll_${res.status}`);
        return (await res.json()) as { works?: CreditsRollWork[] };
      })
      .then((data) => {
        // A new order each visit, so the same names don't always lead.
        if (!cancelled) setWorks(shuffleForVisit(data.works ?? []));
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setWorks([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { works, failed, retry };
}
