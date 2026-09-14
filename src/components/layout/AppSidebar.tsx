"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { AppNavIconSvg } from "@/components/layout/AppNavIcon";
import SidebarProfileRow from "@/components/layout/SidebarProfileRow";
import XiioWordmark from "@/components/layout/XiioWordmark";
import { useDmUnreadCount } from "@/context/DmUnreadContext";
import {
  APP_SIDEBAR_WIDTH,
  NETWORK_NAV,
  PERSONAL_NAV,
  PRIMARY_NAV,
  isNavItemActive,
  type AppNavItem,
} from "@/lib/appNav";

type Props = {
  mobileOpen?: boolean;
  onNavigate?: () => void;
};

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: AppNavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslations();
  const { user } = useAuth();
  const unreadCount = useDmUnreadCount();
  const href = item.requiresAuth && !user ? "/login" : item.href;
  const showUnreadBadge = item.id === "messages" && unreadCount > 0;

  return (
    <Link
      href={href}
      prefetch
      onClick={onNavigate}
      id={item.id === "myList" ? "app-nav-my-list" : undefined}
      data-nav-id={item.id}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center gap-2.5 py-3 text-small font-medium transition-colors ${
        active
          ? "pl-4 pr-0 rounded-l-lg rounded-r-none bg-white/[0.08] text-ink"
          : "px-2.5 rounded-lg text-ink-3 hover:text-ink hover:bg-white/[0.04]"
      }`}
    >
      <AppNavIconSvg icon={item.icon} active={active} />
      <span className="flex-1 truncate">{t(item.labelKey)}</span>
      {showUnreadBadge ? (
        <span className="min-w-[18px] h-[18px] px-1 mr-2.5 rounded-full bg-xiio-accent text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : item.badgeKey ? (
        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-xiio-accent/20 text-xiio-accent-hover">
          {t(item.badgeKey)}
        </span>
      ) : null}
    </Link>
  );
}

function NavGroup({
  items,
  pathname,
  onNavigate,
}: {
  items: AppNavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => (
        <NavLink
          key={item.id}
          item={item}
          active={isNavItemActive(item, pathname)}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslations();
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <Link
        href="/"
        prefetch
        onClick={onNavigate}
        className="flex justify-center px-4 pt-6 pb-0"
        aria-label={t("common.logoHome")}
      >
        <XiioWordmark className="!h-[16px]" />
      </Link>

      <nav className="flex flex-1 flex-col pl-2.5 pr-0 mt-16 min-h-0" aria-label={t("ui.shell.tabBarLabel")}>
        <NavGroup items={PRIMARY_NAV} pathname={pathname} onNavigate={onNavigate} />
        <div className="h-px shrink-0 bg-line my-3.5 mr-2.5" aria-hidden />
        <NavGroup items={NETWORK_NAV} pathname={pathname} onNavigate={onNavigate} />
        <div className="h-px shrink-0 bg-line my-3.5 mr-2.5" aria-hidden />
        <NavGroup items={PERSONAL_NAV} pathname={pathname} onNavigate={onNavigate} />
        <div className="flex-1" aria-hidden />
        <Link
          href="/about"
          prefetch={false}
          onClick={onNavigate}
          className={`mb-3 mr-2.5 px-2.5 py-1.5 text-small transition-colors ${
            pathname === "/about" ? "text-ink" : "text-ink-4 hover:text-ink-2"
          }`}
        >
          {t("ui.shell.about")}
        </Link>
      </nav>

      <div className="mt-auto pb-5 pt-3 border-t border-line">
        <SidebarProfileRow onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export default function AppSidebar({ mobileOpen = false, onNavigate }: Props) {
  return (
    <>
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40 border-r border-line bg-xiio-sidebar"
        style={{ width: APP_SIDEBAR_WIDTH }}
      >
        <SidebarContent />
      </aside>

      {mobileOpen ? (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={onNavigate} aria-hidden />
          <aside
            className="lg:hidden fixed top-0 left-0 bottom-0 z-50 border-r border-line bg-xiio-sidebar flex flex-col"
            style={{ width: APP_SIDEBAR_WIDTH }}
          >
            <SidebarContent onNavigate={onNavigate} />
          </aside>
        </>
      ) : null}
    </>
  );
}
