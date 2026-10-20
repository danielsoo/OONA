/**
 * Names for the activity log's places and things, in English, translated
 * where they're shown (useUiCopy): pages (the site's pages mostly share one
 * title, so a page is named by its path), parts of the site, and devices.
 */

const PAGE_NAMES: Record<string, string> = {
  "": "Home",
  movies: "Films",
  series: "Series",
  entertainment: "Shows",
  shorts: "Shorts",
  watch: "Watch page",
  discover: "Discover",
  credits: "Credits",
  schools: "Schools",
  school: "School page",
  society: "Society",
  people: "Profile",
  p: "Portfolio",
  search: "Search",
  "my-list": "My List",
  notifications: "Notifications",
  messages: "Messages",
  account: "Account",
  settings: "Settings",
  login: "Sign in",
  signup: "Sign up",
  about: "About OONA",
  uploader: "Upload",
  projects: "Projects",
};

/** A page's name from its path, or null for a page without one. */
export function pageName(path: string): string | null {
  return PAGE_NAMES[path.split(/[?#]/)[0]!.split("/")[1] ?? ""] ?? null;
}

export const AREA_NAMES: Record<string, string> = {
  home: "Home",
  films: "Films",
  schools: "Schools",
  society: "Society",
  messages: "Messages",
  account: "Account",
  upload: "Upload",
  other: "Other",
};

export const DEVICE_NAMES: Record<string, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  unknown: "Unknown",
};
