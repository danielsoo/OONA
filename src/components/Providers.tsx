"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { HomeHeroThemeProvider } from "@/context/HomeHeroThemeContext";
import ProfileGuard from "@/components/ProfileGuard";
import MemberGuard from "@/components/MemberGuard";
import VisitRecorder from "@/components/VisitRecorder";
import ProfileLocaleSync from "@/components/ProfileLocaleSync";
import type { HomeHeroTheme } from "@/lib/homeHeroColors";
import { AdminAccessProvider } from "@/hooks/useAdminAccess";

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
              <MemberGuard />
              <ProfileGuard />
              {children}
            </HomeHeroThemeProvider>
          </ProfileProvider>
        </AdminAccessProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}
