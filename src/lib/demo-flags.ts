/**
 * The demo: ?demo=1 on any page fills the site with made-up people and works
 * (lib/society-demo and lib/demo-api, loaded only then) to look around in,
 * signed in as a made-up member, without touching real data. It lasts for
 * the browser tab (sessionStorage) until ?demo=0 or the badge's "Leave the
 * demo". Demo people's handles start with demo- so the rest of the site can
 * tell them apart. Kept tiny, since every visit loads it.
 */
export const DEMO_HANDLE_PREFIX = "demo-";
export const DEMO_SOCIETY_HREF = "/society?demo=1";

/** Who the demo is signed in as: one of the made-up world's people, with works and a sky of her own. */
export const DEMO_ME = { uid: `${DEMO_HANDLE_PREFIX}lena`, handle: `${DEMO_HANDLE_PREFIX}lena`, displayName: "Lena Brandt", email: "lena@demo.oona" } as const;

/** Her member profile (users/{uid}), complete, so every signed-in page opens for her. */
export const DEMO_ME_PROFILE: Readonly<Record<string, unknown>> = {
  displayName: DEMO_ME.displayName,
  handle: DEMO_ME.handle,
  email: DEMO_ME.email,
  emailVerified: true,
  role: "member",
  birthDate: "1998-04-12",
  gender: "undisclosed",
  platformPurpose: "both",
  defaultDirectorName: DEMO_ME.displayName,
  headline: "Director",
  bio: "Quiet films about loud families. Low Tide was shot in one night with a crew of six.",
  roleTags: ["director"],
  isDiscoverable: true,
  openToCollaborate: true,
  schoolName: "Riverside Film Academy",
};

export function isDemoHandle(handle: string | null | undefined): boolean {
  if (!handle) return false;
  try {
    return decodeURIComponent(handle).startsWith(DEMO_HANDLE_PREFIX);
  } catch {
    return handle.startsWith(DEMO_HANDLE_PREFIX);
  }
}

/** Also read by the home intro's pre-hydration script (components/home/intro-boot.ts). */
export const DEMO_SESSION_KEY = "oona-demo";

/** Set when this page load is the one that came into the demo. */
let enteredThisLoad = false;

/**
 * Whether this tab is in the demo: ?demo=1 enters it (and is remembered for
 * the tab), ?demo=0 leaves it. Client only; the server always renders the
 * real site, and demo pages switch over once they're in the browser.
 */
export function isDemoVisit(): boolean {
  if (typeof window === "undefined") return false;
  const param = new URLSearchParams(window.location.search).get("demo");
  try {
    if (param === "1") {
      if (window.sessionStorage.getItem(DEMO_SESSION_KEY) !== "1") enteredThisLoad = true;
      window.sessionStorage.setItem(DEMO_SESSION_KEY, "1");
    } else if (param === "0") window.sessionStorage.removeItem(DEMO_SESSION_KEY);
    return window.sessionStorage.getItem(DEMO_SESSION_KEY) === "1";
  } catch {
    enteredThisLoad = param === "1";
    return param === "1";
  }
}

/**
 * Whether this page load came into the demo (its first in the tab, with
 * ?demo=1): coming in counts as arriving fresh, so the home plays its intro.
 */
export function enteredDemoThisLoad(): boolean {
  isDemoVisit();
  return enteredThisLoad;
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

/** Where a work plays (a demo work too: in the demo its watch page is answered from the made-up world). */
export function watchHref(work: { ownerUid: string; workId: string }): string {
  return `/watch/${work.ownerUid}/${work.workId}`;
}
