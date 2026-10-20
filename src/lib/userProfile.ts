import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SignupProfile, UserProfileDoc, UserRole } from "@/types/user";
import { isAccountDeleted, parseUserProfileDoc } from "@/lib/userAccess";
import { DEMO_ME, DEMO_ME_PROFILE, isDemoVisit } from "@/lib/demo-flags";
import { getStoredLocale } from "@/i18n";

export const FIRESTORE_PERMISSION_DENIED = "FIRESTORE_PERMISSION_DENIED";

export type UserProfileFetchResult =
  | { status: "found"; profile: UserProfileDoc }
  | { status: "missing" }
  | { status: "error" };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapFirestoreError(err: unknown): Error {
  const code = (err as { code?: string })?.code;
  if (code === "permission-denied") {
    const e = new Error(FIRESTORE_PERMISSION_DENIED);
    Object.assign(e, { code: "permission-denied" });
    return e;
  }
  if (err instanceof Error) return err;
  return new Error("프로필 저장에 실패했습니다.");
}

export async function fetchUserProfile(uid: string): Promise<UserProfileFetchResult> {
  // The demo's signed-in member (lib/demo-flags): her profile, in the visitor's own language.
  if (uid === DEMO_ME.uid && isDemoVisit()) {
    return { status: "found", profile: parseUserProfileDoc({ ...DEMO_ME_PROFILE, locale: getStoredLocale() }) };
  }
  if (!db) return { status: "error" };
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return { status: "missing" };
    const profile = parseUserProfileDoc(snap.data() as Record<string, unknown>);
    if (isAccountDeleted(profile)) return { status: "missing" };
    return { status: "found", profile };
  } catch {
    return { status: "error" };
  }
}

export async function fetchUserProfileWithRetry(
  uid: string,
  options?: { attempts?: number; delayMs?: number }
): Promise<UserProfileFetchResult> {
  const attempts = options?.attempts ?? 3;
  const delayMs = options?.delayMs ?? 500;
  let last: UserProfileFetchResult = { status: "error" };
  for (let i = 0; i < attempts; i++) {
    last = await fetchUserProfile(uid);
    if (last.status !== "error") return last;
    if (i < attempts - 1) await sleep(delayMs * (i + 1));
  }
  return last;
}

export async function getUserProfile(uid: string): Promise<UserProfileDoc | null> {
  const result = await fetchUserProfile(uid);
  return result.status === "found" ? result.profile : null;
}

export async function hasUserProfile(uid: string): Promise<boolean> {
  const result = await fetchUserProfile(uid);
  return result.status === "found";
}

export async function saveUserProfile(
  uid: string,
  profile: SignupProfile,
  email: string | null,
  options?: { emailVerified?: boolean; role?: UserRole }
): Promise<void> {
  if (!db) throw new Error("Firebase가 설정되지 않았습니다.");

  const ref = doc(db, "users", uid);
  const role = options?.role ?? "member";
  const emailVerified = options?.emailVerified ?? false;

  try {
    const existing = await getDoc(ref);
    const existingDisplayName = existing.exists()
      ? String((existing.data() as Record<string, unknown>).displayName ?? "").trim()
      : "";
    await setDoc(
      ref,
      {
        ...(!existingDisplayName ? { displayName: profile.displayName } : {}),
        locale: profile.locale,
        birthDate: profile.birthDate,
        gender: profile.gender,
        age: null,
        isStudent: false,
        schoolName: null,
        platformPurpose: profile.platformPurpose,
        ...(profile.defaultDirectorName?.trim()
          ? {
              defaultDirectorName: profile.defaultDirectorName.trim().slice(0, 120),
            }
          : {}),
        email: email?.toLowerCase() ?? null,
        emailVerified,
        role,
        updatedAt: serverTimestamp(),
        ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true }
    );
  } catch (err) {
    throw mapFirestoreError(err);
  }
}

/** Google 로그인 직후 최소 프로필 */
export async function markEmailVerified(uid: string): Promise<void> {
  if (!db) return;
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    emailVerified: true,
    updatedAt: serverTimestamp(),
  });
}

/** 예전 가입(나이만 저장, birthDate·locale·gender 없음) */
export function isLegacyProfile(profile: UserProfileDoc): boolean {
  if (profile.birthDate?.trim()) return false;
  const age = profile.age;
  return age != null && age >= 13 && age <= 120;
}

export function isProfileComplete(profile: UserProfileDoc): boolean {
  if (!profile.displayName.trim()) return false;
  if (!profile.platformPurpose) return false;

  if (isLegacyProfile(profile)) return true;

  if (!profile.birthDate?.trim()) return false;
  if (!profile.locale) return false;
  if (!profile.gender) return false;
  return true;
}

export async function getPostAuthPath(uid: string): Promise<"/" | "/signup"> {
  const result = await fetchUserProfileWithRetry(uid);
  if (result.status === "error") return "/";
  if (result.status === "missing" || !isProfileComplete(result.profile)) return "/signup";
  return "/";
}
