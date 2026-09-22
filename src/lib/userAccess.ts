import type { Locale } from "@/i18n";
import { parseProfileLink } from "@/lib/profileLink";
import { parseSocietyBannerBackgroundId } from "@/lib/societyBannerBackground";
import { resolveRoleTags } from "@/lib/roleTags";
import type { ProfileRoleTag } from "@/types/portfolio";
import { isProfessionalField, type ProfessionalField } from "@/types/portfolio";
import type {
  DirectorNameChangeRequest,
  DirectorNameChangeRequestStatus,
  PlatformPurpose,
  UserGender,
  UserRole,
  UserProfileDoc,
} from "@/types/user";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseLocale(value: unknown): Locale | undefined {
  return value === "en" || value === "ko" || value === "ja" ? value : undefined;
}

function parseBirthDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return ISO_DATE_RE.test(trimmed) ? trimmed : undefined;
}

export function parseUserGender(value: unknown): UserGender | undefined {
  if (value === "male" || value === "female" || value === "undisclosed") return value;
  return undefined;
}

export const DEFAULT_ADMIN_ALLOWED_ROLES: UserRole[] = ["admin", "super_admin"];

export type MemberAccessResult =
  | { kind: "none" }
  | { kind: "no_profile" }
  | { kind: "deleted" }
  | { kind: "active"; profile: UserProfileDoc }
  | { kind: "error" };

export function isAccountDeleted(profile: Pick<UserProfileDoc, "accountStatus">): boolean {
  return profile.accountStatus === "deleted";
}

function parsePlatformPurpose(value: unknown): PlatformPurpose {
  if (value === "collaborate") return "collaborate";
  if (value === "upload") return "upload";
  if (value === "both") return "both";
  return "watch";
}

export function parseProfileChangeRequest(value: unknown): DirectorNameChangeRequest | undefined {
  if (!value || typeof value !== "object") return undefined;
  const o = value as Record<string, unknown>;
  const status = o.status;
  if (status !== "pending" && status !== "approved" && status !== "rejected") {
    return undefined;
  }
  const requestedName = String(o.requestedName ?? "").trim().slice(0, 120);
  if (!requestedName) return undefined;
  return {
    requestedName,
    reason: o.reason ? String(o.reason).trim().slice(0, 500) : undefined,
    status: status as DirectorNameChangeRequestStatus,
    requestedAt: o.requestedAt,
    resolvedAt: o.resolvedAt,
    adminNote: o.adminNote ? String(o.adminNote).trim().slice(0, 500) : undefined,
  };
}

export function parseUserProfileDoc(data: Record<string, unknown>): UserProfileDoc {
  const ageRaw = data.age;
  const age =
    typeof ageRaw === "number" && ageRaw >= 1 && ageRaw <= 120 ? ageRaw : undefined;

  return {
    displayName: String(data.displayName ?? ""),
    age,
    locale: parseLocale(data.locale),
    birthDate: parseBirthDate(data.birthDate) ?? null,
    gender: parseUserGender(data.gender) ?? null,
    isStudent: !!data.isStudent,
    schoolName: data.schoolName ? String(data.schoolName) : undefined,
    platformPurpose: parsePlatformPurpose(data.platformPurpose),
    email: data.email != null ? String(data.email) : null,
    emailVerified: !!data.emailVerified,
    role: (["member", "admin", "super_admin"].includes(String(data.role))
      ? data.role
      : "member") as UserRole,
    defaultDirectorName: data.defaultDirectorName
      ? String(data.defaultDirectorName).trim().slice(0, 120)
      : undefined,
    directorNameChangeRequest: parseProfileChangeRequest(data.directorNameChangeRequest),
    displayNameChangeRequest: parseProfileChangeRequest(data.displayNameChangeRequest),
    handleChangeRequest: parseProfileChangeRequest(data.handleChangeRequest),
    avatarUrl:
      typeof data.avatarUrl === "string" && data.avatarUrl.trim().startsWith("https://")
        ? data.avatarUrl.trim().slice(0, 2048)
        : data.avatarUrl === null
          ? null
          : undefined,
    handle: data.handle ? String(data.handle).trim().toLowerCase() : undefined,
    headline: data.headline ? String(data.headline).trim().slice(0, 200) : undefined,
    bio: data.bio ? String(data.bio).trim().slice(0, 2000) : undefined,
    primaryField:
      typeof data.primaryField === "string" && isProfessionalField(data.primaryField)
        ? (data.primaryField as ProfessionalField)
        : undefined,
    roleTags: resolveRoleTags(data) as ProfileRoleTag[],
    crewRoles: Array.isArray(data.crewRoles)
      ? data.crewRoles.map((x) => String(x).trim()).filter(Boolean).slice(0, 10)
      : undefined,
    isDiscoverable: data.isDiscoverable !== false,
    openToCollaborate: data.openToCollaborate === true,
    collaborationNote: data.collaborationNote
      ? String(data.collaborationNote).trim().slice(0, 200)
      : undefined,
    followerCount:
      typeof data.followerCount === "number" && data.followerCount >= 0
        ? data.followerCount
        : 0,
    followingCount:
      typeof data.followingCount === "number" && data.followingCount >= 0
        ? data.followingCount
        : 0,
    societyBannerBackgroundId: parseSocietyBannerBackgroundId(data.societyBannerBackgroundId),
    profileLink: parseProfileLink(data.profileLink),
    accountStatus: data.accountStatus === "deleted" ? "deleted" : "active",
    deletedAt: data.deletedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function resolveMemberAccess(
  exists: boolean,
  data: Record<string, unknown> | undefined
): MemberAccessResult {
  if (!exists || !data) return { kind: "no_profile" };
  const profile = parseUserProfileDoc(data);
  if (isAccountDeleted(profile)) return { kind: "deleted" };
  return { kind: "active", profile };
}

export function canAccessAdminPanel(
  profile: Pick<UserProfileDoc, "role"> | null | undefined,
  allowedRoles: string[]
): boolean {
  if (!profile) return false;
  const role = profile.role ?? "member";
  if (role === "super_admin" || role === "admin") return true;
  return allowedRoles.includes(role);
}

export function isSuperAdminRole(role: string | undefined): boolean {
  return role === "super_admin";
}
