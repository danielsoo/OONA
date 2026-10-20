"use client";

import { ReactNode, Suspense } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { HomeHeroThemeProvider } from "@/context/HomeHeroThemeContext";
import ProfileGuard from "@/components/ProfileGuard";
import MemberGuard from "@/components/MemberGuard";
import VisitRecorder from "@/components/VisitRecorder";
import ActivityRecorder from "@/components/ActivityRecorder";
import ProfileLocaleSync from "@/components/ProfileLocaleSync";
import type { HomeHeroTheme } from "@/lib/homeHeroColors";
import { AdminAccessProvider } from "@/hooks/useAdminAccess";
import DemoBadgeGate from "@/components/society/DemoBadgeGate";
// In the demo, answers the site's API calls in the browser; loaded before any page asks.
import "@/lib/demo-fetch";

export default function Providers({
  children,
  initialHomeTheme,
}: {
  children: ReactNode;
  initialHomeTheme?: HomeHeroTheme;
}) {
  return (
    <LocaleProvider>
      <AuthProvider>
        <AdminAccessProvider>
          <ProfileProvider>
            <HomeHeroThemeProvider initialTheme={initialHomeTheme}>
              <ProfileLocaleSync />
              <VisitRecorder />
              {/* Reads the URL's query, so it waits for the page like any search-params reader. */}
              <Suspense fallback={null}>
                <ActivityRecorder />
              </Suspense>
              <MemberGuard />
              <ProfileGuard />
              {children}
              <DemoBadgeGate />
            </HomeHeroThemeProvider>
          </ProfileProvider>
        </AdminAccessProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}
