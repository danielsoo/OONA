"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SocietyNetworkPanel, { type SocietyTabId } from "@/components/society/SocietyNetworkPanel";

const SOCIETY_TABS: SocietyTabId[] = ["discover", "connections", "requests", "sent", "works"];

function parseSocietyTab(raw: string | null): SocietyTabId {
  if (raw && SOCIETY_TABS.includes(raw as SocietyTabId)) return raw as SocietyTabId;
  return "discover";
}

export default function SocietyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseSocietyTab(searchParams.get("tab"));
  const onTabChange = useCallback((tab: SocietyTabId) => {
    router.replace(`/society?tab=${tab}`, { scroll: false });
  }, [router]);

  return <SocietyNetworkPanel activeTab={activeTab} onTabChange={onTabChange} />;
}
