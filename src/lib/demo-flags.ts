/**
 * The demo: ?demo=1 on any page fills the site with made-up people and works
 * (lib/society-demo and lib/demo-api, loaded only then) to look around in,
 * signed in as a made-up member, without touching real data. It lasts for
 * the browser tab (sessionStorage) until ?demo=0 or the badge's "Leave the
 * demo". Demo handles and works are marked so the rest of the site can tell
 * them apart. Kept tiny, since every visit loads it.
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

const DEMO_SESSION_KEY = "oona-demo";

/**
 * Whether this tab is in the demo: ?demo=1 enters it (and is remembered for
 * the tab), ?demo=0 leaves it. Client only; the server always renders the
 * real site, and demo pages switch over once they're in the browser.
 */
export function isDemoVisit(): boolean {
  if (typeof window === "undefined") return false;
  const param = new URLSearchParams(window.location.search).get("demo");
  try {
    if (param === "1") window.sessionStorage.setItem(DEMO_SESSION_KEY, "1");
    else if (param === "0") window.sessionStorage.removeItem(DEMO_SESSION_KEY);
    return window.sessionStorage.getItem(DEMO_SESSION_KEY) === "1";
  } catch {
    return param === "1";
  }
}

/** Out of the demo, back to the real site (a full load, so nothing made-up lingers). */
export function leaveDemo(to = "/"): void {
  try {
    window.sessionStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // Private mode: the ?demo=0 below still leaves.
  }
  window.location.assign(`${to}${to.includes("?") ? "&" : "?"}demo=0`);
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
