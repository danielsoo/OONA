/**
 * How a public profile reads, in one place.
 *
 * /people/<handle>, the portfolio and the preview beside the profile editor
 * all show the same person, and the preview is only worth having if it shows
 * what the real page shows. Keeping the sky, the name's shape and the line
 * under it here is what stops them drifting apart — the preview used to
 * invent its own backdrop, its own meta line and its own placeholder text.
 */

/** The same deep space Society is in, so a profile is a corner of it. */
export const PROFILE_SKY = "/images/society/society_space.webp";
export const PROFILE_SKY_POSITION = "64% 50%";

/** A name over two lines: the last word on its own. */
export function displayLines(value: string): string[] {
  const pieces = value.trim().split(/\s+/);
  return pieces.length < 2 ? [value] : [pieces.slice(0, -1).join(" "), pieces.at(-1)!];
}

/** What sits beside the @handle: their headline, then where they study. */
export function profileRoleLine(
  headline?: string | null,
  schoolName?: string | null
): string {
  return [headline?.trim(), schoolName?.trim()].filter(Boolean).join(" · ");
}
