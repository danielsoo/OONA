/**
 * Society's demo: /society?demo=1 fills it with made-up people and works
 * (lib/society-demo, loaded only then) to look around in, without touching
 * real data. Their handles and works are marked so the rest of the site can
 * tell them apart. Kept tiny, since every visit loads it.
 */
export const DEMO_HANDLE_PREFIX = "demo-";
export const DEMO_OWNER = "demo-studio";
export const DEMO_SOCIETY_HREF = "/society?demo=1";

export function isDemoHandle(handle: string | null | undefined): boolean {
  if (!handle) return false;
  try {
    return decodeURIComponent(handle).startsWith(DEMO_HANDLE_PREFIX);
  } catch {
    return handle.startsWith(DEMO_HANDLE_PREFIX);
  }
}

export function isDemoVisit(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1";
}

export function isDemoWork(work: { ownerUid: string }): boolean {
  return work.ownerUid === DEMO_OWNER;
}

/**
 * Where a work plays. A demo work has nowhere to play, so it opens in the
 * demo's sky instead, spread into the people who made it (?work=, read by
 * SocietyPage).
 */
export function watchHref(work: { ownerUid: string; workId: string }): string {
  return isDemoWork(work)
    ? `${DEMO_SOCIETY_HREF}&work=${encodeURIComponent(`${work.ownerUid}:${work.workId}`)}`
    : `/watch/${work.ownerUid}/${work.workId}`;
}
