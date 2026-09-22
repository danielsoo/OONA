"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { formatPaymentAmount } from "@/lib/payments/format-amount";
import type {
  AdminUserActivityCategory,
  AdminUserActivityItem,
  AdminUserActivityKind,
  AdminUserActivityResponse,
} from "@/types/admin";
import { formatApiError, formatClientError, readResponseJson } from "@/lib/clientErrors";

type Props = { uid: string };

const TABS: { id: AdminUserActivityCategory; labelKey: string }[] = [
  { id: "all", labelKey: "admin.userActivity.tabAll" },
  { id: "payments", labelKey: "admin.userActivity.tabPayments" },
  { id: "reports", labelKey: "admin.userActivity.tabReports" },
  { id: "content", labelKey: "admin.userActivity.tabContent" },
  { id: "engagement", labelKey: "admin.userActivity.tabEngagement" },
  { id: "admin", labelKey: "admin.userActivity.tabAdmin" },
];

const PAYMENT_KINDS = new Set<AdminUserActivityKind>(["deposit_payment"]);
const REPORT_KINDS = new Set<AdminUserActivityKind>([
  "report_filed",
  "report_received",
  "report_resolved",
]);
const ADMIN_KINDS = new Set<AdminUserActivityKind>(["admin_audit"]);

const CONTENT_KINDS = new Set<AdminUserActivityKind>([
  "work_created",
  "work_deletion_requested",
  "work_revision_submitted",
  "work_published",
  "work_reviewed",
  "promo_created",
  "promo_submitted",
  "promo_published",
  "promo_revision_submitted",
  "promo_deletion_requested",
]);

function payloadStrings(
  payload: AdminUserActivityItem["payload"]
): Record<string, string> {
  if (!payload) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v == null) out[k] = "";
    else out[k] = String(v);
  }
  return out;
}

export default function AdminUserActivityTimeline({ uid }: Props) {
  const { user } = useAuth();
  const { t, locale, formatDateTime } = useTranslations();
  const loc = locale;

  const [category, setCategory] = useState<AdminUserActivityCategory>("all");
  const [items, setItems] = useState<AdminUserActivityItem[]>([]);
  const [limitations, setLimitations] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [viewerIsSuperAdmin, setViewerIsSuperAdmin] = useState(false);

  const formatLabel = useCallback(
    (item: AdminUserActivityItem): string => {
      const p = payloadStrings(item.payload);

      if (item.kind === "account_joined" && p.purpose) {
        return t("admin.userActivity.kind.account_joined", {
          purpose: t(`admin.userProfile.purpose.${p.purpose}`),
        });
      }

      if (item.kind === "report_filed" || item.kind === "report_received") {
        const targetType =
          p.targetType === "promo"
            ? t("admin.userActivity.targetPromo")
            : t("admin.userActivity.targetFull");
        const reasonCode = p.reasonCode
          ? t(`report.reason.${p.reasonCode}`)
          : p.reasonCode;
        return t(`admin.userActivity.kind.${item.kind}`, {
          ...p,
          targetType,
          reasonCode,
        });
      }

      if (item.kind === "deposit_payment") {
        const amount =
          item.payload?.amountMinor != null
            ? formatPaymentAmount(
                item.payload.amountMinor as number,
                (item.payload.currency as string) || null,
                loc
              )
            : "";
        return `${t("admin.userActivity.kind.deposit_payment", p)}${amount ? ` · ${amount}` : ""}`;
      }

      if (item.kind === "admin_audit" && p.action) {
        const actionKey = `admin.userActivity.audit.${p.action}`;
        let label = t(actionKey, { workTitle: p.workTitle || p.targetWorkId });
        if (p.perspective === "by_actor") {
          label = t("admin.userActivity.audit.byActor", { actionLabel: label });
        }
        return label;
      }

      return t(`admin.userActivity.kind.${item.kind}`, p);
    },
    [t, loc]
  );

  const fetchActivity = useCallback(
    async (opts: { cursor?: string | null; append?: boolean }) => {
      if (!user) return;
      const append = opts.append ?? false;
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setErr(null);
      }
      try {
        const token = await user.getIdToken();
        const params = new URLSearchParams({ category, limit: "40" });
        if (opts.cursor) params.set("cursor", opts.cursor);
        const res = await fetch(`/api/admin/users/${uid}/activity?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data: body, raw } = await readResponseJson<
          AdminUserActivityResponse & { message?: string; error?: string }
        >(res);
        if (!res.ok) {
          setErr(formatApiError(t, res.status, { ...body, message: body.message ?? raw.slice(0, 500) }));
          if (!append) setItems([]);
          return;
        }
        setItems((prev) => (append ? [...prev, ...body.items] : body.items));
        setNextCursor(body.nextCursor ?? null);
        if (!append) {
          setLimitations(body.limitations ?? []);
          setViewerIsSuperAdmin(!!body.viewerIsSuperAdmin);
        }
      } catch (e) {
        setErr(formatClientError(t, e, { titleKey: "admin.userActivity.loadError" }));
        if (!append) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, uid, category, t]
  );

  useEffect(() => {
    void fetchActivity({ append: false });
  }, [fetchActivity]);

  const kindColor = (kind: AdminUserActivityKind) => {
    if (ADMIN_KINDS.has(kind)) return "text-violet-300/90";
    if (PAYMENT_KINDS.has(kind)) return "text-amber-300/90";
    if (REPORT_KINDS.has(kind)) return "text-red-300/90";
    if (CONTENT_KINDS.has(kind)) return "text-sky-300/90";
    return "text-emerald-300/90";
  };

  return (
    <section className="mt-10 pt-8 border-t border-white/10">
      <h2 className="text-lg font-semibold text-white mb-1">{t("admin.userActivity.title")}</h2>
      <p className="text-xiio-muted text-sm mb-4">{t("admin.userActivity.subtitle")}</p>

      {limitations.length > 0 && (
        <ul className="text-xs text-xiio-muted mb-4 space-y-1 list-disc list-inside">
          {limitations.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      )}
      {!viewerIsSuperAdmin && (
        <p className="text-xs text-xiio-muted mb-4">{t("admin.userActivity.actorHiddenHint")}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategory(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              category === tab.id
                ? "bg-xiio-accent text-white"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {loading && <p className="text-xiio-muted text-sm">{t("admin.loading")}</p>}
      {err && !loading && <p className="text-red-400 text-sm mb-4 whitespace-pre-wrap break-words">{err}</p>}

      {!loading && !err && items.length === 0 && (
        <p className="text-xiio-muted text-sm">{t("admin.userActivity.empty")}</p>
      )}

      {!loading && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-xs text-white/50 mb-1">
                  {formatDateTime(item.at)}
                </p>
                <p className={`text-sm font-medium ${kindColor(item.kind)}`}>
                  {formatLabel(item)}
                </p>
                {item.actor && (
                  <p className="text-xs text-white/60 mt-1">
                    {t("admin.userActivity.actorLabel")}:{" "}
                    <Link
                      href={`/admin/users/${item.actor.uid}`}
                      className="text-xiio-accent hover:underline"
                    >
                      {item.actor.displayName}
                    </Link>
                    {item.actor.email ? ` (${item.actor.email})` : ""}
                  </p>
                )}
              </div>
              {item.href && (
                <Link
                  href={item.href}
                  className="shrink-0 text-sm text-xiio-accent hover:underline"
                >
                  {t("admin.userActivity.openLink")}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {nextCursor && !loading && (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => void fetchActivity({ cursor: nextCursor, append: true })}
          className="mt-4 px-4 py-2 rounded-lg border border-white/20 text-white text-sm hover:bg-white/5 disabled:opacity-40"
        >
          {loadingMore ? t("admin.loading") : t("admin.userActivity.loadMore")}
        </button>
      )}
    </section>
  );
}
