"use client";

import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  canAccessAdminPanel,
  DEFAULT_ADMIN_ALLOWED_ROLES,
  isSuperAdminRole,
  parseUserProfileDoc,
} from "@/lib/userAccess";
import type { UserProfileDoc } from "@/types/user";

export type AdminCheckReason = "unauthorized" | "admin_sdk_missing" | undefined;

type AdminAccessValue = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  checked: boolean;
  reason: AdminCheckReason;
  profile: UserProfileDoc | null;
  authLoading: boolean;
};

const AdminAccessContext = createContext<AdminAccessValue | null>(null);

function useAdminAccessState(): AdminAccessValue {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checked, setChecked] = useState(false);
  const [reason, setReason] = useState<AdminCheckReason>(undefined);
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !db) {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setReason(undefined);
      setProfile(null);
      setChecked(true);
      return;
    }

    let cancelled = false;
    let allowedRoles: string[] = [...DEFAULT_ADMIN_ALLOWED_ROLES];
    let userProfile: UserProfileDoc | null = null;
    let userReady = false;
    let configReady = false;

    const applyFirestore = () => {
      if (cancelled || !userReady || !configReady) return;
      if (!userProfile) {
        setProfile(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setReason("unauthorized");
        setChecked(true);
        return;
      }
      setProfile(userProfile);
      const ok = canAccessAdminPanel(userProfile, allowedRoles);
      setIsAdmin(ok);
      setIsSuperAdmin(ok && isSuperAdminRole(userProfile.role));
      setReason(ok ? undefined : "unauthorized");
      setChecked(true);
    };

    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      userProfile = snap.exists()
        ? parseUserProfileDoc(snap.data() as Record<string, unknown>)
        : null;
      userReady = true;
      applyFirestore();
    });

    const unsubConfig = onSnapshot(doc(db, "config", "adminAccess"), (snap) => {
      const roles = snap.data()?.allowedRoles;
      allowedRoles =
        Array.isArray(roles) && roles.length > 0
          ? roles.map((r) => String(r))
          : [...DEFAULT_ADMIN_ALLOWED_ROLES];
      configReady = true;
      applyFirestore();
    });

    void (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/admin/check", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as {
          isAdmin?: boolean;
          isSuperAdmin?: boolean;
          reason?: AdminCheckReason;
          source?: string;
        };
        if (cancelled) return;
        if (res.status === 503 && data.reason === "admin_sdk_missing") {
          setReason("admin_sdk_missing");
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setChecked(true);
          return;
        }
        if (data.source === "env" && data.isAdmin) {
          setIsAdmin(true);
          setIsSuperAdmin(!!data.isSuperAdmin);
          setReason(undefined);
          setChecked(true);
        }
      } catch {
        // Firestore 결과 유지
      }
    })();

    return () => {
      cancelled = true;
      unsubUser();
      unsubConfig();
    };
  }, [user, authLoading]);

  return { isAdmin, isSuperAdmin, checked, reason, profile, authLoading };
}

export function AdminAccessProvider({ children }: { children: ReactNode }) {
  const value = useAdminAccessState();
  return createElement(AdminAccessContext.Provider, { value }, children);
}

export function useAdminAccess(): AdminAccessValue {
  const value = useContext(AdminAccessContext);
  if (!value) throw new Error("useAdminAccess must be used within AdminAccessProvider");
  return value;
}
