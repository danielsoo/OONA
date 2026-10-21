"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppSidebar from "@/components/layout/AppSidebar";
import AppTopBar from "@/components/layout/AppTopBar";
import MobileTabBar from "@/components/layout/MobileTabBar";
import CinematicAppHeader from "@/components/layout/CinematicAppHeader";
import CatalogTabs from "@/components/layout/CatalogTabs";
import WatchRoutePrefetcher from "@/components/watch/WatchRoutePrefetcher";
import { HeroWaveLayoutProvider } from "@/context/HeroWaveLayoutContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { useVisitClock } from "@/hooks/useVisitClock";
import { APP_SIDEBAR_WIDTH, shouldHideAppShell } from "@/lib/appNav";
import { MOCKUP_HOME } from "@/lib/mockupHomeSpec";
import { APP_CONTENT_BOUNDARY_INSET_PX } from "@/lib/mockupLayout";

const CINEMATIC_APP_PATHS = [
  "/",
  "/movies",
  "/series",
  "/entertainment",
  "/shorts",
  "/watch",
  "/search",
  "/notifications",
  "/my-list",
  "/schools",
  "/school",
  "/society",
  "/people",
  "/creators",
  "/discover",
  "/messages",
  "/projects",
  "/account",
  "/settings",
  "/about",
  "/uploader",
  "/credits",
  // Links sent to someone outside: a shared portfolio and a credit invitation.
  // They are read by people who may never have seen OONA, so they carry the
  // site's own header — its wordmark, and a way in — rather than the sidebar
  // the rest of the site left behind. Each page brings its own sign-in link.
  "/p",
  "/collab-invite",
] as const;

function usesCinematicAppShell(pathname: string): boolean {
  return CINEMATIC_APP_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  useVisitClock();

  if (usesCinematicAppShell(pathname)) {
    return (
      <HeroWaveLayoutProvider>
        <NotificationProvider>
          <WatchRoutePrefetcher />
          <div className="min-h-screen min-w-[360px] bg-xiio-bg text-white">
            <CinematicAppHeader />
            <CatalogTabs />
            {children}
            <MobileTabBar />
          </div>
        </NotificationProvider>
      </HeroWaveLayoutProvider>
    );
  }

  if (shouldHideAppShell(pathname)) {
    return (
      <>
        <WatchRoutePrefetcher />
        {children}
      </>
    );
  }

  return (
    <HeroWaveLayoutProvider>
      <NotificationProvider>
        <WatchRoutePrefetcher />
        <div className="min-h-screen min-w-[360px] bg-xiio-bg text-white">
          <AppSidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
          <div
            className={`pb-mobile-tabbar ${MOCKUP_HOME.contentMainColumnPad} ${MOCKUP_HOME.contentColumnGuard} transition-[padding] duration-300 ease-in-out`}
            style={{
              ["--app-sidebar-width" as string]: APP_SIDEBAR_WIDTH,
              ["--app-content-boundary-inset" as string]: `${APP_CONTENT_BOUNDARY_INSET_PX}px`,
            }}
          >
            <AppTopBar onMenuOpen={() => setMobileOpen(true)} />
            {children}
          </div>
          <MobileTabBar />
        </div>
      </NotificationProvider>
    </HeroWaveLayoutProvider>
  );
}
