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
      className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-line bg-xiio-sidebar/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
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
                className={`relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? "text-ink" : "text-ink-3 hover:text-ink-2"
                }`}
              >
                {isUpload ? (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-xiio-accent text-white">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
                      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                ) : (
                  <AppNavIconSvg icon={item.icon} active={active} className="h-[22px] w-[22px]" />
                )}
                <span>{t(item.labelKey)}</span>
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
