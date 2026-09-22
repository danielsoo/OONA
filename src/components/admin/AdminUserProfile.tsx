"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useTranslations } from "@/context/LocaleContext";
import type { AdminUserDetail } from "@/types/admin";
import { genderLabelKey } from "@/lib/userGender";
import AdminProfileChangeRequestPanel from "@/components/admin/AdminProfileChangeRequestPanel";
import AdminUserActivityTimeline from "@/components/admin/AdminUserActivityTimeline";
import { AdminWorkLink } from "@/components/admin/AdminEntityLinks";
import { formatApiError, formatClientError, readResponseJson } from "@/lib/clientErrors";

type Props = { uid: string };

export default function AdminUserProfile({ uid }: Props) {
  const { user } = useAuth();
  const { isSuperAdmin } = useAdminAccess();
  const { t, formatDateTime } = useTranslations();
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErr(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/users/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { data: body, raw } = await readResponseJson<AdminUserDetail & { message?: string; error?: string }>(
        res
      );
      if (!res.ok) {
        setErr(formatApiError(t, res.status, { ...body, message: body.message ?? raw.slice(0, 500) }));
        setData(null);
        return;
      }
      setData(body);
    } catch (e) {
      setErr(formatClientError(t, e, { titleKey: "admin.userProfile.loadError" }));
    } finally {
      setLoading(false);
    }
  }, [user, uid, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchChangeRequest = async (
    path: "director-name" | "display-name" | "handle",
    action: "approve" | "reject",
    failedKey: string
  ) => {
    if (!user || !isSuperAdmin) return;
    setActionBusy(true);
    setActionErr(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/users/${uid}/${path}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          adminNote: adminNote.trim() || undefined,
        }),
      });
      const { data: body, raw } = await readResponseJson<{
        message?: string;
        error?: string;
      }>(res);
      if (!res.ok) {
        setActionErr(formatApiError(t, res.status, { ...body, message: body.message ?? raw.slice(0, 500) }));
        return;
      }
      setAdminNote("");
      await load();
    } catch (e) {
      setActionErr(formatClientError(t, e, { titleKey: failedKey }));
    } finally {
      setActionBusy(false);
    }
  };

  const handleDirectorChange = async (action: "approve" | "reject") => {
    await patchChangeRequest("director-name", action, "admin.userProfile.directorNameChangeFailed");
  };

  if (loading) {
    return <p className="text-xiio-muted">{t("admin.loading")}</p>;
  }

  if (err || !data) {
    return (
      <div>
        <p className="text-red-400 text-sm mb-4">{err ?? t("admin.userProfile.notFound")}</p>
        <Link href="/admin/users" className="text-sm text-xiio-accent hover:underline">
          {t("admin.userProfile.backToUsers")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/users"
        className="text-sm text-xiio-muted hover:text-xiio-accent transition mb-6 inline-block"
      >
        {t("admin.userProfile.backToUsers")}
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{data.displayName || data.uid}</h1>
      <p className="text-xiio-muted text-sm mb-8">{data.email ?? data.uid}</p>

      <div className="grid gap-6 md:grid-cols-2 mb-10">
        <section className="rounded-2xl border border-white/10 bg-xiio-surface p-5 space-y-3 text-sm">
          <h2 className="text-white font-semibold mb-2">{t("admin.userProfile.accountSection")}</h2>
          <Row label={t("admin.userProfile.joinedAt")} value={formatDateTime(data.createdAt)} />
          <Row label={t("admin.userProfile.visitCount")} value={String(data.visitCount)} />
          <Row
            label={t("admin.userProfile.lastVisit")}
            value={formatDateTime(data.lastVisitAt)}
          />
          <Row
            label={t("admin.userProfile.purposeLabel")}
            value={t(`admin.userProfile.purpose.${data.platformPurpose}`)}
          />
          <Row label={t("admin.userProfile.role")} value={data.role} />
          {data.handle && (
            <Row label={t("admin.userProfile.handleLabel")} value={`@${data.handle}`} />
          )}
          <Row
            label={t("admin.userProfile.deposit")}
            value={
              data.depositVerified
                ? t("admin.userProfile.depositYes")
                : t("admin.userProfile.depositNo")
            }
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-xiio-surface p-5 space-y-3 text-sm">
          <h2 className="text-white font-semibold mb-2">{t("admin.userProfile.profileSection")}</h2>
          <Row
            label={t("admin.userProfile.birthDate")}
            value={
              data.birthDate
                ? data.birthDate
                : data.age != null && data.age >= 1
                  ? `${data.age} (${t("admin.userProfile.age")})`
                  : data.locale === "ja" ? "日本語" : "—"
            }
          />
          <Row
            label={t("admin.userProfile.gender")}
            value={data.gender ? t(genderLabelKey(data.gender)) : "—"}
          />
          <Row
            label={t("admin.userProfile.locale")}
            value={
              data.locale === "en"
                ? t("admin.userProfile.localeEn")
                : data.locale === "ko"
                  ? t("admin.userProfile.localeKo")
                  : "—"
            }
          />
          {data.isStudent && (
            <>
              <Row
                label={t("admin.userProfile.student")}
                value={t("admin.userProfile.yes")}
              />
              {data.schoolName && (
                <Row label={t("admin.userProfile.school")} value={data.schoolName} />
              )}
            </>
          )}
          <Row
            label={t("admin.userProfile.emailVerified")}
            value={data.emailVerified ? t("admin.userProfile.yes") : t("admin.userProfile.no")}
          />
        </section>
      </div>

      {data.defaultDirectorName && (
        <section className="rounded-2xl border border-white/10 bg-xiio-surface p-5 mb-6 text-sm">
          <Row label={t("admin.userProfile.directorNameLabel")} value={data.defaultDirectorName} />
        </section>
      )}

      {data.displayNameChangeRequest?.status === "pending" && (
        <AdminProfileChangeRequestPanel
          title={t("admin.userProfile.displayNameChangeTitle")}
          requestedLabel={t("admin.userProfile.directorNameChangeRequested")}
          reasonLabel={t("admin.userProfile.directorNameChangeReason")}
          noteLabel={t("admin.userProfile.directorNameChangeNoteLabel")}
          approveLabel={t("admin.userProfile.directorNameChangeApprove")}
          rejectLabel={t("admin.userProfile.directorNameChangeReject")}
          processingLabel={t("admin.userProfile.directorNameChangeProcessing")}
          superOnlyLabel={t("admin.userProfile.directorNameChangeSuperOnly")}
          request={data.displayNameChangeRequest}
          formatRequested={(n) => n}
          isSuperAdmin={isSuperAdmin}
          adminNote={adminNote}
          onAdminNote={setAdminNote}
          actionBusy={actionBusy}
          actionErr={actionErr}
          onApprove={() => void patchChangeRequest("display-name", "approve", "admin.userProfile.directorNameChangeFailed")}
          onReject={() => void patchChangeRequest("display-name", "reject", "admin.userProfile.directorNameChangeFailed")}
        />
      )}

      {data.handleChangeRequest?.status === "pending" && (
        <AdminProfileChangeRequestPanel
          title={t("admin.userProfile.handleChangeTitle")}
          requestedLabel={t("admin.userProfile.directorNameChangeRequested")}
          reasonLabel={t("admin.userProfile.directorNameChangeReason")}
          noteLabel={t("admin.userProfile.directorNameChangeNoteLabel")}
          approveLabel={t("admin.userProfile.directorNameChangeApprove")}
          rejectLabel={t("admin.userProfile.directorNameChangeReject")}
          processingLabel={t("admin.userProfile.directorNameChangeProcessing")}
          superOnlyLabel={t("admin.userProfile.directorNameChangeSuperOnly")}
          request={data.handleChangeRequest}
          formatRequested={(n) => `@${n}`}
          isSuperAdmin={isSuperAdmin}
          adminNote={adminNote}
          onAdminNote={setAdminNote}
          actionBusy={actionBusy}
          actionErr={actionErr}
          onApprove={() => void patchChangeRequest("handle", "approve", "admin.userProfile.directorNameChangeFailed")}
          onReject={() => void patchChangeRequest("handle", "reject", "admin.userProfile.directorNameChangeFailed")}
        />
      )}

      {data.directorNameChangeRequest?.status === "pending" && (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 mb-6 space-y-4">
          <h2 className="text-white font-semibold">{t("admin.userProfile.directorNameChangeTitle")}</h2>
          <Row
            label={t("admin.userProfile.directorNameChangeRequested")}
            value={data.directorNameChangeRequest.requestedName}
          />
          {data.directorNameChangeRequest.reason && (
            <Row
              label={t("admin.userProfile.directorNameChangeReason")}
              value={data.directorNameChangeRequest.reason}
            />
          )}
          {isSuperAdmin ? (
            <>
              <div>
                <label className="block text-xs text-xiio-muted mb-1.5" htmlFor="director-admin-note">
                  {t("admin.userProfile.directorNameChangeNoteLabel")}
                </label>
                <input
                  id="director-admin-note"
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  disabled={actionBusy}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-xiio-accent"
                  maxLength={500}
                />
              </div>
              {actionErr && <p className="text-red-400 text-sm">{actionErr}</p>}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleDirectorChange("approve")}
                  className="px-4 py-2 rounded-lg bg-xiio-accent hover:bg-xiio-accent-hover disabled:opacity-40 text-white text-sm font-medium"
                >
                  {actionBusy
                    ? t("admin.userProfile.directorNameChangeProcessing")
                    : t("admin.userProfile.directorNameChangeApprove")}
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleDirectorChange("reject")}
                  className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/5 disabled:opacity-40 text-sm"
                >
                  {t("admin.userProfile.directorNameChangeReject")}
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-xiio-muted">{t("admin.userProfile.directorNameChangeSuperOnly")}</p>
          )}
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">
          {t("admin.userProfile.worksTitle")} ({data.works.length})
        </h2>
        {data.works.length === 0 ? (
          <p className="text-xiio-muted text-sm">{t("admin.userProfile.worksEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {data.works.map((w) => (
              <li
                key={w.id}
                className="rounded-xl border border-white/10 bg-xiio-surface px-4 py-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="text-white font-medium">{w.title}</p>
                  <p className="text-xs text-xiio-muted mt-0.5">
                    {t(`myWorks.section.${w.section}`)} · {t(`myWorks.status.${w.platformStatus}`)} ·{" "}
                    {t(`myWorks.stream.${w.streamStatus}`)}
                    {(w.approvedCategory ?? w.proposedCategory) &&
                      ` · ${w.approvedCategory ?? w.proposedCategory}`}
                  </p>
                </div>
                <AdminWorkLink ownerUid={data.uid} workId={w.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <AdminUserActivityTimeline uid={data.uid} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex flex-wrap gap-x-2">
      <span className="text-xiio-muted shrink-0">{label}:</span>
      <span className="text-white">{value}</span>
    </p>
  );
}
