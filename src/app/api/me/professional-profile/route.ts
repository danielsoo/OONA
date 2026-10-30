import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { jsonError, requireUser } from "@/lib/server/api-auth";
import { normalizeHandle } from "@/lib/server/credits";
import { claimHandle } from "@/lib/server/handles";
import { normalizeRoleTagsInput } from "@/lib/roleTags";
import { getDbOrNull } from "@/lib/server/works";
import { parseProfileLink } from "@/lib/profileLink";
import { parseSocietyBannerBackgroundId } from "@/lib/societyBannerBackground";
import { parseUserProfileDoc } from "@/lib/userAccess";
import { parseAvatarUrlInput as parseAvatarUrl } from "@/lib/avatarPresets";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  const snap = await db.collection("users").doc(auth.session.uid).get();
  if (!snap.exists) return jsonError("profile_not_found", "프로필이 없습니다.", 404);

  const profile = parseUserProfileDoc(snap.data() as Record<string, unknown>);
  return NextResponse.json({
    handle: profile.handle ?? null,
    headline: profile.headline ?? null,
    bio: profile.bio ?? null,
    roleTags: profile.roleTags ?? [],
    crewRoles: profile.crewRoles ?? [],
    isDiscoverable: profile.isDiscoverable !== false,
    openToCollaborate: profile.openToCollaborate === true,
    collaborationNote: profile.collaborationNote ?? null,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl ?? null,
    defaultDirectorName: profile.defaultDirectorName ?? null,
    displayNameChangeRequest: profile.displayNameChangeRequest ?? null,
    handleChangeRequest: profile.handleChangeRequest ?? null,
    followerCount: profile.followerCount ?? 0,
    followingCount: profile.followingCount ?? 0,
    societyBannerBackgroundId: profile.societyBannerBackgroundId ?? null,
    profileLink: profile.profileLink ?? null,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  let body: {
    handle?: string;
    headline?: string;
    bio?: string;
    roleTags?: string[];
    crewRoles?: string[];
    isDiscoverable?: boolean;
    openToCollaborate?: boolean;
    collaborationNote?: string;
    avatarUrl?: string | null;
    societyBannerBackgroundId?: string | null;
    profileLink?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("invalid_json", "요청 형식(JSON)이 올바르지 않습니다.", 400);
  }

  const uid = auth.session.uid;
  const existingSnap = await db.collection("users").doc(uid).get();
  const existingProfile = existingSnap.exists
    ? parseUserProfileDoc(existingSnap.data() as Record<string, unknown>)
    : null;

  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  if (body.headline !== undefined) {
    updates.headline = body.headline.trim().slice(0, 200) || null;
  }
  if (body.bio !== undefined) {
    updates.bio = body.bio.trim().slice(0, 2000) || null;
  }
  if (body.roleTags !== undefined) {
    updates.roleTags = normalizeRoleTagsInput(body.roleTags);
    updates.primaryField = null;
  }
  if (body.crewRoles !== undefined) {
    updates.crewRoles = Array.isArray(body.crewRoles)
      ? body.crewRoles.map((x) => String(x).trim()).filter(Boolean).slice(0, 10)
      : [];
  }
  if (body.isDiscoverable !== undefined) {
    updates.isDiscoverable = !!body.isDiscoverable;
  }
  if (body.openToCollaborate !== undefined) {
    updates.openToCollaborate = !!body.openToCollaborate;
  }
  if (body.collaborationNote !== undefined) {
    updates.collaborationNote = body.collaborationNote.trim().slice(0, 200) || null;
  }
  if (body.avatarUrl !== undefined) {
    const parsed = parseAvatarUrl(body.avatarUrl, uid);
    if (parsed === undefined && body.avatarUrl !== null) {
      return jsonError("invalid_avatar_url", "유효하지 않은 프로필 사진 URL입니다.", 400);
    }
    if (parsed !== undefined) {
      updates.avatarUrl = parsed;
    }
  }
  if (body.societyBannerBackgroundId !== undefined) {
    if (body.societyBannerBackgroundId === null || body.societyBannerBackgroundId === "") {
      updates.societyBannerBackgroundId = null;
    } else {
      const parsed = parseSocietyBannerBackgroundId(body.societyBannerBackgroundId);
      if (!parsed) {
        return jsonError("invalid_banner", "유효하지 않은 배너 배경입니다.", 400);
      }
      updates.societyBannerBackgroundId = parsed;
    }
  }
  if (body.profileLink !== undefined) {
    if (body.profileLink === null || body.profileLink.trim() === "") {
      updates.profileLink = null;
    } else {
      const parsed = parseProfileLink(body.profileLink);
      if (!parsed) {
        return jsonError("invalid_profile_link", "유효하지 않은 링크 URL입니다.", 400);
      }
      updates.profileLink = parsed;
    }
  }

  const profileMerge =
    Object.keys(updates).length > 1
      ? Object.fromEntries(Object.entries(updates).filter(([k]) => k !== "updatedAt"))
      : undefined;

  // claimHandle writes the rest of the profile in the same transaction, so the
  // plain merge below only runs when it did not. Sending the handle one already
  // has is not a claim and used to fall between the two: the request answered
  // 200 and nothing was written.
  let written = false;

  if (body.handle !== undefined && body.handle.trim()) {
    const nextHandle = normalizeHandle(body.handle);
    const currentHandle = existingProfile?.handle?.trim() ?? "";
    if (currentHandle && nextHandle && nextHandle !== currentHandle) {
      return jsonError(
        "handle_locked",
        "아이디(@handle)는 설정 후 직접 변경할 수 없습니다. 변경 신청을 이용해 주세요.",
        403
      );
    }
    if (!currentHandle) {
      const result = await claimHandle(db, uid, body.handle, profileMerge);
      if (!result.ok) {
        const msg =
          result.code === "handle_taken"
            ? "이미 사용 중인 handle입니다."
            : "handle은 3~30자의 영문 소문자, 숫자, 밑줄(_), 마침표(.)만 사용할 수 있습니다. 앞뒤·연속 마침표는 불가합니다.";
        return jsonError(result.code, msg, result.code === "handle_taken" ? 409 : 400);
      }
      written = true;
    }
  }

  if (!written && profileMerge && Object.keys(profileMerge).length > 0) {
    await db.collection("users").doc(uid).set(updates, { merge: true });
  }

  const snap = await db.collection("users").doc(uid).get();
  const profile = parseUserProfileDoc(snap.data() as Record<string, unknown>);
  return NextResponse.json({
    handle: profile.handle ?? null,
    headline: profile.headline ?? null,
    bio: profile.bio ?? null,
    roleTags: profile.roleTags ?? [],
    crewRoles: profile.crewRoles ?? [],
    isDiscoverable: profile.isDiscoverable !== false,
    openToCollaborate: profile.openToCollaborate === true,
    collaborationNote: profile.collaborationNote ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    societyBannerBackgroundId: profile.societyBannerBackgroundId ?? null,
    profileLink: profile.profileLink ?? null,
  });
}
