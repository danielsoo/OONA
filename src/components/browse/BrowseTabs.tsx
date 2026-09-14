"use client";

import { usePathname } from "next/navigation";
import Tabs from "@/components/ui/Tabs";
import { useTranslations } from "@/context/LocaleContext";

const BROWSE_TABS = [
  { id: "movies", href: "/movies", labelKey: "ui.browse.tabFilms" },
  { id: "series", href: "/series", labelKey: "ui.browse.tabSeries" },
  { id: "entertainment", href: "/entertainment", labelKey: "ui.browse.tabEntertainment" },
] as const;

/** Films · Series · Entertainment: one Browse destination, three existing routes. */
export default function BrowseTabs({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const { t } = useTranslations();
  const active =
    BROWSE_TABS.find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))?.id ??
    "movies";

  return (
    <Tabs
      ariaLabel={t("ui.browse.title")}
      activeId={active}
      className={className}
      items={BROWSE_TABS.map((tab) => ({ id: tab.id, href: tab.href, label: t(tab.labelKey) }))}
    />
  );
}
