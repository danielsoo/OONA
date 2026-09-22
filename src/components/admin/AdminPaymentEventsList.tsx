"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { formatPaymentAmount } from "@/lib/payments/format-amount";
import type {
  AdminPaymentEventListItem,
  AdminPaymentEventsListResponse,
} from "@/types/admin";
import { formatApiError, formatClientError, readResponseJson } from "@/lib/clientErrors";

export default function AdminPaymentEventsList() {
  const { user } = useAuth();
  const { t, locale, formatDateTime } = useTranslations();
  const loc = locale;

  const [provider, setProvider] = useState("");
  const [uidInput, setUidInput] = useState("");
  const [appliedUid, setAppliedUid] = useState("");

  const [items, setItems] = useState<AdminPaymentEventListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [meta, setMeta] = useState<AdminPaymentEventsListResponse["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchList = useCallback(
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
        const params = new URLSearchParams({ limit: "25" });
        if (opts.cursor) params.set("cursor", opts.cursor);
        if (provider) params.set("provider", provider);
        if (appliedUid) params.set("uid", appliedUid);
        const res = await fetch(`/api/admin/payments/events?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data: body, raw } = await readResponseJson<
          AdminPaymentEventsListResponse & { message?: string; error?: string }
        >(res);
        if (!res.ok) {
          setErr(formatApiError(t, res.status, { ...body, message: body.message ?? raw.slice(0, 500) }));
          if (!append) setItems([]);
          return;
        }
        setItems((prev) => (append ? [...prev, ...body.items] : body.items));
        setNextCursor(body.nextCursor ?? null);
        if (!append && body.meta) setMeta(body.meta);
      } catch (e) {
        setErr(formatClientError(t, e, { titleKey: "admin.paymentsEvents.loadError" }));
        if (!append) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, provider, appliedUid, t]
  );

  useEffect(() => {
    void fetchList({ append: false });
  }, [fetchList]);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedUid(uidInput.trim());
  };

  const clearUid = () => {
    setUidInput("");
    setAppliedUid("");
  };

  const copyEventId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const envBanner =
    meta != null
      ? t("admin.paymentsEvents.envBanner", {
          status: meta.depositEnabled
            ? t("admin.paymentsEvents.depositOn")
            : t("admin.paymentsEvents.depositOff"),
          providers: meta.providers.length > 0 ? meta.providers.join(", ") : "—",
        })
      : null;

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{t("admin.paymentsTitle")}</h1>
      <p className="text-xiio-muted text-sm mb-4">{t("admin.paymentsDesc")}</p>

      {envBanner && (
        <p className="text-sm text-white/80 mb-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
          {envBanner}
        </p>
      )}
      <p className="text-xs text-xiio-muted mb-6">{t("admin.paymentsEvents.duplicateNote")}</p>

      <form onSubmit={applyFilters} className="mb-6 flex flex-col sm:flex-row gap-3 flex-wrap">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">{t("admin.paymentsEvents.filterProviderAll")}</option>
          <option value="stripe">stripe</option>
          <option value="toss">toss</option>
        </select>
        <input
          type="text"
          value={uidInput}
          onChange={(e) => setUidInput(e.target.value)}
          placeholder={t("admin.paymentsEvents.filterUidPlaceholder")}
          className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-xiio-accent hover:bg-xiio-accent-hover text-white text-sm font-medium"
        >
          {t("admin.paymentsEvents.apply")}
        </button>
        {appliedUid && (
          <button
            type="button"
            onClick={clearUid}
            className="px-4 py-2 rounded-lg border border-white/20 text-white text-sm hover:bg-white/5"
          >
            {t("admin.paymentsEvents.clearUid")}
          </button>
        )}
      </form>

      {loading && <p className="text-xiio-muted text-sm">{t("admin.loading")}</p>}
      {err && !loading && <p className="text-red-400 text-sm mb-4 whitespace-pre-wrap break-words">{err}</p>}

      {!loading && !err && items.length === 0 && (
        <p className="text-xiio-muted text-sm">{t("admin.paymentsEvents.empty")}</p>
      )}

      {!loading && items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm border-collapse">
            <thead>
              <tr className="text-left text-xiio-muted border-b border-white/10">
                <th className="py-2 pr-4 font-medium">{t("admin.paymentsEvents.colProcessedAt")}</th>
                <th className="py-2 pr-4 font-medium">{t("admin.paymentsEvents.colMember")}</th>
                <th className="py-2 pr-4 font-medium">{t("admin.paymentsEvents.colProvider")}</th>
                <th className="py-2 pr-4 font-medium">{t("admin.paymentsEvents.colAmount")}</th>
                <th className="py-2 pr-4 font-medium">{t("admin.paymentsEvents.colEventId")}</th>
                <th className="py-2 font-medium">{t("admin.paymentsEvents.colDeposit")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="py-3 pr-4 text-white/80 whitespace-nowrap">
                    {formatDateTime(row.processedAt)}
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/users/${row.uid}`}
                      className="text-white font-medium hover:text-xiio-accent transition block"
                    >
                      {row.displayName || row.uid}
                    </Link>
                    {row.email && (
                      <span className="text-xs text-white/50 block">{row.email}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-white/80">{row.provider}</td>
                  <td className="py-3 pr-4 text-white/80 whitespace-nowrap">
                    {formatPaymentAmount(row.amountMinor, row.currency, loc)}
                  </td>
                  <td className="py-3 pr-4">
                    <code className="text-xs text-white/70 break-all">{row.id}</code>
                    <button
                      type="button"
                      onClick={() => void copyEventId(row.id)}
                      className="ml-2 text-xs text-xiio-accent hover:underline"
                    >
                      {copiedId === row.id
                        ? t("admin.paymentsEvents.copied")
                        : t("admin.paymentsEvents.copyEventId")}
                    </button>
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                        row.depositVerified
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {row.depositVerified
                        ? t("admin.paymentsEvents.depositYes")
                        : t("admin.paymentsEvents.depositNo")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {nextCursor && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void fetchList({ cursor: nextCursor, append: true })}
              className="mt-4 px-4 py-2 rounded-lg border border-white/20 text-white text-sm hover:bg-white/5 disabled:opacity-40"
            >
              {loadingMore ? t("admin.loading") : t("admin.paymentsEvents.loadMore")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
