"use client";

import { useEffect, useMemo, useState } from "react";
import { useCreditsRollFeed } from "@/hooks/useCreditsRollFeed";
import { useAuth } from "@/context/AuthContext";
import { buildDirectory, type Directory } from "@/lib/society-directory";
import { loadSocietyPeople } from "@/lib/societyPeopleCache";
import type { SocietyPerson } from "@/lib/societyTypes";
import { newVisitSeed, visitRank } from "@/lib/visit-order";

/** Discover's people joined with the credits feed; `directory` is null while loading. */
export function useSocietyDirectory(): { directory: Directory | null; failed: boolean } {
  const { user, loading: authLoading } = useAuth();
  const { works } = useCreditsRollFeed();
  const [people, setPeople] = useState<SocietyPerson[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [seed] = useState(newVisitSeed);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    loadSocietyPeople(user, {})
      .then((result) => {
        if (!cancelled) setPeople(result.people);
      })
      .catch(() => {
        if (cancelled) return;
        setPeople([]);
        setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const directory = useMemo(
    () =>
      people === null || works === null
        ? null
        : buildDirectory(people, works, { excludeUid: user?.uid ?? null, rankOf: (id) => visitRank(seed, id) }),
    [people, works, user, seed]
  );

  return { directory, failed: failed && (works?.length ?? 0) === 0 };
}
