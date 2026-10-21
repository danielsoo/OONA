"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUiCopy } from "@/components/i18n/UiText";

const tabs = [
  { label: "Films", href: "/movies" },
  { label: "Series", href: "/series" },
  { label: "Shows", href: "/entertainment" },
] as const;

/**
 * Below 1024px the bottom tab bar has one Films tab for all three catalogs;
 * at the top of each, these switch between them (the header's nav does on desktop).
 */
export default function CatalogTabs() {
  const pathname = usePathname();
  const copy = useUiCopy();
  if (!tabs.some((tab) => tab.href === pathname)) return null;

  return (
    <nav aria-label={copy("Films, series and shows")} className="lg:hidden flex gap-2 overflow-x-auto bg-[#080808] px-5 pb-3 pt-2 scrollbar-none">
      {tabs.map((tab) => {
        const active = tab.href === pathname;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-9 shrink-0 items-center rounded-full border px-4 text-[13px] font-medium transition-colors ${
              active
                ? "border-[#6dd8ff]/60 bg-[#0c2131] text-white"
                : "border-white/15 text-white/65 hover:border-white/30 hover:text-white"
            }`}
          >
            {copy(tab.label)}
          </Link>
        );
      })}
    </nav>
  );
}
