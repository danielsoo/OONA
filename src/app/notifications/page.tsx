"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import NotificationListItem from "@/components/notifications/NotificationListItem";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { useNotifications } from "@/context/NotificationContext";
import type { NotificationListItem as NotificationListItemType, NotificationType } from "@/types/notification";
import styles from "./notifications.module.css";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";

type FilterId = "all" | "collaborations" | "connections" | "works" | "system";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "collaborations", label: "Collaborations" },
  { id: "connections", label: "Connections" },
  { id: "works", label: "Works" },
  { id: "system", label: "System" },
];

function categoryFor(type: NotificationType): Exclude<FilterId, "all"> {
  if (type.startsWith("business_invite")) return "collaborations";
  if (type === "new_follower") {
    return "connections";
  }
  if (type === "work_approve" || type === "work_reject") return "works";
  return "system";
}

function isRecent(createdAt: string | null): boolean {
  if (!createdAt) return true;
  const time = Date.parse(createdAt);
  return Number.isNaN(time) || Date.now() - time < 24 * 60 * 60 * 1000;
}

export default function NotificationsPage() {
  const _copy = useUiCopy();
  const { user } = useAuth();
  const { t } = useTranslations();
  const { clearNotifications } = useNotifications();
  const [notifications, setNotifications] = useState<NotificationListItemType[]>([]);
  const [filter, setFilter] = useState<FilterId>("all");
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const markAllRead = async () => {
    if (!user || marking) return;
    setMarking(true);
    clearNotifications();
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    try {
      const token = await user.getIdToken();
      await fetch("/api/me/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } finally {
      setMarking(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const token = await user.getIdToken();
      const res = await fetch("/api/me/notifications?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (!cancelled) setLoading(false);
        return;
      }
      const data = (await res.json()) as { notifications?: NotificationListItemType[] };
      if (!cancelled) {
        setNotifications(data.notifications ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = useMemo(
    () => notifications.filter((item) => filter === "all" || categoryFor(item.type) === filter),
    [filter, notifications]
  );
  const today = filtered.filter((item) => isRecent(item.createdAt));
  const earlier = filtered.filter((item) => !isRecent(item.createdAt));
  const unreadCount = notifications.filter((item) => !item.read).length;
  const collaborationCount = notifications.filter((item) => categoryFor(item.type) === "collaborations").length;
  const workCount = notifications.filter((item) => categoryFor(item.type) === "works").length;

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1>{t("notifications.title")}</h1>
          <p><UiText text={"Stay close to your work and collaborators."} /></p>
        </div>
        {notifications.length > 0 ? (
          <button type="button" onClick={() => void markAllRead()} disabled={marking}>
            <span aria-hidden>✓</span>
            {t("notifications.markAllRead")}
          </button>
        ) : null}
      </header>

      <nav className={styles.filters} aria-label={_copy("Notification categories")}>
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={filter === item.id ? styles.activeFilter : undefined}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className={styles.contentGrid}>
        <section className={styles.feed} aria-live="polite">
          {loading ? <p className={styles.status}>{t("common.loading")}</p> : null}
          {!loading && filtered.length === 0 ? (
            <p className={styles.status}>{t("notifications.empty")}</p>
          ) : null}
          {today.length > 0 ? (
            <div className={styles.group}>
              <h2><UiText text={"Today"} /></h2>
              <div className={styles.timeline}>
                {today.map((notification) => (
                  <NotificationListItem key={notification.id} notification={notification} />
                ))}
              </div>
            </div>
          ) : null}
          {earlier.length > 0 ? (
            <div className={styles.group}>
              <h2><UiText text={"Earlier this week"} /></h2>
              <div className={styles.timeline}>
                {earlier.map((notification) => (
                  <NotificationListItem key={notification.id} notification={notification} />
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <aside className={styles.activity}>
          <div className={styles.activityTitle}>
            <h2><UiText text={"Your activity"} /></h2>
            <Link href="/settings"><UiText text={"Notification settings"} />{" "}<span aria-hidden>→</span></Link>
          </div>
          <div className={styles.stats}>
            <div><strong>{unreadCount}</strong><span><UiText text={"Unread"} /></span></div>
            <div><strong>{collaborationCount}</strong><span><UiText text={"Collaborations"} /></span></div>
            <div><strong>{workCount}</strong><span><UiText text={"Work updates"} /></span></div>
          </div>
          <div className={styles.activityNote}>
            <p><UiText text={"Every response, connection, and milestone stays in one quiet place."} /></p>
            <span><UiText text={"More voices. A brighter tomorrow."} /></span>
          </div>
        </aside>
      </div>
    </main>
  );
}
