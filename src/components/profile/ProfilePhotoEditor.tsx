"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import AvatarPresetPicker from "@/components/profile/AvatarPresetPicker";
import { uploadUserProfileAvatar } from "@/lib/userAvatar";
import { formatApiError, formatClientError, readResponseJson } from "@/lib/clientErrors";

type Props = {
  displayName: string;
  avatarUrl?: string | null;
  onUpdated?: (avatarUrl: string | null) => void;
};

export default function ProfilePhotoEditor({ displayName, avatarUrl, onUpdated }: Props) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl ?? null);

  useEffect(() => {
    setPreview(avatarUrl ?? null);
  }, [avatarUrl]);

  const syncPreview = (url: string | null) => {
    setPreview(url);
    onUpdated?.(url);
  };

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
      setErr(formatApiError(t, res.status, { ...body, message: body.message ?? raw.slice(0, 500) }));
      return false;
    }
    return true;
  };

  const onFile = async (file: File | undefined) => {
    if (!user || !file) return;
    if (!file.type.startsWith("image/")) {
      setErr(t("profile.photo.invalidType"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr(t("profile.photo.tooLarge"));
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const url = await uploadUserProfileAvatar(user.uid, file);
      const ok = await patchAvatarUrl(url);
      if (!ok) return;
      syncPreview(url);
      setMsg(t("profile.photo.photoUpdated"));
    } catch (e) {
      setErr(formatClientError(t, e, { titleKey: "profile.photo.uploadFailed" }));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // A preset is already on the site, so there is nothing to upload: it only
  // has to be saved.
  const pickPreset = async (src: string) => {
    if (!user || src === preview) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const ok = await patchAvatarUrl(src);
      if (!ok) return;
      syncPreview(src);
      setMsg(t("profile.photo.photoUpdated"));
    } catch (e) {
      setErr(formatClientError(t, e, { titleKey: "profile.photo.uploadFailed" }));
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async () => {
    if (!user || !preview) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const ok = await patchAvatarUrl(null);
      if (!ok) return;
      syncPreview(null);
      setMsg(t("profile.photo.photoUpdated"));
    } catch (e) {
      setErr(formatClientError(t, e, { titleKey: "profile.photo.uploadFailed" }));
    } finally {
      setBusy(false);
    }
  };

  const btnOutline =
    "px-3 py-2 rounded-lg text-sm font-medium border border-white/20 text-white hover:bg-white/5 disabled:opacity-40";

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
      <ProfileAvatar
        displayName={displayName}
        avatarUrl={preview}
        className="w-24 h-24 rounded-full bg-xiio-accent/20 ring-2 ring-xiio-accent/40 flex items-center justify-center text-3xl font-bold text-white overflow-hidden shrink-0 mx-auto sm:mx-0"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm text-white font-medium">{t("profile.photo.title")}</p>
        <p className="text-xs text-xiio-muted">{t("profile.photo.hint")}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={busy}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="px-3 py-2 rounded-lg bg-xiio-accent text-white text-sm font-medium disabled:opacity-40"
          >
            {busy ? t("profile.photo.uploading") : t("profile.photo.changePhoto")}
          </button>
          {preview && (
            <button type="button" disabled={busy} onClick={() => void removePhoto()} className={btnOutline}>
              {t("profile.photo.removePhoto")}
            </button>
          )}
        </div>
        <AvatarPresetPicker current={preview} disabled={busy} onPick={(src) => void pickPreset(src)} />
        {err && <p className="text-red-400 text-sm">{err}</p>}
        {msg && <p className="text-emerald-400 text-sm">{msg}</p>}
      </div>
    </div>
  );
}
