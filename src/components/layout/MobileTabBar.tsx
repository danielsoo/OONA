"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppNavIconSvg } from "@/components/layout/AppNavIcon";
import { useAuth } from "@/context/AuthContext";
import { useDmUnreadCount } from "@/context/DmUnreadContext";
import { useTranslations } from "@/context/LocaleContext";
import { MOBILE_TABS, isNavItemActive } from "@/lib/appNav";

/** Bottom navigation below 1024px. The sidebar takes over on desktop. */
export default function MobileTabBar() {
  const pathname = usePathname();
  const { t } = useTranslations();
  const { user } = useAuth();
  const unreadCount = useDmUnreadCount();

  return (
    <nav
      aria-label={t("ui.shell.tabBarLabel")}
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[#223746] bg-[#020a12]/95 shadow-[0_-16px_38px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid h-[68px] max-w-lg grid-cols-5 px-1">
        {MOBILE_TABS.map((item) => {
          const active = isNavItemActive(item, pathname);
          const href = item.requiresAuth && !user ? "/login" : item.href;
          const isUpload = item.id === "upload";
          const showBadge = item.id === "messages" && unreadCount > 0;
          return (
            <li key={item.id}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
                  active ? "text-[#6dd8ff]" : "text-white/48 hover:text-white/75"
                }`}
              >
                {isUpload ? (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#568ab0] bg-[#061421] text-[#dff7ff] shadow-[0_0_16px_rgba(74,187,255,0.18)]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
                      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                ) : (
                  <AppNavIconSvg icon={item.icon} active={active} className="h-[22px] w-[22px]" />
                )}
                <span>{t(item.labelKey)}</span>
                {active ? <span className="absolute bottom-0 h-[3px] w-[3px] rounded-full bg-[#8ce3ff] shadow-[0_0_8px_#50c8ff]" aria-hidden /> : null}
                {showBadge ? (
                  <span className="absolute left-1/2 top-2 ml-2 min-w-[16px] rounded-full bg-xiio-accent px-1 text-center text-[10px] font-bold leading-4 text-white tabular-nums">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
