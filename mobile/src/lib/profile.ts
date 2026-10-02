import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { isAccountDeleted, parseUserProfileDoc } from "@/lib/userAccess";
import type { SignupProfile, UserProfileDoc } from "@/types/user";
import { db } from "~/lib/firebase";

export type ProfileStatus = "missing" | "incomplete" | "complete" | "deleted" | "error";

/** Same rule as the website's isProfileComplete (src/lib/userProfile.ts). */
function isProfileComplete(profile: UserProfileDoc): boolean {
  if (!profile.displayName.trim()) return false;
  if (!profile.platformPurpose) return false;
  const legacy = !profile.birthDate?.trim() && profile.age != null && profile.age >= 13 && profile.age <= 120;
  if (legacy) return true;
  return Boolean(profile.birthDate?.trim() && profile.locale && profile.gender);
}

export async function fetchProfileStatus(uid: string): Promise<{ status: ProfileStatus; profile?: UserProfileDoc }> {
  if (!db) return { status: "error" };
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return { status: "missing" };
    const profile = parseUserProfileDoc(snap.data() as Record<string, unknown>);
    if (isAccountDeleted(profile)) return { status: "deleted", profile };
    return { status: isProfileComplete(profile) ? "complete" : "incomplete", profile };
  } catch {
    return { status: "error" };
  }
}

/** Mirrors the website's saveUserProfile so web and app write identical users/{uid} docs. */
export async function saveSignupProfile(
  uid: string,
  profile: SignupProfile,
  email: string | null,
  emailVerified: boolean
): Promise<void> {
  if (!db) throw new Error("FIREBASE_NOT_CONFIGURED");
  const ref = doc(db, "users", uid);
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
        ? { defaultDirectorName: profile.defaultDirectorName.trim().slice(0, 120) }
        : {}),
      email: email?.toLowerCase() ?? null,
      emailVerified,
      role: "member",
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );
}
