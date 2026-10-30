"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUiCopy } from "@/components/i18n/UiText";
import { useTranslations } from "@/context/LocaleContext";
import { isDemoVisit } from "@/lib/demo-flags";
import {
  getHandleErrorMessage,
  getHandleValidationError,
  mapHandleApiError,
} from "@/lib/handle";
import { isValidProfileLinkInput, parseProfileLink } from "@/lib/profileLink";

export type ProfessionalProfileFields = {
  handle: string;
  headline: string;
  bio: string;
  profileLink: string;
  isDiscoverable: boolean;
  openToCollaborate: boolean;
  collaborationNote: string;
};

export type ProfessionalProfileSaved = {
  handle: string | null;
  headline: string | null;
  bio: string | null;
  profileLink: string | null;
  isDiscoverable: boolean;
  openToCollaborate: boolean;
  collaborationNote: string | null;
};

export type ProfessionalProfileFieldErrors = Partial<
  Record<keyof ProfessionalProfileFields, string>
>;

const emptyFields: ProfessionalProfileFields = {
  handle: "",
  headline: "",
  bio: "",
  profileLink: "",
  isDiscoverable: true,
  openToCollaborate: false,
  collaborationNote: "",
};

function parseApiProfile(data: Record<string, unknown>): ProfessionalProfileFields {
  const storedLink = data.profileLink ? String(data.profileLink) : "";
  return {
    handle: data.handle ? String(data.handle) : "",
    headline: data.headline ? String(data.headline) : "",
    bio: data.bio ? String(data.bio) : "",
    profileLink: storedLink ? (parseProfileLink(storedLink) ?? storedLink) : "",
    isDiscoverable: data.isDiscoverable !== false,
    openToCollaborate: data.openToCollaborate === true,
    collaborationNote: data.collaborationNote ? String(data.collaborationNote) : "",
  };
}

type Options = {
  /** PATCH 시 isDiscoverable 포함 (계정 편집기) */
  includeDiscoverable?: boolean;
  /** handle이 이미 설정된 경우 PATCH에 handle 미포함 */
  handleLocked?: boolean;
};

export function useProfessionalProfileSave(options: Options = {}) {
  const { includeDiscoverable = false, handleLocked = false } = options;
  const { user } = useAuth();
  const { t } = useTranslations();
  const copy = useUiCopy();
  const [fields, setFields] = useState<ProfessionalProfileFields>(emptyFields);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  /** The last save went nowhere because this tab is the demo, so msg is not a confirmation. */
  const [msgIsDemo, setMsgIsDemo] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfessionalProfileFieldErrors>({});

  const applyFields = useCallback((next: Partial<ProfessionalProfileFields>) => {
    setFields((prev) => ({ ...prev, ...next }));
    if ("handle" in next) {
      setFieldErrors((prev) => {
        if (!prev.handle) return prev;
        const { handle: _, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/me/professional-profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = (await res.json()) as Record<string, unknown>;
    setFields(parseApiProfile(data));
  }, [user]);

  const save = useCallback(async (): Promise<ProfessionalProfileSaved | null> => {
    if (!user) return null;
    setBusy(true);
    setErr(null);
    setMsg(null);
    setMsgIsDemo(false);
    setFieldErrors({});

    const willSendHandle = !handleLocked && fields.handle.trim();
    if (willSendHandle) {
      const handleErr = getHandleValidationError(fields.handle, t);
      if (handleErr) {
        setFieldErrors({ handle: handleErr });
        setBusy(false);
        return null;
      }
    }

    if (fields.profileLink.trim() && !isValidProfileLinkInput(fields.profileLink)) {
      setFieldErrors({ profileLink: t("profile.edit.profileLinkInvalid") });
      setBusy(false);
      return null;
    }

    try {
      const token = await user.getIdToken();
      const parsedLink = fields.profileLink.trim()
        ? parseProfileLink(fields.profileLink.trim())
        : null;
      const body: Record<string, unknown> = {
        headline: fields.headline,
        bio: fields.bio,
        profileLink: parsedLink,
        roleTags: [],
        crewRoles: [],
        openToCollaborate: fields.openToCollaborate,
        collaborationNote: fields.collaborationNote,
      };
      if (willSendHandle) {
        body.handle = fields.handle.trim();
      }
      if (includeDiscoverable) {
        body.isDiscoverable = fields.isDiscoverable;
      }
      const res = await fetch("/api/me/professional-profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as ProfessionalProfileSaved & {
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        const handleCode = mapHandleApiError(data.error);
        if (handleCode) {
          setFieldErrors({ handle: getHandleErrorMessage(handleCode, t) });
        } else {
          setErr(data.message ?? data.error ?? t("profile.edit.saveError"));
        }
        return null;
      }
      // The demo answers /api/* in the browser and keeps nothing, so its reply
      // carries no profile: taking it as the saved one blanked the form behind
      // a green "saved". Keep what was typed on screen and say it is not kept.
      if (isDemoVisit()) {
        const shown: ProfessionalProfileSaved = {
          handle: fields.handle.trim() || null,
          headline: fields.headline.trim() || null,
          bio: fields.bio.trim() || null,
          profileLink: parsedLink ?? null,
          isDiscoverable: fields.isDiscoverable,
          openToCollaborate: fields.openToCollaborate,
          collaborationNote: fields.collaborationNote.trim() || null,
        };
        setMsg(copy("Not saved — the demo keeps nothing."));
        setMsgIsDemo(true);
        return shown;
      }
      const saved: ProfessionalProfileSaved = {
        handle: data.handle ?? null,
        headline: data.headline ?? null,
        bio: data.bio ?? null,
        profileLink: data.profileLink ?? null,
        isDiscoverable: data.isDiscoverable !== false,
        openToCollaborate: data.openToCollaborate === true,
        collaborationNote: data.collaborationNote ?? null,
      };
      setFields(parseApiProfile(saved as unknown as Record<string, unknown>));
      setMsg(t("profile.edit.saved"));
      return saved;
    } catch {
      setErr(t("profile.edit.saveError"));
      return null;
    } finally {
      setBusy(false);
    }
  }, [user, fields, includeDiscoverable, handleLocked, t, copy]);

  const clearMessages = useCallback(() => {
    setMsg(null);
    setMsgIsDemo(false);
    setErr(null);
    setFieldErrors({});
  }, []);

  return {
    fields,
    setFields,
    applyFields,
    load,
    save,
    busy,
    msg,
    msgIsDemo,
    err,
    fieldErrors,
    clearMessages,
  };
}
