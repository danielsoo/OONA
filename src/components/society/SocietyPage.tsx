"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SocietyConnectionsPanel, {
  type SocietyTabId,
} from "@/components/society/SocietyConnectionsPanel";
import SocietyRightRail from "@/components/society/SocietyRightRail";

const SOCIETY_TABS: SocietyTabId[] = ["discover", "connections", "requests", "sent", "works"];

function parseSocietyTab(raw: string | null): SocietyTabId {
  if (raw && SOCIETY_TABS.includes(raw as SocietyTabId)) return raw as SocietyTabId;
  return "discover";
}

export default function SocietyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseSocietyTab(searchParams.get("tab"));

  const onTabChange = useCallback(
    (next: SocietyTabId) => {
      router.replace(`/society?tab=${next}`, { scroll: false });
    },
    [router]
  );

  return (
    <main className="min-h-[calc(100svh-82px)] bg-[#080808] pb-16 text-white">
      <header className="px-4 pb-9 pt-10 sm:px-7 lg:px-12 lg:pb-12 lg:pt-14">
        <h1 className="font-serif text-[48px] font-normal leading-none tracking-[-0.045em] text-[#f5f4f2] sm:text-[64px] lg:text-[72px]">
          Creators
        </h1>
        <p className="mt-3 text-[16px] font-light text-white/55 sm:text-[19px]">
          Discover creators and build something together.
        </p>
      </header>
      <div className="px-4 sm:px-7 lg:px-12">
        <div className="flex flex-col gap-10 xl:flex-row xl:items-start xl:gap-10">
          <SocietyConnectionsPanel activeTab={tab} onTabChange={onTabChange} />
          {tab !== "works" ? <SocietyRightRail /> : null}
        </div>
      </div>
    </main>
  );
}
