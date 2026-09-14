"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import ProfileAvatar from "@/components/ProfileAvatar";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { getUserProfile } from "@/lib/userProfile";
import { MOCKUP_HOME } from "@/lib/mockupHomeSpec";
import XiioWordmark from "@/components/layout/XiioWordmark";
import TopBarSearch from "@/components/search/TopBarSearch";
import { AppNavIconSvg } from "@/components/layout/AppNavIcon";
import { ButtonLink } from "@/components/ui/Button";
import { UPLOAD_HREF } from "@/lib/appNav";
import type { UserProfileDoc } from "@/types/user";

type Props = {
  onMenuOpen: () => void;
};

export default function AppTopBar({ onMenuOpen }: Props) {
  const { t } = useTranslations();
  const { user, logout } = useAuth();
  const { isAdmin, checked: adminChecked } = useAdminAccess();
  const router = useRouter();
  const pathname = usePathname();
  const onSearchPage = pathname === "/search" || pathname.startsWith("/search/");
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    void getUserProfile(user.uid).then((p) => {
      if (!cancelled) setProfile(p);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const displayName = profile?.displayName?.trim() || user?.displayName || user?.email || "";

  return (
    <header
      className={`sticky top-0 z-30 flex min-w-0 items-center gap-3 px-4 ${MOCKUP_HOME.topBarRightPad} ${MOCKUP_HOME.topBarHeight} border-b border-line bg-xiio-bg/90 backdrop-blur-md`}
    >
      <button
        type="button"
        className="lg:hidden p-2 -ml-1 text-white/70 hover:text-white"
        onClick={onMenuOpen}
        aria-label={t("nav.menuOpen")}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <Link href="/" className="lg:hidden inline-flex items-center" aria-label={t("common.logoHome")}>
        <XiioWordmark className="!h-[14px]" />
      </Link>

      {!onSearchPage ? (
        <TopBarSearch className={`mx-auto hidden md:block ${MOCKUP_HOME.searchBar}`} />
      ) : null}

      <div className="ml-auto flex items-center gap-1 shrink-0">
        {!onSearchPage ? (
          <Link
            href="/search"
            className="md:hidden p-2 text-ink-2 hover:text-ink"
            aria-label={t("ui.shell.openSearch")}
          >
            <AppNavIconSvg icon="search" className="w-5 h-5" />
          </Link>
        ) : null}
        <ButtonLink
          href={user ? UPLOAD_HREF : "/login"}
          variant="accent"
          size="sm"
          className="hidden lg:inline-flex mr-2"
          icon={
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          }
        >
          {t("ui.shell.upload")}
        </ButtonLink>
        <NotificationBell />

        {user ? (
          <div ref={ref} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1 rounded-full hover:ring-2 hover:ring-white/10 transition"
              aria-label={t("profileMenu.ariaLabel")}
            >
              <ProfileAvatar
                profile={{ name: displayName, avatarUrl: profile?.avatarUrl ?? null }}
                size="sm"
              />
            </button>
            {menuOpen ? (
              <div className="animate-dropdown-in absolute right-0 top-full mt-2 py-1 w-44 rounded-lg border border-white/10 bg-xiio-card shadow-xl z-50">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/account");
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/5"
                >
                  {t("profileMenu.accountProfile")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/settings");
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/5"
                >
                  {t("profileMenu.settings")}
                </button>
                <Link
                  href="/about"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/5"
                >
                  {t("ui.shell.about")}
                </Link>
                {adminChecked && isAdmin ? (
                  <Link
                    href="/admin"
                    prefetch
                    onClick={() => {
                      setMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/5"
                  >
                    {t("profileMenu.adminPanel")}
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => void logout().then(() => router.push("/"))}
                  className="w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/5 border-t border-white/10"
                >
                  {t("profileMenu.logout")}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <ButtonLink href="/login" variant="secondary" size="sm" className="ml-1">
            {t("ui.shell.signIn")}
          </ButtonLink>
        )}
      </div>
    </header>
  );
}
