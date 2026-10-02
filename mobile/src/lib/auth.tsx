import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { googleSignInConfig } from "~/lib/config";
import { auth } from "~/lib/firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  /** False when EXPO_PUBLIC_FIREBASE_* is missing: the app shows a setup notice. */
  configured: boolean;
  googleAvailable: boolean;
  appleAvailable: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured: Boolean(auth),
      googleAvailable: googleSignInConfig.enabled,
      appleAvailable,
      async signInWithEmail(email, password) {
        if (!auth) throw new Error("FIREBASE_NOT_CONFIGURED");
        await signInWithEmailAndPassword(auth, email.trim(), password);
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
    [user, loading, appleAvailable]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
