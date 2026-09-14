import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { SchoolDoc, SchoolGeoLocation, SchoolListItem, SchoolSuggestion } from "@/types/school";

const SUGGEST_LIMIT = 8;
const SCAN_LIMIT = 500;

export function schoolsCol(db: Firestore) {
  return db.collection("schools");
}

export function schoolRef(db: Firestore, schoolId: string) {
  return schoolsCol(db).doc(schoolId);
}

export function slugifySchoolName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const SCHOOL_NAME_STOPWORDS = new Set(["the", "of", "and", "at", "a", "an"]);

/**
 * "The Pennsylvania State University" -> PSU, "University of California, Los Angeles" -> UCLA.
 * Drop filler words, then take every remaining word's first letter — this matches how most
 * real university initialisms are actually formed, not just the first two words.
 */
function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const meaningful = words.filter((w) => !SCHOOL_NAME_STOPWORDS.has(w.toLowerCase().replace(/[^a-z]/gi, "")));
  const source = meaningful.length > 0 ? meaningful : words;
  if (source.length === 0) return "??";
  if (source.length === 1) {
    const word = source[0];
    // Already an acronym-looking name (KAIST, MIT, ...) — use as-is instead of truncating it
    if (/^[A-Z]{2,6}$/.test(word)) return word;
    return word.slice(0, 2).toUpperCase();
  }
  return source
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 5);
}

function shortNameFromName(name: string): string {
  return name.trim().replace(/^the\s+/i, "").trim() || name.trim();
}

function parseSchoolLocation(value: unknown): SchoolGeoLocation | null {
  if (!value || typeof value !== "object") return null;
  const location = value as Record<string, unknown>;
  if (typeof location.latitude !== "number" || typeof location.longitude !== "number") return null;
  const latitude = location.latitude;
  const longitude = location.longitude;
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  const source = location.source;
  return {
    latitude,
    longitude,
    ...(typeof location.city === "string" && location.city.trim() ? { city: location.city.trim() } : {}),
    ...(typeof location.country === "string" && location.country.trim() ? { country: location.country.trim() } : {}),
    ...(typeof location.countryCode === "string" && location.countryCode.trim()
      ? { countryCode: location.countryCode.trim().toUpperCase().slice(0, 2) }
      : {}),
    source: source === "verified" || source === "geocoded" ? source : "submitted",
  };
}

export function parseSchoolDoc(id: string, data: Record<string, unknown>): SchoolListItem {
  const name = data.name ? String(data.name) : id;
  return {
    id,
    name,
    shortName: data.shortName ? String(data.shortName) : shortNameFromName(name),
    // Always derived fresh from name (not trusted from storage) so algorithm
    // improvements apply retroactively to every school without a migration.
    initials: initialsFromName(name),
    slug: data.slug ? String(data.slug) : id,
    colorPrimary: typeof data.colorPrimary === "string" ? data.colorPrimary : "#0ea5e9",
    colorSecondary: typeof data.colorSecondary === "string" ? data.colorSecondary : "#ffffff",
    logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : null,
    location: parseSchoolLocation(data.location),
    status: data.status === "active" || data.status === "merged" ? data.status : "pending",
    mergedIntoSlug: data.mergedIntoSlug ? String(data.mergedIntoSlug) : undefined,
    proposedBy: data.proposedBy ? String(data.proposedBy) : undefined,
    workCount: typeof data.workCount === "number" ? data.workCount : 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/** 슬러그가 이미 있으면 그대로 반환, 없으면 pending 상태로 자가등록 — tag-suggest와 동일한 무차단 흐름 */
export async function getOrCreateSchool(
  db: Firestore,
  name: string,
  proposedBy: string,
  location?: SchoolGeoLocation | null
): Promise<SchoolListItem> {
  const trimmed = name.trim().slice(0, 120);
  const slug = slugifySchoolName(trimmed);
  if (!trimmed || !slug) throw new Error("invalid_school_name");

  const ref = schoolRef(db, slug);
  const snap = await ref.get();
  if (snap.exists) {
    return parseSchoolDoc(snap.id, snap.data() as Record<string, unknown>);
  }

  const doc: SchoolDoc = {
    name: trimmed,
    shortName: shortNameFromName(trimmed),
    initials: initialsFromName(trimmed),
    slug,
    colorPrimary: "#0ea5e9",
    colorSecondary: "#ffffff",
    logoUrl: null,
    location: location ?? null,
    status: "pending",
    proposedBy,
    workCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(doc);
  return { id: slug, ...doc };
}

export async function getSchoolById(db: Firestore, schoolId: string): Promise<SchoolListItem | null> {
  const snap = await schoolRef(db, schoolId).get();
  if (!snap.exists) return null;
  return parseSchoolDoc(snap.id, snap.data() as Record<string, unknown>);
}

export async function collectSchoolsForSuggestions(db: Firestore): Promise<SchoolListItem[]> {
  const snap = await schoolsCol(db).where("status", "in", ["active", "pending"]).limit(SCAN_LIMIT).get();
  return snap.docs.map((d) => parseSchoolDoc(d.id, d.data() as Record<string, unknown>));
}

export function filterSchoolSuggestions(
  catalog: SchoolListItem[],
  query: string,
  limit = SUGGEST_LIMIT
): SchoolSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matches = catalog.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.shortName.toLowerCase().includes(q) ||
      s.slug.includes(q)
  );

  matches.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(q) || a.shortName.toLowerCase().startsWith(q);
    const bStarts = b.name.toLowerCase().startsWith(q) || b.shortName.toLowerCase().startsWith(q);
    if (aStarts !== bStarts) return aStarts ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return matches.slice(0, limit).map((s) => ({
    id: s.id,
    name: s.name,
    shortName: s.shortName,
    initials: s.initials,
    logoUrl: s.logoUrl,
    colorPrimary: s.colorPrimary,
    colorSecondary: s.colorSecondary,
    location: s.location,
  }));
}

/** 발행/삭제 시점에만 호출 — 학교별 작품 수 카운터 (school-feeds 랭킹용) */
export async function adjustSchoolWorkCount(db: Firestore, schoolId: string, delta: number): Promise<void> {
  if (!schoolId || delta === 0) return;
  const ref = schoolRef(db, schoolId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const current = typeof snap.data()?.workCount === "number" ? (snap.data()!.workCount as number) : 0;
    tx.update(ref, { workCount: Math.max(0, current + delta), updatedAt: FieldValue.serverTimestamp() });
  });
}
