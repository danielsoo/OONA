/** Final XIIO redesign shell width from the imported design handoff. */
export const APP_SIDEBAR_WIDTH = "220px";

export const HIDE_APP_SHELL_PATHS = [
  "/login",
  "/signup",
  "/profiles",
  "/uploader",
  "/auth",
];

const UPLOADER_IN_APP_SHELL_PREFIXES = [
  "/uploader/works",
  "/uploader/upload",
  "/uploader/analytics",
];

function isUploaderInAppShell(pathname: string): boolean {
  return UPLOADER_IN_APP_SHELL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function shouldHideAppShell(pathname: string): boolean {
  if (isUploaderInAppShell(pathname)) {
    return false;
  }
  return HIDE_APP_SHELL_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export type AppNavIcon =
  | "home"
  | "browse"
  | "discover"
  | "films"
  | "entertainment"
  | "campus"
  | "society"
  | "series"
  | "myList"
  | "messages"
  | "upload"
  | "about"
  | "search"
  | "notifications"
  | "me";

export type AppNavItem = {
  id: string;
  labelKey: string;
  href: string;
  icon: AppNavIcon;
  badgeKey?: string;
  requiresAuth?: boolean;
  /** Extra path prefixes that keep this item highlighted (e.g. Browse covers /series). */
  match?: string[];
  section?: "primary" | "secondary";
};

/** The three catalog routes share one Browse destination with tabs. */
export const BROWSE_PATHS = ["/movies", "/series", "/entertainment"] as const;

/** Watch: Home and Browse */
export const PRIMARY_NAV: AppNavItem[] = [
  { id: "home", labelKey: "nav.home", href: "/", icon: "home", section: "primary", match: ["/discover"] },
  {
    id: "browse",
    labelKey: "nav.browse",
    href: "/movies",
    icon: "browse",
    section: "primary",
    match: [...BROWSE_PATHS],
  },
];

/** Connect: people and schools */
export const NETWORK_NAV: AppNavItem[] = [
  {
    id: "creators",
    labelKey: "nav.creators",
    href: "/society",
    icon: "society",
    section: "primary",
    match: ["/society", "/people", "/creators"],
  },
  {
    id: "schools",
    labelKey: "nav.schools",
    href: "/schools",
    icon: "campus",
    section: "primary",
    match: ["/schools", "/school"],
  },
];

/** Yours: conversations and saved works */
export const PERSONAL_NAV: AppNavItem[] = [
  {
    id: "messages",
    labelKey: "nav.messages",
    href: "/messages",
    icon: "messages",
    requiresAuth: true,
    section: "primary",
  },
  {
    id: "myList",
    labelKey: "nav.myList",
    href: "/my-list",
    icon: "myList",
    requiresAuth: true,
    section: "primary",
  },
];

/** Upload lives in the top bar; About moved to the profile menu and sidebar footer. */
export const SECONDARY_NAV: AppNavItem[] = [];

export const UPLOAD_HREF = "/uploader/upload";

/** A bottom tab: `label` is the header's own wording (a UI phrase), so both say the same. */
export type MobileTab = Omit<AppNavItem, "labelKey"> & { label: string };

/**
 * Mobile bottom tab bar: the header's places, with Upload in the middle.
 * Series and Shows sit beside Films (CatalogTabs); notifications and the
 * account menu stay in the header.
 */
export const MOBILE_TABS: MobileTab[] = [
  { id: "home", label: "Home", href: "/", icon: "home" },
  { id: "films", label: "Films", href: "/movies", icon: "films", match: ["/series", "/entertainment", "/watch"] },
  { id: "upload", label: "Upload", href: UPLOAD_HREF, icon: "upload", requiresAuth: true },
  { id: "society", label: "Society", href: "/society", icon: "society", match: ["/people", "/creators", "/projects"] },
  { id: "schools", label: "Schools", href: "/schools", icon: "campus", match: ["/school"] },
];

export function isNavItemActive(item: Pick<AppNavItem, "href" | "match">, pathname: string): boolean {
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some((href) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  });
}
