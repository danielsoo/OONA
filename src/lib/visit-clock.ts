/**
 * When the site was last in use, kept across tabs and reloads, to tell a new
 * visit from a reload in the middle of one (the home's light intro plays only
 * for a new visit, the way an app's intro plays on a fresh launch).
 */
const LAST_ACTIVE_KEY = "oona.lastActiveAt";

/** Away longer than this, the next arrival counts as a new visit. */
export const VISIT_GAP_MS = 30 * 60 * 1000;

export function isNewVisit(lastActiveAt: number | null, now: number): boolean {
  return lastActiveAt === null || now - lastActiveAt > VISIT_GAP_MS;
}

export function readLastActiveAt(): number | null {
  try {
    const value = Number(window.localStorage.getItem(LAST_ACTIVE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function markActive(now = Date.now()): void {
  try {
    window.localStorage.setItem(LAST_ACTIVE_KEY, String(now));
  } catch {
    // Storage blocked: every arrival looks like a new visit.
  }
}
