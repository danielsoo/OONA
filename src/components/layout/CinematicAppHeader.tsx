"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ProfileAvatar from "@/components/ProfileAvatar";
import NotificationBell from "@/components/notifications/NotificationBell";
import TopBarSearch from "@/components/search/TopBarSearch";
import XiioWordmark from "@/components/layout/XiioWordmark";
import { useAuth } from "@/context/AuthContext";
import { useDmUnreadCount } from "@/context/DmUnreadContext";
import { useTranslations } from "@/context/LocaleContext";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { UPLOAD_HREF } from "@/lib/appNav";
import { getUserProfile } from "@/lib/userProfile";
import type { UserProfileDoc } from "@/types/user";
import styles from "./CinematicAppHeader.module.css";

const navItems = [
  { label: "Home", href: "/", match: ["/"] },
  { label: "Films", href: "/movies", match: ["/movies"] },
  { label: "Series", href: "/series", match: ["/series"] },
  { label: "Shows", href: "/entertainment", match: ["/entertainment"] },
  { label: "Schools", href: "/schools", match: ["/schools", "/school"] },
  { label: "Society", href: "/society", match: ["/society", "/people", "/creators"] },
] as const;

const mobileExtras = [
  { label: "Discover", href: "/discover" },
  { label: "Shorts", href: "/shorts" },
  { label: "My List", href: "/my-list", auth: true },
  { label: "Messages", href: "/messages", auth: true },
] as const;

function isActive(pathname: string, matches: readonly string[]): boolean {
  return matches.some((path) => path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`));
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path d="M12 18V5M7 10l5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

export default function CinematicAppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslations();
  const { user, loading: authLoading, logout } = useAuth();
  const { isAdmin, checked: adminChecked } = useAdminAccess();
  const unreadMessages = useDmUnreadCount();
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    void getUserProfile(user.uid).then((next) => {
      if (!cancelled) setProfile(next);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!accountOpen) return;
    const close = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [accountOpen]);

  const displayName = profile?.displayName?.trim() || user?.displayName || user?.email || "Member";
  const authHref = (href: string) => user ? href : "/login";
  const overlayPage = pathname === "/" || pathname === "/schools";
  const schoolPage = pathname === "/schools";

  return (
    <header className={`${styles.header} ${overlayPage ? styles.overlayHeader : ""} ${schoolPage ? styles.schoolHeader : ""}`}>
      <Link href="/" className={styles.logoLink} aria-label="OONA home">
        <XiioWordmark className={styles.logo} />
      </Link>

      <button
        type="button"
        className={styles.menuButton}
        aria-label="Toggle navigation"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <span />
        <span />
      </button>

      <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`} aria-label="Main navigation">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(pathname, item.match) ? styles.activeNav : undefined}
            aria-current={isActive(pathname, item.match) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
        <div className={styles.mobileExtras}>
          {mobileExtras.map((item) => (
            <Link key={item.href} href={"auth" in item && item.auth ? authHref(item.href) : item.href}>
              {item.label}
              {item.href === "/messages" && unreadMessages > 0 ? (
                <span className={styles.badge}>{unreadMessages > 99 ? "99+" : unreadMessages}</span>
              ) : null}
            </Link>
          ))}
          <Link href={authHref(UPLOAD_HREF)}>Upload a Work <UploadIcon /></Link>
        </div>
      </nav>

      <div className={styles.actions}>
        <TopBarSearch className={styles.search} />
        <Link href="/search" className={styles.mobileSearch} aria-label="Search"><SearchIcon /></Link>
        <div className={styles.notification}><NotificationBell /></div>
        {authLoading ? (
          <span className={styles.avatarSkeleton} aria-hidden="true" />
        ) : user ? (
          <div ref={accountRef} className={styles.accountRoot}>
            <button
              type="button"
              className={styles.accountButton}
              aria-label={t("profileMenu.ariaLabel")}
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((value) => !value)}
            >
              <ProfileAvatar
                profile={{ name: displayName, avatarUrl: profile?.avatarUrl ?? null }}
                size="sm"
                className={styles.avatarImage}
              />
            </button>
            {accountOpen ? (
              <div className={styles.accountMenu}>
                <div className={styles.identity}>
                  <strong>{displayName}</strong>
                  {user.email ? <span>{user.email}</span> : null}
                </div>
                <Link href="/account">Account & Profile</Link>
                <Link href="/my-list">My List</Link>
                <Link href="/messages">Messages {unreadMessages > 0 ? <span>{unreadMessages > 99 ? "99+" : unreadMessages}</span> : null}</Link>
                <Link href={UPLOAD_HREF}>Upload a Work</Link>
                <Link href="/settings">Settings</Link>
                <Link href="/about">About OONA</Link>
                {adminChecked && isAdmin ? <Link href="/admin">Admin Panel</Link> : null}
                <button
                  type="button"
                  onClick={() => void logout().then(() => router.push("/"))}
                >
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <Link href="/login" className={styles.signIn}>Sign in</Link>
        )}
      </div>
    </header>
  );
}
