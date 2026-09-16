"use client";

import type { ReactNode } from "react";
import { useNotifications } from "@/context/NotificationContext";

export function DmUnreadProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useDmUnreadCount(): number {
  return useNotifications().dmUnreadCount;
}
