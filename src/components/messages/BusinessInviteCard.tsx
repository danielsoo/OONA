"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import DmProfileLink from "@/components/messages/DmProfileLink";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { formatDmTime } from "@/lib/dm/formatDmTime";
import type { BusinessInviteListItem } from "@/types/business-invite";
import type { PublicPortfolioPayload } from "@/types/portfolio";

type Props = {
  invite: BusinessInviteListItem;
  box: "received" | "sent";
  onChanged: () => void;
};

export default function BusinessInviteCard({ invite, box, onChanged }: Props) {
  const { user } = useAuth();
  const { t, locale } = useTranslations();
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const [portfolio, setPortfolio] = useState<PublicPortfolioPayload | null>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleExpanded = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !portfolio && user) {
      setLoadingPortfolio(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/me/business-invites/${invite.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as { portfolio?: PublicPortfolioPayload | null };
          setPortfolio(data.portfolio ?? null);
        }
      } finally {
        setLoadingPortfolio(false);
      }
    }
  };

  const accept = async () => {
    if (!user || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/me/business-invites/${invite.id}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { ok?: boolean; threadId?: string; projectId?: string; message?: string };
      if (!res.ok || !data.ok) {
        setErr(data.message ?? t("dm.invites.errorGeneric"));
        return;
      }
      onChanged();
      if (data.projectId) router.push(`/projects/${data.projectId}`);
      else if (data.threadId) router.push(`/messages/${data.threadId}`);
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    if (!user || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/me/business-invites/${invite.id}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setErr(data.message ?? t("dm.invites.errorGeneric"));
        return;
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const statusLabel: Record<string, string> = {
    pending: t("dm.invites.pending"),
    accepted: t("dm.invites.accepted"),
    declined: t("dm.invites.declined"),
    expired: t("dm.invites.expired"),
    cancelled: t("dm.invites.declined"),
  };

  const directionBadge =
    invite.direction === "offer" ? t("dm.invites.badgeOffer") : t("dm.invites.badgeApplication");

  return (
    <div className="border-b border-white/10 px-4 py-3">
      <div className="flex items-start gap-3">
        <DmProfileLink handle={invite.otherHandle} uid={invite.otherUid} className="shrink-0">
          <ProfileAvatar
            displayName={invite.otherDisplayName}
            avatarUrl={invite.otherAvatarUrl}
            className="w-11 h-11 rounded-full bg-white/10 ring-1 ring-white/15 flex items-center justify-center text-sm font-bold text-white overflow-hidden shrink-0"
          />
        </DmProfileLink>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <DmProfileLink handle={invite.otherHandle} uid={invite.otherUid} className="min-w-0">
              <p className="font-semibold text-sm text-white truncate">{invite.otherDisplayName}</p>
            </DmProfileLink>
            {typeof invite.createdAt === "string" && invite.createdAt && (
              <span className="text-[11px] text-xiio-muted tabular-nums shrink-0">
                {formatDmTime(invite.createdAt, locale)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-xiio-gold/[0.16] text-xiio-gold font-medium">
              {directionBadge}
            </span>
            {invite.status !== "pending" && (
              <span className="text-[11px] text-xiio-muted">{statusLabel[invite.status]}</span>
            )}
          </div>
          {invite.projectTitle && (
            <p className="mt-2 text-xs text-white/70">
              <span className="text-white/35">Project</span> · {invite.projectTitle}
              {invite.role ? <span className="text-white/35"> · {invite.role}</span> : null}
            </p>
          )}
          {invite.message && (
            <p className="text-sm text-white/90 mt-1.5 whitespace-pre-wrap break-words">{invite.message}</p>
          )}
          {invite.attachmentUrl && (
            <a
              href={invite.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-xiio-accent hover:underline mt-1.5"
            >
              📎 {invite.attachmentFileName || invite.attachmentUrl}
            </a>
          )}

          <button
            type="button"
            onClick={() => void toggleExpanded()}
            className="text-xs text-xiio-accent hover:underline mt-2"
          >
            {expanded ? t("dm.invites.hidePortfolio") : t("dm.invites.viewPortfolio")}
          </button>

          {expanded && (
            <div className="mt-2 rounded-lg bg-white/5 border border-white/10 p-3">
              {loadingPortfolio && (
                <p className="text-xs text-xiio-muted">{t("common.loading")}</p>
              )}
              {!loadingPortfolio && portfolio && (
                <div className="space-y-2">
                  {portfolio.profile.headline && (
                    <p className="text-xs text-white/80">{portfolio.profile.headline}</p>
                  )}
                  {portfolio.works.length === 0 && (
                    <p className="text-xs text-xiio-muted">—</p>
                  )}
                  <ul className="space-y-1">
                    {portfolio.works.map((w) => (
                      <li key={w.workId} className="text-xs text-white/90 truncate">
                        {w.title}
                        {w.role && <span className="text-xiio-muted ml-1">({w.role})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {err && <p className="text-red-400 text-xs mt-1.5">{err}</p>}

          {box === "received" && invite.status === "pending" && (
            <div className="flex gap-2 mt-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => void accept()}
                className="px-3 py-1.5 rounded-lg bg-xiio-accent text-white text-xs font-semibold disabled:opacity-40"
              >
                {busy ? t("dm.invites.accepting") : t("dm.invites.accept")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void decline()}
                className="px-3 py-1.5 rounded-lg border border-white/20 text-white text-xs font-medium disabled:opacity-40 hover:bg-white/5"
              >
                {busy ? t("dm.invites.declining") : t("dm.invites.decline")}
              </button>
            </div>
          )}

          {invite.status === "accepted" && invite.threadId && (
            <div className="mt-2 flex gap-3">
              <button type="button" onClick={() => router.push(`/messages/${invite.threadId}`)} className="text-xs text-xiio-accent hover:underline">{t("dm.invites.goToChat")}</button>
              {invite.projectId ? <button type="button" onClick={() => router.push(`/projects/${invite.projectId}`)} className="text-xs text-xiio-accent hover:underline">Open project →</button> : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
