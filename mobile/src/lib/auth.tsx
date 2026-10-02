import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { isEmailPasswordUser, isOAuthProfileUser } from "@/lib/authProviders";
import type { SignupProfile, UserProfileDoc } from "@/types/user";
import { googleSignInConfig } from "~/lib/config";
import { auth } from "~/lib/firebase";
import { fetchProfileStatus, saveSignupProfile, type ProfileStatus } from "~/lib/profile";

/** Same error code the website throws (src/context/AuthContext.tsx). */
export const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED";

/**
 * What a signed-in user still has to do before using the app:
 * - "verify": email/password account whose email is not verified yet
 * - "profile": no users/{uid} doc or it lacks required fields (same as the website's /signup redirect)
 */
export type AuthGate = "none" | "verify" | "profile" | "deleted" | "loading";

type AuthContextValue = {
  user: User | null;
  /** users/{uid}, once loaded. */
  profile: UserProfileDoc | null;
  loading: boolean;
  gate: AuthGate;
  /** False when EXPO_PUBLIC_FIREBASE_* is missing: the app shows a setup notice. */
  configured: boolean;
  googleAvailable: boolean;
  appleAvailable: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, profile: SignupProfile) => Promise<void>;
  completeProfile: (profile: SignupProfile) => Promise<void>;
  resendVerification: () => Promise<void>;
  /** Reloads the user; true once the email is verified. */
  checkVerified: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshGate: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | "loading">("loading");
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const refreshGate = useCallback(async () => {
    const current = auth?.currentUser;
    if (!current) {
      setProfileStatus("loading");
      setProfile(null);
      return;
    }
    setEmailVerified(current.emailVerified);
    const result = await fetchProfileStatus(current.uid);
    setProfileStatus(result.status);
    setProfile(result.profile ?? null);
  }, []);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
      if (!next) setProfile(null);
      if (next) {
        setProfileStatus("loading");
        void refreshGate();
      }
    });
  }, [refreshGate]);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  useEffect(() => {
    if (!googleSignInConfig.enabled) return;
    void import("@react-native-google-signin/google-signin").then(({ GoogleSignin }) => {
      GoogleSignin.configure({
        webClientId: googleSignInConfig.webClientId,
        iosClientId: googleSignInConfig.iosClientId,
      });
    });
  }, []);

  const gate: AuthGate = useMemo(() => {
    if (!user) return "none";
    if (isEmailPasswordUser(user) && !isOAuthProfileUser(user) && !emailVerified) return "verify";
    if (profileStatus === "loading") return "loading";
    if (profileStatus === "deleted") return "deleted";
    if (profileStatus === "missing" || profileStatus === "incomplete") return "profile";
    return "none"; // "complete", or "error": don't lock the user out over a network blip
  }, [user, emailVerified, profileStatus]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      gate,
      configured: Boolean(auth),
      googleAvailable: googleSignInConfig.enabled,
      appleAvailable,
      refreshGate,
      async signInWithEmail(email, password) {
        if (!auth) throw new Error("FIREBASE_NOT_CONFIGURED");
        const { user: signedIn } = await signInWithEmailAndPassword(auth, email.trim(), password);
        // Same rule as the website: unverified email accounts get a fresh link and stay signed out.
        if (!signedIn.emailVerified) {
          await sendEmailVerification(signedIn).catch(() => {});
          await firebaseSignOut(auth);
          throw new Error(EMAIL_NOT_VERIFIED);
        }
      },
      async signUpWithEmail(email, password, profile) {
        if (!auth) throw new Error("FIREBASE_NOT_CONFIGURED");
        const { user: created } = await createUserWithEmailAndPassword(auth, email.trim(), password);
        try {
          await updateProfile(created, { displayName: profile.displayName });
          await saveSignupProfile(created.uid, profile, created.email, false);
        } catch (err) {
          // Don't leave an account without a profile behind (website: rollbackAuthUser).
          await created.delete().catch(() => {});
          throw err;
        }
        await sendEmailVerification(created).catch(() => {});
        await refreshGate();
      },
      async completeProfile(profile) {
        const current = auth?.currentUser;
        if (!current) throw new Error("SESSION_EXPIRED");
        await updateProfile(current, { displayName: profile.displayName });
        await saveSignupProfile(current.uid, profile, current.email, isOAuthProfileUser(current) || current.emailVerified);
        await refreshGate();
      },
      async resendVerification() {
        if (auth?.currentUser) await sendEmailVerification(auth.currentUser);
      },
      async checkVerified() {
        const current = auth?.currentUser;
        if (!current) return false;
        await current.reload();
        setEmailVerified(current.emailVerified);
        if (current.emailVerified) await refreshGate();
        return current.emailVerified;
      },
      async resetPassword(email) {
        if (!auth) throw new Error("FIREBASE_NOT_CONFIGURED");
        await sendPasswordResetEmail(auth, email.trim());
      },
      async signInWithGoogle() {
        if (!auth) throw new Error("FIREBASE_NOT_CONFIGURED");
        const { GoogleSignin, isSuccessResponse } = await import("@react-native-google-signin/google-signin");
        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();
        if (!isSuccessResponse(response)) return; // cancelled
        const idToken = response.data.idToken;
        if (!idToken) throw new Error("GOOGLE_NO_ID_TOKEN");
        await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
      },
      async signInWithApple() {
        if (!auth) throw new Error("FIREBASE_NOT_CONFIGURED");
        // Firebase checks the SHA-256 of this nonce inside Apple's identity token.
        const rawNonce = Crypto.randomUUID();
        const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
        const result = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
          nonce: hashedNonce,
        });
        if (!result.identityToken) throw new Error("APPLE_NO_ID_TOKEN");
        const credential = new OAuthProvider("apple.com").credential({ idToken: result.identityToken, rawNonce });
        await signInWithCredential(auth, credential);
      },
      async signOut() {
        if (!auth) return;
        if (googleSignInConfig.enabled) {
          const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
          await GoogleSignin.signOut().catch(() => {});
        }
        await firebaseSignOut(auth);
      },
    }),
    [user, profile, loading, gate, appleAvailable, refreshGate]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
