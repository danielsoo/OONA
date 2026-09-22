"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { getUserProfile } from "@/lib/userProfile";
import { isUploaderAppRoute } from "@/lib/uploader-routes";
import { hasStoredLocale } from "@/i18n";

/** 로그인 후 Firestore 프로필의 locale을 앱 언어에 반영 */
export default function ProfileLocaleSync() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { setLocale } = useLocale();
  const syncedUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      syncedUidRef.current = null;
      return;
    }
    if (isUploaderAppRoute(pathname)) return;
    if (syncedUidRef.current === user.uid) return;

    let cancelled = false;
    void (async () => {
      const profile = await getUserProfile(user.uid);
      if (cancelled || !profile?.locale) return;
      syncedUidRef.current = user.uid;
      if (!hasStoredLocale()) setLocale(profile.locale);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, setLocale, pathname]);

  return null;
}
