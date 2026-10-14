/** Email ownership + self-declared enrollment, never proof of current enrollment. */
export type SchoolEmailMembership = {
  schoolId: string;
  schoolName: string;
  email: string;
  enrolled: boolean;
  graduationMonth: string;
  verifiedAt: number;
};

export const SCHOOL_CODE_TTL_MS = 10 * 60 * 1000;
export const SCHOOL_CODE_MAX_ATTEMPTS = 5;
export const SCHOOL_SEND_COOLDOWN_MS = 60 * 1000;

export function validSchoolId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,159}$/i.test(value);
}

export function normalizeSchoolEmail(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 254) return null;
  const email = value.trim().toLowerCase();
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email) ? email : null;
}

export function schoolEmailDomains(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === "string")
    .map(v => v.trim().toLowerCase())
    .filter(v => v.length <= 253 && v.split(".").length >= 2 && v.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))))];
}

/** Exact match only: subdomains must be explicitly approved too. */
export function emailMatchesSchool(email: string, domains: string[]): boolean {
  return domains.includes(email.slice(email.lastIndexOf("@") + 1));
}

/** Valid through the end of the self-reported graduation month (UTC). */
export function graduationExpiry(month: unknown): number {
  if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return 0;
  const [year, number] = month.split("-").map(Number);
  if (year < 2000 || year > 2200) return 0;
  return Date.UTC(year, number, 1);
}

export function validGraduationMonth(month: unknown, now = Date.now()): month is string {
  const expiry = graduationExpiry(month);
  return expiry > now && expiry <= now + 10 * 366 * 86400000;
}

export function schoolEligibilityReason(membership: SchoolEmailMembership | null | undefined, schoolId: string, domains: string[], reviewRequired: boolean, now = Date.now()): string | null {
  if (reviewRequired) return "school_review_required";
  if (!membership || membership.schoolId !== schoolId || !membership.verifiedAt) return "school_verification_required";
  if (!membership.enrolled || graduationExpiry(membership.graduationMonth) <= now) return "school_enrollment_expired";
  if (!emailMatchesSchool(membership.email, domains)) return "school_verification_required";
  return null;
}

export type SchoolVerificationStatus = {
  eligible: boolean;
  reason: string | null;
  schoolId: string | null;
  schoolName: string | null;
  maskedEmail: string | null;
  graduationMonth: string | null;
  domains: string[];
};
