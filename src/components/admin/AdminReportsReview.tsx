"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminEntityLinks } from "@/components/admin/AdminEntityLinks";
import AdminReviewVideo from "@/components/admin/AdminReviewVideo";
import AdminErrorReportsReview from "@/components/admin/AdminErrorReportsReview";
import AdminUploaderFeedbackReview from "@/components/admin/AdminUploaderFeedbackReview";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import type { AdminReportListItem, AdminReportsListResponse } from "@/types/admin";
import { formatApiError, formatClientError, readResponseJson } from "@/lib/clientErrors";
import { useUiCopy } from "@/components/i18n/UiText";

type Tab = "pending" | "resolved";
type ReportMode = "content" | "errors" | "feedback";

export default function AdminReportsReview() {
  const _copy = useUiCopy();
  const { user } = useAuth();
  const { t, formatDateTime } = useTranslations();

  const [tab, setTab] = useState<Tab>("pending");
  const [mode, setMode] = useState<ReportMode>("content");
  const [items, setItems] = useState<AdminReportListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [upholdId, setUpholdId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const load = useCallback(
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
        const params = new URLSearchParams({ queue: tab, limit: "25" });
        if (opts.cursor) params.set("cursor", opts.cursor);
        const res = await fetch(`/api/admin/reports?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data: body, raw } = await readResponseJson<
          AdminReportsListResponse & { message?: string; error?: string }
        >(res);
        if (!res.ok) {
          setErr(formatApiError(t, res.status, { ...body, message: body.message ?? raw.slice(0, 500) }));
          if (!append) setItems([]);
          return;
        }
        setItems((prev) => (append ? [...prev, ...body.items] : body.items));
        setNextCursor(body.nextCursor ?? null);
      } catch (e) {
        setErr(formatClientError(t, e, { titleKey: "admin.reportsReview.loadError" }));
        if (!append) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, tab, t]
  );

  useEffect(() => {
    setUpholdId(null);
    setAdminNote("");
    void load({ append: false });
  }, [load]);

  const patchReport = async (reportId: string, action: "dismiss" | "uphold", note?: string) => {
    if (!user) return;
    setBusyId(reportId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, adminNote: note?.trim() || undefined }),
      });
      if (!res.ok) {
        const { data: body, raw } = await readResponseJson<{ message?: string; error?: string }>(res);
        setErr(formatApiError(t, res.status, { ...body, message: body.message ?? raw.slice(0, 500) }));
        return;
      }
      setUpholdId(null);
      setAdminNote("");
      await load({ append: false });
    } catch (e) {
      setErr(formatClientError(t, e, { titleKey: "admin.reportsReview.actionFailed" }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{t("admin.reportsTitle")}</h1>
      <p className="text-xiio-muted text-sm mb-6">{t("admin.reportsDesc")}</p>

      <div className="mb-7 flex border-b border-white/10">
        {(["content", "errors", "feedback"] as ReportMode[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`border-b-2 px-4 pb-3 pt-1 text-sm font-semibold transition ${
              mode === value
                ? "border-xiio-accent text-white"
                : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            {value === "feedback" ? _copy("Uploader feedback") : t(value === "content" ? "admin.reportsReview.modeContent" : "admin.reportsReview.modeErrors")}
          </button>
        ))}
      </div>

      {mode === "feedback" ? (
        <AdminUploaderFeedbackReview />
      ) : mode === "errors" ? (
        <AdminErrorReportsReview />
      ) : (
        <>

      <div className="flex gap-2 mb-6">
        {(["pending", "resolved"] as Tab[]).map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setTab(q)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === q
                ? "bg-xiio-accent text-white"
                : "bg-white/5 text-xiio-muted hover:text-white border border-white/10"
            }`}
          >
            {t(`admin.reportsReview.tab${q === "pending" ? "Pending" : "Resolved"}`)}
          </button>
        ))}
      </div>

      {loading && <p className="text-xiio-muted text-sm">{t("admin.loading")}</p>}
      {err && <p className="text-red-400 text-sm mb-4 whitespace-pre-wrap break-words">{err}</p>}

      {!loading && items.length === 0 && (
        <p className="text-xiio-muted text-sm">{t("admin.reportsReview.empty")}</p>
      )}

      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-2xl border border-white/10 bg-xiio-surface p-5"
          >
            <p className="text-xs text-amber-400/90 mb-1">
              {item.targetType === "full"
                ? t("admin.reportsReview.targetFull")
                : t("admin.reportsReview.targetPromo")}
              {tab === "resolved" && (
                <span className="ml-2 text-xiio-muted">
                  ·{" "}
                  {item.status === "dismissed"
                    ? t("admin.reportsReview.statusDismissed")
                    : t("admin.reportsReview.statusActionTaken")}
                </span>
              )}
            </p>
            <h2 className="text-lg font-semibold text-white">
              <Link
                href={`/admin/content/works/${item.targetOwnerUid}/${item.targetWorkId}`}
                className="hover:text-xiio-accent transition"
              >
                {item.targetTitle}
              </Link>
            </h2>
            <p className="text-sm text-xiio-muted mt-1">
              {t("admin.reportsReview.reason")}: {t(`report.reason.${item.reasonCode}`)}
              {item.reasonDetail && (
                <span className="block mt-1 text-white/70">
                  {t("admin.reportsReview.detail")}: {item.reasonDetail}
                </span>
              )}
            </p>
            <p className="text-xs text-xiio-muted mt-2">
              {t("admin.reportsReview.reporter")}:{" "}
              <Link
                href={`/admin/users/${item.reporterUid}`}
                className="text-xiio-accent hover:underline"
              >
                {item.reporterName}
              </Link>
              {" · "}
              {t("admin.reportsReview.reportedAt")}:{" "}
              {formatDateTime(item.createdAt)}
            </p>
            <AdminEntityLinks
              ownerUid={item.targetOwnerUid}
              workId={item.targetWorkId}
              className="my-3"
            />
            {item.playbackUrl && (
              <div className="mb-3 max-w-sm">
                <AdminReviewVideo src={item.playbackUrl} maxHeightClass="max-h-[50vh]" />
              </div>
            )}
            {item.adminNote && tab === "resolved" && (
              <p className="text-sm text-white/70 mb-3">
                {t("admin.reportsReview.adminNoteLabel")}: {item.adminNote}
              </p>
            )}

            {tab === "pending" && (
              <div className="mt-3 space-y-3">
                {upholdId === item.id ? (
                  <>
                    <p className="text-sm text-amber-300/90">{t("admin.reportsReview.upholdConfirm")}</p>
                    <label className="block text-xs text-xiio-muted">
                      {t("admin.reportsReview.adminNoteLabel")}
                    </label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder={t("admin.reportsReview.adminNotePlaceholder")}
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void patchReport(item.id, "uphold", adminNote)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-600/80 text-white disabled:opacity-40"
                      >
                        {t("admin.reportsReview.uphold")}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => {
                          setUpholdId(null);
                          setAdminNote("");
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-white/20 text-white"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void patchReport(item.id, "dismiss")}
                      className="px-3 py-1.5 text-xs rounded-lg border border-white/20 text-white hover:bg-white/5 disabled:opacity-40"
                    >
                      {t("admin.reportsReview.dismiss")}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => {
                        setUpholdId(item.id);
                        setAdminNote("");
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-red-600/80 text-white disabled:opacity-40"
                    >
                      {t("admin.reportsReview.uphold")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {nextCursor && !loading && (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => void load({ cursor: nextCursor, append: true })}
          className="mt-4 px-4 py-2 rounded-lg border border-white/20 text-white text-sm hover:bg-white/5 disabled:opacity-40"
        >
          {loadingMore ? t("admin.loading") : t("admin.reportsReview.loadMore")}
        </button>
      )}
        </>
      )}
    </div>
  );
}
