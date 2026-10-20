"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isUploaderAppRoute } from "@/lib/uploader-routes";
import { DEMO_ME, isDemoVisit } from "@/lib/demo-flags";
import {
  loadStoredActiveWatchProfile,
  saveStoredActiveWatchProfile,
} from "@/lib/activeWatchProfile";
import {
  createWatchProfile,
  deleteWatchProfile,
  fetchWatchProfiles,
  updateWatchProfile,
} from "@/lib/watchProfiles";
import type { WatchProfile } from "@/types/profile";
import { MAX_WATCH_PROFILES } from "@/types/profile";

interface ProfileContextType {
  profiles: WatchProfile[];
  activeProfile: WatchProfile | null;
  loading: boolean;
  selectProfile: (profile: WatchProfile) => void;
  clearActiveProfile: () => void;
  refreshProfiles: () => Promise<void>;
  addProfile: (name: string, avatarFile?: File) => Promise<WatchProfile>;
  editProfile: (
    profileId: string,
    updates: { name?: string; avatarFile?: File }
  ) => Promise<WatchProfile>;
  removeProfile: (profileId: string) => Promise<void>;
  canAddProfile: boolean;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  // The demo's member has no watch profiles to read (and must not migrate stored ones).
  const skipClientFirestore = isUploaderAppRoute(pathname) || (user?.uid === DEMO_ME.uid && isDemoVisit());
  const [profiles, setProfiles] = useState<WatchProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<WatchProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const persistActive = useCallback((profile: WatchProfile | null, uid: string) => {
    saveStoredActiveWatchProfile(uid, profile);
    setActiveProfile(profile);
  }, []);

  const clearActiveProfile = useCallback(() => {
    if (user) saveStoredActiveWatchProfile(user.uid, null);
    setActiveProfile(null);
  }, [user]);

  const refreshProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchWatchProfiles(user.uid);
      setProfiles(list);

      const stored = loadStoredActiveWatchProfile(user.uid);
      if (stored) {
        const match = list.find((p) => p.id === stored.id);
        if (match) persistActive(match, user.uid);
        else persistActive(null, user.uid);
      }
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [user, persistActive]);

  useEffect(() => {
    if (!user) {
      setProfiles([]);
      setActiveProfile(null);
      setLoading(false);
      return;
    }

    if (skipClientFirestore) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    const stored = loadStoredActiveWatchProfile(user.uid);
    if (stored) setActiveProfile(stored);

    void refreshProfiles();
  }, [user, refreshProfiles, skipClientFirestore]);

  const selectProfile = (profile: WatchProfile) => {
    if (!user) return;
    persistActive(profile, user.uid);
  };

  const addProfile = async (name: string, avatarFile?: File) => {
    if (!user) throw new Error("로그인이 필요합니다.");
    const created = await createWatchProfile(user.uid, name, avatarFile);
    setProfiles((prev) => {
      if (prev.some((p) => p.id === created.id)) return prev;
      return [...prev, created];
    });
    void refreshProfiles();
    return created;
  };

  const editProfile = async (
    profileId: string,
    updates: { name?: string; avatarFile?: File }
  ) => {
    if (!user) throw new Error("로그인이 필요합니다.");
    const updated = await updateWatchProfile(user.uid, profileId, updates);
    setProfiles((prev) => prev.map((p) => (p.id === profileId ? updated : p)));
    if (activeProfile?.id === profileId) persistActive(updated, user.uid);
    void refreshProfiles();
    return updated;
  };

  const removeProfile = async (profileId: string) => {
    if (!user) throw new Error("로그인이 필요합니다.");
    await deleteWatchProfile(user.uid, profileId);
    if (activeProfile?.id === profileId) persistActive(null, user.uid);
    await refreshProfiles();
  };

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        loading,
        selectProfile,
        clearActiveProfile,
        refreshProfiles,
        addProfile,
        editProfile,
        removeProfile,
        canAddProfile: profiles.length < MAX_WATCH_PROFILES,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
