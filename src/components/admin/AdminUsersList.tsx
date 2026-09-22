"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import type { AdminUserListItem, AdminUsersListResponse } from "@/types/admin";
import type { PlatformPurpose, UserRole } from "@/types/user";
import { formatApiError, formatClientError, readResponseJson } from "@/lib/clientErrors";
import UiText from "@/components/i18n/UiText";

type PurposeFilter = "" | PlatformPurpose;
type RoleFilter = "" | UserRole;

export default function AdminUsersList() {
  const { user } = useAuth();
  const { t, formatDateTime } = useTranslations();
  const router = useRouter();

  const [purpose, setPurpose] = useState<PurposeFilter>("");
  const [role, setRole] = useState<RoleFilter>("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [uidInput, setUidInput] = useState("");

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
        const params = new URLSearchParams();
        params.set("limit", "25");
        if (opts.cursor) params.set("cursor", opts.cursor);
        if (!appliedSearch) {
          if (purpose) params.set("purpose", purpose);
          if (role) params.set("role", role);
        } else {
          params.set("q", appliedSearch);
        }
        const res = await fetch(`/api/admin/users?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data: body, raw } = await readResponseJson<
          AdminUsersListResponse & { message?: string; error?: string }
        >(res);
        if (!res.ok) {
          setErr(formatApiError(t, res.status, { ...body, message: body.message ?? raw.slice(0, 500) }));
          if (!append) setItems([]);
          return;
        }
        setItems((prev) => (append ? [...prev, ...body.items] : body.items));
        setNextCursor(body.nextCursor ?? null);
      } catch (e) {
        setErr(formatClientError(t, e, { titleKey: "admin.usersLoadError" }));
        if (!append) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, purpose, role, appliedSearch, t]
  );

  useEffect(() => {
    void fetchList({ append: false });
  }, [fetchList]);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    setAppliedSearch("");
  };

  const openByUid = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = uidInput.trim();
    if (!trimmed) return;
    router.push(`/admin/users/${trimmed}`);
  };

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{t("admin.usersTitle")}</h1>
      <p className="text-xiio-muted text-sm mb-6">{t("admin.usersDesc")}</p>

      <form onSubmit={applyFilters} className="mb-6 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as PurposeFilter)}
            disabled={!!appliedSearch}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-40"
          >
            <option value="">{t("admin.usersFilterPurposeAll")}</option>
            <option value="watch">{t("admin.userProfile.purpose.watch")}</option>
            <option value="collaborate">{t("admin.userProfile.purpose.collaborate")}</option>
            <option value="upload">{t("admin.userProfile.purpose.upload")}</option>
            <option value="both">{t("admin.userProfile.purpose.both")}</option>
          </select>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as RoleFilter)}
            disabled={!!appliedSearch}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-40"
          >
            <option value="">{t("admin.usersFilterRoleAll")}</option>
            <option value="member"><UiText text={"member"} /></option>
            <option value="admin"><UiText text={"admin"} /></option>
            <option value="super_admin"><UiText text={"super_admin"} /></option>
          </select>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("admin.usersSearchPlaceholder")}
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-xiio-accent hover:bg-xiio-accent-hover text-white text-sm font-medium"
          >
            {t("admin.usersApply")}
          </button>
          {appliedSearch && (
            <button
              type="button"
              onClick={clearSearch}
              className="px-4 py-2 rounded-lg border border-white/20 text-white text-sm hover:bg-white/5"
            >
              {t("admin.usersClearSearch")}
            </button>
          )}
        </div>
        <p className="text-xs text-xiio-muted">{t("admin.usersSearchHint")}</p>
      </form>

      {loading && <p className="text-xiio-muted text-sm">{t("admin.loading")}</p>}
      {err && !loading && <p className="text-red-400 text-sm mb-4 whitespace-pre-wrap break-words">{err}</p>}

      {!loading && !err && items.length === 0 && (
        <p className="text-xiio-muted text-sm mb-6">{t("admin.usersEmpty")}</p>
      )}

      {!loading && items.length > 0 && (
        <div className="mb-8 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm border-collapse">
            <thead>
              <tr className="text-left text-xiio-muted border-b border-white/10">
                <th className="py-2 pr-4 font-medium">{t("admin.usersColName")}</th>
                <th className="py-2 pr-4 font-medium">{t("admin.usersColEmail")}</th>
                <th className="py-2 pr-4 font-medium">{t("admin.usersColPurpose")}</th>
                <th className="py-2 pr-4 font-medium">{t("admin.usersColRole")}</th>
                <th className="py-2 font-medium">{t("admin.usersColJoined")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.uid} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/users/${row.uid}`}
                      className="text-white font-medium hover:text-xiio-accent transition"
                    >
                      {row.displayName || row.uid}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-white/80">{row.email ?? "—"}</td>
                  <td className="py-3 pr-4 text-white/80">
                    {t(`admin.userProfile.purpose.${row.platformPurpose}`)}
                  </td>
                  <td className="py-3 pr-4 text-white/80">{row.role}</td>
                  <td className="py-3 text-white/80">
                    {formatDateTime(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {nextCursor && !appliedSearch && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void fetchList({ cursor: nextCursor, append: true })}
              className="mt-4 px-4 py-2 rounded-lg border border-white/20 text-white text-sm hover:bg-white/5 disabled:opacity-40"
            >
              {loadingMore ? t("admin.loading") : t("admin.usersLoadMore")}
            </button>
          )}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-white mb-1">{t("admin.usersUidSection")}</h2>
        <p className="text-xs text-xiio-muted mb-4">{t("admin.usersLookupDesc")}</p>
        <form onSubmit={openByUid} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="text"
            value={uidInput}
            onChange={(e) => setUidInput(e.target.value)}
            placeholder={t("admin.usersLookupPlaceholder")}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-xiio-accent"
          />
          <button
            type="submit"
            className="px-5 py-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition border border-white/10"
          >
            {t("admin.usersLookupOpen")}
          </button>
        </form>
        <p className="text-xs text-xiio-muted mt-4">{t("admin.usersLookupHint")}</p>
      </section>
    </div>
  );
}
