"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AppPageShell from "@/components/layout/AppPageShell";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import WorkCard from "@/components/ui/WorkCard";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { formatClientError } from "@/lib/clientErrors";
import { getCached, getOrLoadCached } from "@/lib/feedCache";
import { watchHref } from "@/lib/works/catalog-ui";
import type { CatalogFeedItem } from "@/types/work";

export default function MyListPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslations();
  const [items, setItems] = useState<CatalogFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const cacheKey = `watchlist:${user.uid}`;
    const cached = getCached<CatalogFeedItem[]>(cacheKey);
    if (cached) {
      setItems(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setErr(null);
    try {
      const next = await getOrLoadCached(cacheKey, async () => {
        const token = await user.getIdToken();
        const res = await fetch("/api/me/watchlist", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json().catch(() => ({}))) as { items?: CatalogFeedItem[] };
        if (!res.ok) throw new Error("watchlist_load_failed");
        return Array.isArray(data.items) ? data.items : [];
      });
      setItems(next);
    } catch (e) {
      setErr(formatClientError(t, e, { titleKey: "myList.loadError" }));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, load, user]);

  if (authLoading) {
    return (
      <AppPageShell>
        <p className="text-xiio-muted py-16 text-center">{t("common.loading")}</p>
      </AppPageShell>
    );
  }

  if (!user) {
    return (
      <AppPageShell>
        <div className="flex flex-col items-center gap-4 py-16 text-center text-xiio-muted">
          <Link href="/login" className="text-xiio-accent hover:underline">
            {t("common.loginRequired")}
          </Link>
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell>
      <PageHeader title={t("myList.title")} description={t("myList.subtitle")} className="!pt-4 lg:!pt-8" />

      {loading ? (
        <p className="text-body text-ink-3">{t("common.loading")}</p>
      ) : err ? (
        <p className="text-red-400">{err}</p>
      ) : items.length === 0 ? (
        <EmptyState
          title={t("myList.empty")}
          action={{ href: "/movies", label: t("ui.home.browseCta") }}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {items.map((item) => (
            <li key={item.id}>
              <WorkCard
                href={watchHref(item.ownerUid, item.workId)}
                title={item.title}
                meta={[item.approvedCategory, item.director].filter(Boolean).join(" · ")}
                imageUrl={item.thumbnailUrl}
              />
            </li>
          ))}
        </ul>
      )}
    </AppPageShell>
  );
}
