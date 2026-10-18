"use client";

import { useEffect, useMemo, useState } from "react";
import { useCreditsRollFeed } from "@/hooks/useCreditsRollFeed";
import { useAuth } from "@/context/AuthContext";
import { buildDirectory, type DirPerson, type Directory } from "@/lib/society-directory";
import { loadSocietyPeople } from "@/lib/societyPeopleCache";
import type { SocietyPerson } from "@/lib/societyTypes";
import type { CreditsRollWork } from "@/types/creditsRoll";
import { isDemoVisit } from "@/lib/demo-flags";
import { rememberProfilePreviews } from "@/lib/profilePreview";
import { getUserProfile } from "@/lib/userProfile";
import { newVisitSeed, visitRank } from "@/lib/visit-order";

/**
 * The sky's own view of the same people: you included (Discover leaves you
 * out), the works newest first, and this visit's order for the rest.
 */
export type SkyDirectory = { people: DirPerson[]; me: string | null; newest: string[]; rankOf: (id: string) => number };

/**
 * Discover's people joined with the credits feed; `directory` is null while
 * loading. With ?demo=1 it's made-up people and works instead (`demo`).
 */
export function useSocietyDirectory(): { directory: Directory | null; sky: SkyDirectory | null; failed: boolean; demo: boolean; demoKnown: boolean } {
  const { user, loading: authLoading } = useAuth();
  const feed = useCreditsRollFeed();
  const [realPeople, setPeople] = useState<SocietyPerson[] | null>(null);
  // The demo is known after the first paint (the server can't see the URL's
  // query here), before any real data can arrive.
  const [demo, setDemo] = useState(false);
  const [demoKnown, setDemoKnown] = useState(false);
  const [demoData, setDemoData] = useState<{ people: SocietyPerson[]; works: CreditsRollWork[] } | null>(null);
  useEffect(() => {
    setDemoKnown(true);
    if (!isDemoVisit()) return;
    setDemo(true);
    void import("@/lib/society-demo").then((m) => setDemoData(m.demoSociety()));
  }, []);
  const people = demo ? demoData?.people ?? null : realPeople;
  const works = demo ? demoData?.works ?? null : feed.works;
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

  // You, for the sky: from your profile, in case you're in no credits or Discover yet.
  const [me, setMe] = useState<DirPerson | null>(null);
  useEffect(() => {
    if (!user) {
      setMe(null);
      return;
    }
    let cancelled = false;
    void getUserProfile(user.uid).then((profile) => {
      if (cancelled || !profile) return;
      setMe({
        uid: user.uid,
        name: profile.displayName || profile.handle || "",
        handle: profile.handle || null,
        avatarUrl: profile.avatarUrl?.trim() || null,
        headline: profile.headline?.trim() || null,
        bio: null,
        available: !!profile.openToCollaborate,
        roleTags: profile.roleTags ?? [],
        groups: [],
        credits: [],
        schools: [],
        collaborators: [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const rankOf = useMemo(() => (id: string) => visitRank(seed, id), [seed]);
  const directory = useMemo(
    () => (people === null || works === null ? null : buildDirectory(people, works, { excludeUid: demo ? null : user?.uid ?? null, rankOf })),
    [people, works, user, rankOf, demo]
  );
  const sky = useMemo((): SkyDirectory | null => {
    if (people === null || works === null) return null;
    const all = buildDirectory(people, works, { rankOf });
    if (!demo && me && me.name && !all.people.some((p) => p.uid === me.uid)) all.people.push(me);
    // The feed arrives shuffled for this visit; newest first again by when each went up.
    const newest = [...works]
      .sort((a, b) => (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0))
      .map((w) => `${w.ownerUid}:${w.workId}`);
    return { people: all.people, me: demo ? null : user?.uid ?? null, newest, rankOf };
  }, [people, works, user, me, rankOf, demo]);

  // Whoever is clicked on here, their profile can show their name and picture at once.
  useEffect(() => {
    if (sky) rememberProfilePreviews(sky.people);
  }, [sky]);

  return { directory, sky, failed: !demo && failed && (works?.length ?? 0) === 0, demo, demoKnown };
}
