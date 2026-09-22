"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SocietyNetworkPanel, { type SocietyTabId } from "@/components/society/SocietyNetworkPanel";

const SOCIETY_TABS: SocietyTabId[] = ["discover", "connections", "requests", "sent", "works"];

function parseSocietyTab(raw: string | null): SocietyTabId {
  if (raw && SOCIETY_TABS.includes(raw as SocietyTabId)) return raw as SocietyTabId;
  return "discover";
}

export default function SocietyPage() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const routeTab = parseSocietyTab(searchParams.get("tab"));
  const [activeTab, setActiveTab] = useState(routeTab);

  useEffect(() => setActiveTab(routeTab), [routeTab]);

  const onTabChange = useCallback((tab: SocietyTabId) => {
    setActiveTab(tab);
    const next = new URL(window.location.href);
    next.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", `${next.pathname}${next.search}`);
  }, []);

  // Remount account-scoped state on sign-out; guests only browse public content.
  const canInteract = !authLoading && !!user;
  return <SocietyNetworkPanel key={canInteract ? user.uid : "guest"} activeTab={canInteract ? activeTab : "discover"} onTabChange={onTabChange} />;
}
