"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { doc, getDoc, onSnapshot, type DocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { isUploaderAppRoute } from "@/lib/uploader-routes";
import {
  parseUserProfileDoc,
  resolveMemberAccess,
  type MemberAccessResult,
} from "@/lib/userAccess";
import { isProfileComplete } from "@/lib/userProfile";
import type { UserProfileDoc } from "@/types/user";
import { DEMO_ME, DEMO_ME_PROFILE, isDemoVisit } from "@/lib/demo-flags";
import { getStoredLocale } from "@/i18n";

const READ_RETRIES = 3;
const READ_RETRY_MS = 500;
const LISTENER_ERROR_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyClientAccess(
  exists: boolean,
  data: Record<string, unknown> | undefined
): { access: MemberAccessResult; profile: UserProfileDoc | null } {
  const result = resolveMemberAccess(exists, data);
  if (result.kind === "active") {
    if (!isProfileComplete(result.profile)) {
      return { access: { kind: "no_profile" }, profile: result.profile };
    }
    return { access: result, profile: result.profile };
  }
  if (result.kind === "deleted") {
    return { access: result, profile: null };
  }
  return { access: { kind: "no_profile" }, profile: null };
}

function applySnapshot(snap: DocumentSnapshot) {
  return applyClientAccess(
    snap.exists(),
    snap.exists() ? (snap.data() as Record<string, unknown>) : undefined
  );
}

export function useMemberAccess() {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const skipClientFirestore = isUploaderAppRoute(pathname);
  const [access, setAccess] = useState<MemberAccessResult>({ kind: "none" });
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (skipClientFirestore) {
      setAccess({ kind: "none" });
      setProfile(null);
      setChecked(true);
      return;
    }

    if (!user || !db) {
      setAccess({ kind: "none" });
      setProfile(null);
      setChecked(true);
      return;
    }

    // The demo's member is a complete member; there's nothing in Firestore to read.
    if (user.uid === DEMO_ME.uid && isDemoVisit()) {
      const demoProfile = parseUserProfileDoc({ ...DEMO_ME_PROFILE, locale: getStoredLocale() });
      setAccess({ kind: "active", profile: demoProfile });
      setProfile(demoProfile);
      setChecked(true);
      return;
    }

    let cancelled = false;
    let unsub: (() => void) | null = null;
    let listenerErrorRetries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    setChecked(false);
    setAccess({ kind: "none" });
    setProfile(null);

    const ref = doc(db, "users", user.uid);

    const applyResult = (next: { access: MemberAccessResult; profile: UserProfileDoc | null }) => {
      if (cancelled) return;
      setAccess(next.access);
      setProfile(next.profile);
      setChecked(true);
    };

    const startListener = () => {
      unsub?.();
      unsub = onSnapshot(
        ref,
        (snap) => {
          listenerErrorRetries = 0;
          applyResult(applySnapshot(snap));
        },
        () => {
          if (cancelled) return;
          listenerErrorRetries += 1;
          setAccess({ kind: "error" });
          setChecked(false);
          if (listenerErrorRetries < LISTENER_ERROR_RETRIES) {
            retryTimer = setTimeout(() => {
              if (!cancelled) startListener();
            }, READ_RETRY_MS * listenerErrorRetries);
          } else {
            setChecked(true);
          }
        }
      );
    };

    void (async () => {
      for (let attempt = 0; attempt < READ_RETRIES; attempt++) {
        if (cancelled) return;
        try {
          const snap = await getDoc(ref);
          applyResult(applySnapshot(snap));
          break;
        } catch {
          if (attempt === READ_RETRIES - 1) {
            setAccess({ kind: "error" });
            setChecked(true);
            return;
          }
          await sleep(READ_RETRY_MS * (attempt + 1));
        }
      }

      if (!cancelled) startListener();
    })();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      unsub?.();
    };
  }, [user, authLoading, skipClientFirestore]);

  return {
    access,
    profile,
    checked,
    authLoading,
    hasProfile: access.kind === "active",
    needsProfile: access.kind === "no_profile",
  };
}
