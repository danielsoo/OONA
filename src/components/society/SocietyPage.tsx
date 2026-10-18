"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SocietyNetworkPanel, { type SocietyTabId } from "@/components/society/SocietyNetworkPanel";
import SocietyDiscover from "@/components/society/discover/SocietyDiscover";

const SOCIETY_TABS: SocietyTabId[] = ["discover", "connections", "requests", "sent", "works"];

function parseSocietyTab(raw: string | null): SocietyTabId {
  if (raw && SOCIETY_TABS.includes(raw as SocietyTabId)) return raw as SocietyTabId;
  return "discover";
}

/**
 * Follows ?tab= in the URL. On its own, under its own Suspense: reading the
 * query string makes the server leave out everything up to the nearest
 * Suspense, and the rest of the page (the sea, on the first screen) should
 * be in the first paint, not wait for the scripts.
 */
function TabFromUrl({ onTab }: { onTab: (tab: SocietyTabId) => void }) {
  const routeTab = parseSocietyTab(useSearchParams().get("tab"));
  useEffect(() => onTab(routeTab), [routeTab, onTab]);
  return null;
}

export default function SocietyPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<SocietyTabId>("discover");

  const onTabChange = useCallback((tab: SocietyTabId) => {
    setActiveTab(tab);
    const next = new URL(window.location.href);
    next.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", `${next.pathname}${next.search}`);
  }, []);

  // Remount account-scoped state on sign-out; guests only browse public content.
  const canInteract = !authLoading && !!user;
  const tab = canInteract ? activeTab : "discover";
  return (
    <>
      <Suspense fallback={null}>
        <TabFromUrl onTab={setActiveTab} />
      </Suspense>
      {tab === "discover" ? (
        <SocietyDiscover onTabChange={onTabChange} />
      ) : (
        <SocietyNetworkPanel key={user?.uid ?? "guest"} activeTab={tab} onTabChange={onTabChange} />
      )}
    </>
  );
}
