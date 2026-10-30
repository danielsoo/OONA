"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { uploadUserProfileAvatar } from "@/lib/userAvatar";
import AvatarPresetPicker from "@/components/profile/AvatarPresetPicker";
import { formatApiError, formatClientError, readResponseJson } from "@/lib/clientErrors";
import type { UserProfileDoc } from "@/types/user";
import type { PlatformPurpose } from "@/types/user";

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "accent" | "warn" }) {
  const cls =
    variant === "accent"
      ? "bg-xiio-accent/20 text-xiio-accent border-xiio-accent/30"
      : variant === "warn"
        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
        : "bg-white/5 text-xiio-muted border-white/15";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${cls}`}>
      {children}
    </span>
  );
}

export type AccountProfileMetaItem = {
  label: string;
  value: string;
  /** 히어로 오른쪽에서 나이·가입일처럼 세로로 묶을 항목 */
  stack?: boolean;
};

function MetaItem({ label, value, stack }: AccountProfileMetaItem) {
  return (
    <div className={stack ? "text-right" : "text-left"}>
      <p className="text-xs text-xiio-muted">{label}</p>
      <p className="text-sm text-white mt-0.5 font-medium tabular-nums">{value}</p>
    </div>
  );
}

type Props = {
  profile: UserProfileDoc;
  email: string | null;
  metaItems?: AccountProfileMetaItem[];
  onAvatarUpdated?: (avatarUrl: string | null) => void;
};

export default function AccountProfileHero({
  profile,
  email,
  metaItems = [],
  onAvatarUpdated,
}: Props) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const verified = profile.emailVerified;
  const pendingReq = profile.directorNameChangeRequest?.status === "pending";
  const showUpload =
    profile.platformPurpose === "upload" || profile.platformPurpose === "both";
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const quickBtn =
    "inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium border border-white/20 text-white hover:bg-white/5 transition";

  const hasMeta = metaItems.length > 0;
  const stackedMeta = metaItems.filter((m) => m.stack);
  const otherMeta = metaItems.filter((m) => !m.stack);
  const canEditAvatar = Boolean(user);

  const patchAvatarUrl = async (next: string | null) => {
    if (!user) return false;
    const token = await user.getIdToken();
    const res = await fetch("/api/me/professional-profile", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ avatarUrl: next }),
    });
    const { data: body, raw } = await readResponseJson<{ message?: string; error?: string }>(res);
    if (!res.ok) {
      setAvatarErr(formatApiError(t, res.status, { ...body, message: body.message ?? raw.slice(0, 500) }));
      return false;
    }
    return true;
  };

  const handleAvatarFile = async (file: File | undefined) => {
    if (!user || !file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarErr(t("profile.photo.invalidType"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarErr(t("profile.photo.tooLarge"));
      return;
    }
    setAvatarBusy(true);
    setAvatarErr(null);
    setAvatarMsg(null);
    try {
      const url = await uploadUserProfileAvatar(user.uid, file);
      const ok = await patchAvatarUrl(url);
      if (!ok) return;
      onAvatarUpdated?.(url);
      setAvatarMsg(t("profile.photo.photoUpdated"));
    } catch (e) {
      setAvatarErr(formatClientError(t, e, { titleKey: "profile.photo.uploadFailed" }));
    } finally {
      setAvatarBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // A preset is already on the site, so there is nothing to upload.
  const pickAvatarPreset = async (src: string) => {
    if (!user || src === profile.avatarUrl) return;
    setAvatarBusy(true);
    setAvatarErr(null);
    setAvatarMsg(null);
    try {
      const ok = await patchAvatarUrl(src);
      if (!ok) return;
      onAvatarUpdated?.(src);
      setAvatarMsg(t("profile.photo.photoUpdated"));
    } catch (e) {
      setAvatarErr(formatClientError(t, e, { titleKey: "profile.photo.uploadFailed" }));
    } finally {
      setAvatarBusy(false);
    }
  };

  const onAvatarDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (!canEditAvatar || avatarBusy) return;
    void handleAvatarFile(e.dataTransfer.files?.[0]);
  };

  return (
    <section className="bg-xiio-surface rounded-2xl p-6 border border-white/10">
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-6 lg:gap-8">
        <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 min-w-0 flex-1">
          <div className="mx-auto sm:mx-0">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={!canEditAvatar || avatarBusy}
              onChange={(e) => void handleAvatarFile(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={!canEditAvatar || avatarBusy}
              onClick={() => inputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                if (canEditAvatar && !avatarBusy) setDragOver(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragOver(false);
              }}
              onDrop={onAvatarDrop}
              className={`group relative block rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-xiio-accent ${
                canEditAvatar ? "cursor-pointer" : "cursor-default"
              }`}
              aria-label={canEditAvatar ? t("profile.photo.changePhoto") : undefined}
            >
              <ProfileAvatar
                displayName={profile.displayName || "?"}
                avatarUrl={profile.avatarUrl}
                className={`w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-full bg-xiio-accent/20 ring-2 ring-xiio-accent/40 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white overflow-hidden transition ${
                  dragOver ? "ring-xiio-accent shadow-[0_0_0_3px_rgba(124,92,255,0.25)]" : ""
                }`}
              />
              {canEditAvatar && (
                <>
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/25 transition" />
                  <span className="pointer-events-none absolute -bottom-1 -right-1 h-8 w-8 rounded-full border border-white/20 bg-black/80 text-white flex items-center justify-center shadow-lg">
                    ✎
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-white truncate">{profile.displayName || "—"}</h1>
            {profile.handle && (
              <Link
                href={`/people/${profile.handle}`}
                className="text-sm text-xiio-accent hover:underline mt-1 inline-block"
              >
                @{profile.handle}
              </Link>
            )}
            {email && <p className="text-sm text-xiio-muted mt-1 truncate">{email}</p>}

            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              <Badge variant={verified ? "accent" : "warn"}>
                {verified ? t("settings.emailVerified") : t("settings.emailNotVerified")}
              </Badge>
              <Badge>
                {t(`admin.userProfile.purpose.${profile.platformPurpose as PlatformPurpose}`)}
              </Badge>
              {profile.defaultDirectorName && (
                <Badge variant="accent">
                  {t("accountProfile.directorName")}: {profile.defaultDirectorName}
                </Badge>
              )}
              {pendingReq && profile.directorNameChangeRequest && (
                <Badge variant="warn">
                  {t("accountProfile.directorChangePending", {
                    name: profile.directorNameChangeRequest.requestedName,
                  })}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
              <Link href="/settings" className={quickBtn}>
                {t("accountProfile.linkSettings")}
              </Link>
              {showUpload && (
                <Link
                  href="/uploader/upload"
                  className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium bg-xiio-accent hover:bg-xiio-accent-hover text-white transition"
                >
                  {t("accountProfile.quickUpload")}
                </Link>
              )}
            </div>
            {canEditAvatar && (
              <div className="mt-4">
                <AvatarPresetPicker
                  current={profile.avatarUrl}
                  disabled={avatarBusy}
                  onPick={(src) => void pickAvatarPreset(src)}
                />
              </div>
            )}
            {avatarErr && <p className="text-red-400 text-xs mt-3">{avatarErr}</p>}
            {avatarMsg && <p className="text-emerald-400 text-xs mt-3">{avatarMsg}</p>}
          </div>
        </div>

        {hasMeta && (
          <aside className="lg:w-56 xl:w-64 shrink-0 flex flex-col justify-center gap-4 lg:border-l lg:border-white/10 lg:pl-8">
            <div className="hidden lg:flex flex-col gap-4 justify-center min-h-full w-full">
              {otherMeta.length > 0 && (
                <div className="space-y-3">
                  {otherMeta.map((item) => (
                    <MetaItem key={`${item.label}-${item.value}`} {...item} />
                  ))}
                </div>
              )}
              {stackedMeta.length > 0 && (
                <div className="space-y-3 ml-auto">
                  {stackedMeta.map((item) => (
                    <MetaItem key={`${item.label}-${item.value}`} {...item} />
                  ))}
                </div>
              )}
            </div>

            <div className="lg:hidden rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 flex flex-col gap-4">
              {otherMeta.length > 0 && (
                <div className="flex flex-col gap-3">
                  {otherMeta.map((item) => (
                    <MetaItem key={`${item.label}-${item.value}`} {...item} />
                  ))}
                </div>
              )}
              {stackedMeta.length > 0 && (
                <div className="flex flex-col gap-3 items-end">
                  {stackedMeta.map((item) => (
                    <MetaItem key={`${item.label}-${item.value}`} {...item} />
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
