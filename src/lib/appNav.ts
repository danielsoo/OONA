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

/** Mobile bottom tab bar. */
export const MOBILE_TABS: AppNavItem[] = [
  { id: "home", labelKey: "nav.home", href: "/", icon: "home", match: ["/discover"] },
  { id: "browse", labelKey: "nav.browse", href: "/movies", icon: "browse", match: [...BROWSE_PATHS] },
  { id: "upload", labelKey: "nav.upload", href: UPLOAD_HREF, icon: "upload", requiresAuth: true },
  {
    id: "messages",
    labelKey: "nav.messages",
    href: "/messages",
    icon: "messages",
    requiresAuth: true,
  },
  { id: "me", labelKey: "nav.me", href: "/account", icon: "me", requiresAuth: true },
];

export function isNavItemActive(item: AppNavItem, pathname: string): boolean {
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some((href) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  });
}
