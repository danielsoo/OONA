"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SocietyNetworkPanel, { type SocietyTabId } from "@/components/society/SocietyNetworkPanel";
import SocietyDesignSwitcher from "@/components/society/designs/SocietyDesignSwitcher";
import { useSocietyDesign } from "@/components/society/designs/societyDesigns";

// The design variants load only when someone picks one (see societyDesigns).
const SocietyDesignView = dynamic(() => import("@/components/society/designs/SocietyDesignView"), { ssr: false });

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
  const designs = useSocietyDesign();

  useEffect(() => setActiveTab(routeTab), [routeTab]);

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
      {designs.design !== "current" && tab === "discover" ? (
        <SocietyDesignView design={designs.design} onTabChange={onTabChange} />
      ) : (
        <SocietyNetworkPanel key={canInteract ? user.uid : "guest"} activeTab={tab} onTabChange={onTabChange} />
      )}
      {designs.visible ? <SocietyDesignSwitcher design={designs.design} onChoose={designs.choose} onClose={designs.close} /> : null}
    </>
  );
}
