"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

const POLL_MS = 60000;

type NotificationContextValue = {
  unreadCount: number;
  dmUnreadCount: number;
  refresh: () => Promise<void>;
  clearNotifications: () => void;
};

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  dmUnreadCount: 0,
  refresh: async () => {},
  clearNotifications: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dmUnreadCount, setDmUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setDmUnreadCount(0);
      return;
    }
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/me/unread-counts", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { notifications?: number; messages?: number };
      setUnreadCount(data.notifications ?? 0);
      setDmUnreadCount(data.messages ?? 0);
    } catch {
      /* ignore — badge just stays at its last known value */
    }
  }, [user]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const clearNotifications = useCallback(() => setUnreadCount(0), []);

  return (
    <NotificationContext.Provider value={{ unreadCount, dmUnreadCount, refresh, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  return useContext(NotificationContext);
}
