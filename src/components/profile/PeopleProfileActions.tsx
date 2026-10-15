"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useUiCopy } from "@/components/i18n/UiText";
import BusinessInviteComposerModal from "@/components/messages/BusinessInviteComposerModal";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import SocietyLoginDialog from "@/components/society/SocietyLoginDialog";

type Props = {
  profileUid: string;
  handle: string;
  displayName?: string;
  isSelf: boolean;
  initialFollowing: boolean;
  /** Called after a follow or unfollow goes through, e.g. to update a follower count. */
  onFollowChange?: (following: boolean) => void;
};

/** Dialogs go to <body>, so the styles of wherever the buttons sit don't reach into them. */
function Portal({ children }: { children: ReactNode }) {
  return typeof document === "undefined" ? null : createPortal(children, document.body);
}

export default function PeopleProfileActions({
  profileUid,
  handle,
  displayName,
  isSelf,
  initialFollowing,
  onFollowChange,
}: Props) {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslations();
  const copy = useUiCopy();
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [inviteComposerOpen, setInviteComposerOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    setLoginOpen(false);
    setInviteComposerOpen(false);
  }, [user?.uid]);

  if (isSelf) {
    return null;
  }

  if (!user || authLoading) {
    return (
      <div>
        <div className="flex flex-wrap gap-2">
          {["follow.follow", "dm.message", "dm.invites.composerTitle"].map((key) => (
            <button key={key} type="button" disabled={authLoading} onClick={() => setLoginOpen(true)} title={t("society.guest.actionHint")} className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-40">
              {t(key)}
            </button>
          ))}
        </div>
        <Portal>
          <SocietyLoginDialog open={!authLoading && loginOpen} onClose={() => setLoginOpen(false)} returnTo={`/people/${encodeURIComponent(handle)}`} />
        </Portal>
      </div>
    );
  }

  const toggleFollow = async () => {
    if (!user || authLoading) return;
    setBusy(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const method = following ? "DELETE" : "POST";
      const res = await fetch(`/api/me/follows/${profileUid}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFollowing(!following);
        onFollowChange?.(!following);
      } else {
        setNotice(copy("That didn't go through. Please try again."));
      }
    } catch {
      setNotice(copy("That didn't go through. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const startDm = async () => {
    if (!user || authLoading) return;
    setBusy(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/me/dm/threads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetUid: profileUid }),
      });
      const data = (await res.json().catch(() => ({}))) as { threadId?: string; error?: string };
      if (res.ok && data.threadId) {
        router.push(`/messages/${data.threadId}`);
      } else if (data.error === "blocked") {
        setNotice(copy("You can't message this person."));
      } else {
        setNotice(copy("Couldn't open the conversation. Please try again."));
      }
    } catch {
      setNotice(copy("Couldn't open the conversation. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const btnOutline =
    "px-4 py-2 rounded-lg text-sm font-medium border border-white/20 text-white hover:bg-white/5 disabled:opacity-40";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={busy}
        aria-pressed={following}
        onClick={() => void toggleFollow()}
        className={following ? btnOutline : "px-4 py-2 rounded-lg text-sm font-medium bg-xiio-accent text-white disabled:opacity-40"}
      >
        {following ? t("follow.following") : t("follow.follow")}
      </button>
      <button type="button" disabled={busy} onClick={() => void startDm()} className={btnOutline}>
        {t("dm.message")}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setInviteComposerOpen(true)}
        className={btnOutline}
      >
        {t("dm.invites.composerTitle")}
      </button>
      {notice ? <p role="status" className="w-full text-[13px] text-amber-200/90">{notice}</p> : null}
      {inviteComposerOpen && (
        <Portal>
          <BusinessInviteComposerModal
            presetRecipient={{ uid: profileUid, handle, displayName: displayName || handle }}
            onClose={() => setInviteComposerOpen(false)}
            onSent={() => {
              setInviteComposerOpen(false);
              setNotice(copy("Invitation sent. You can follow it in Society → Sent."));
            }}
          />
        </Portal>
      )}
    </div>
  );
}
