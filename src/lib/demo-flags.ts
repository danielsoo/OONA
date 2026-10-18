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

/** Where a work plays; a demo work has nowhere to play, so it leads back to the demo. */
export function watchHref(work: { ownerUid: string; workId: string }): string {
  return work.ownerUid === DEMO_OWNER ? DEMO_SOCIETY_HREF : `/watch/${work.ownerUid}/${work.workId}`;
}
