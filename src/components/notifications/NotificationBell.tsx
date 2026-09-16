"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconBell } from "@/components/icons/MockupIcons";
import NotificationListItem from "@/components/notifications/NotificationListItem";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { useNotifications } from "@/context/NotificationContext";
import type { NotificationListItem as NotificationListItemType } from "@/types/notification";

export default function NotificationBell() {
  const { user } = useAuth();
  const { t } = useTranslations();
  const { unreadCount, clearNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationListItemType[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const openDropdown = async () => {
    const next = !open;
    setOpen(next);
    if (!next || !user) return;

    if (notifications.length === 0) setLoading(true);
    clearNotifications();
    try {
      const token = await user.getIdToken();
      const listRes = await fetch("/api/me/notifications?limit=8", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (listRes.ok) {
        const data = (await listRes.json()) as { notifications?: NotificationListItemType[] };
        setNotifications((data.notifications ?? []).map((item) => ({ ...item, read: true })));
      }
      void fetch("/api/me/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => void openDropdown()}
        className="relative p-2.5 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition"
        aria-label={t("topBar.notifications")}
      >
        <IconBell />
        {unreadCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-xiio-accent ring-2 ring-xiio-bg" aria-hidden />
        ) : null}
      </button>

      {open ? (
        <div className="animate-dropdown-in absolute right-0 top-full mt-2 w-80 max-w-[90vw] rounded-lg border border-white/10 bg-xiio-card shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-sm font-semibold text-white">{t("notifications.title")}</p>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
            {loading && (
              <p className="px-4 py-6 text-sm text-xiio-muted text-center">{t("common.loading")}</p>
            )}
            {!loading && notifications.length === 0 && (
              <p className="px-4 py-6 text-sm text-xiio-muted text-center">{t("notifications.empty")}</p>
            )}
            {notifications.map((n) => (
              <NotificationListItem key={n.id} notification={n} onNavigate={() => setOpen(false)} />
            ))}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-center text-sm text-xiio-accent hover:bg-white/5 border-t border-white/10"
          >
            {t("notifications.viewAll")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
