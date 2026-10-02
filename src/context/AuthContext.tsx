"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  signInWithCustomToken,
  linkWithCredential,
  updateProfile,
  sendEmailVerification,
  deleteUser,
} from "firebase/auth";
import AccountConflictDialog from "@/components/auth/AccountConflictDialog";
import { auth, appleProvider, googleProvider } from "@/lib/firebase";
import { applyAuthPersistence } from "@/lib/authPersistence";
import {
  AUTH_ACCOUNT_CONFLICT,
  type AccountConflictState,
  enrichConflictWithSignInMethods,
  parseOAuthConflictError,
  primaryExistingSocialProvider,
} from "@/lib/authConflict";
import { hasUserProfile, saveUserProfile } from "@/lib/userProfile";
import { routeAfterAuth } from "@/lib/postAuthRoute";
import type { SocialProviderKey } from "@/lib/authProviders";
import type { SignupProfile } from "@/types/user";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string, remember?: boolean) => Promise<void>;
  signupWithEmail: (email: string, password: string, profile: SignupProfile) => Promise<void>;
  resumeEmailSignup: (
    email: string,
    password: string,
    profile: SignupProfile
  ) => Promise<{ needsVerification: boolean }>;
  loginWithGoogle: (remember?: boolean) => Promise<User>;
  loginWithApple: (remember?: boolean) => Promise<User>;
  loginWithKakao: (remember?: boolean) => Promise<User>;
  loginWithNaver: (remember?: boolean) => void;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<boolean>;
}

export const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED";
export const SIGNUP_VERIFY_EMAIL_FAILED = "SIGNUP_VERIFY_EMAIL_FAILED";

const AuthContext = createContext<AuthContextType | null>(null);

function rememberSocialProvider(provider: SocialProviderKey) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("lastSocialProvider", provider);
  }
}

async function rollbackAuthUser(user: User | null) {
  if (!user) return;
  try {
    await deleteUser(user);
  } catch {
    // ignore
  }
}

function ensureKakaoReady(): void {
  const key = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim();
  if (!key) throw new Error("KAKAO_NOT_CONFIGURED");
  if (!window.Kakao?.isInitialized()) {
    window.Kakao?.init(key);
  }
  if (!window.Kakao?.isInitialized()) {
    throw new Error("KAKAO_NOT_READY");
  }
}

type KakaoAuthResult =
  | { ok: true }
  | {
      ok: false;
      conflict: AccountConflictState;
    };

async function authenticateKakaoAccessToken(
  accessToken: string,
  remember: boolean
): Promise<KakaoAuthResult> {
  if (!auth) throw new Error("Firebase가 설정되지 않았습니다.");

  const res = await fetch("/api/auth/kakao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });

  if (res.status === 409) {
    const body = (await res.json()) as {
      email?: string;
      existingProviderIds?: string[];
    };
    if (body.email) {
      return {
        ok: false,
        conflict: {
          email: body.email,
          existingProviderIds: body.existingProviderIds ?? [],
          attemptedProvider: "kakao",
          pendingCredential: null,
          pendingKakaoAccessToken: accessToken,
          remember,
        },
      };
    }
  }

  if (!res.ok) {
    if (res.status === 503) throw new Error("ADMIN_NOT_CONFIGURED");
    throw new Error("KAKAO_AUTH_FAILED");
  }

  const { customToken } = (await res.json()) as { customToken: string };
  await signInWithCustomToken(auth, customToken);
  return { ok: true };
}

async function loginWithExistingProvider(conflict: AccountConflictState): Promise<User> {
  if (!auth) throw new Error("Firebase가 설정되지 않았습니다.");

  const existing = primaryExistingSocialProvider(conflict.existingProviderIds);
  if (!existing || existing === "email" || existing === "kakao" || existing === "naver") {
    throw new Error("UNSUPPORTED_EXISTING_PROVIDER");
  }

  await applyAuthPersistence(conflict.remember);

  if (existing === "google") {
    const { user: signedIn } = await signInWithPopup(auth, googleProvider);
    rememberSocialProvider("google");
    return signedIn;
  }

  const { user: signedIn } = await signInWithPopup(auth, appleProvider);
  rememberSocialProvider("apple");
  return signedIn;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountConflict, setAccountConflict] = useState<AccountConflictState | null>(null);
  const [conflictBusy, setConflictBusy] = useState(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const raiseConflict = useCallback(async (conflict: AccountConflictState) => {
    const enriched = await enrichConflictWithSignInMethods(conflict);
    setAccountConflict(enriched);
    throw new Error(AUTH_ACCOUNT_CONFLICT);
  }, []);

  const clearAccountConflict = useCallback(() => {
    setAccountConflict(null);
  }, []);

  const loginWithProviderPopup = useCallback(
    async (provider: SocialProviderKey, remember: boolean) => {
      if (!auth) throw new Error("Firebase가 설정되지 않았습니다.");
      await applyAuthPersistence(remember);
      rememberSocialProvider(provider);

      const authProvider = provider === "apple" ? appleProvider : googleProvider;
      try {
        const { user: signedIn } = await signInWithPopup(auth, authProvider);
        return signedIn;
      } catch (err) {
        const conflict = parseOAuthConflictError(err, provider, remember);
        if (conflict) {
          await raiseConflict(conflict);
        }
        throw err;
      }
    },
    [raiseConflict]
  );

  const handleConflictLoginExisting = useCallback(async () => {
    if (!accountConflict) return;
    const snapshot = accountConflict;
    setConflictBusy(true);
    try {
      const signedIn = await loginWithExistingProvider(snapshot);
      clearAccountConflict();
      await routeAfterAuth(signedIn.uid, router);
    } finally {
      setConflictBusy(false);
    }
  }, [accountConflict, clearAccountConflict, router]);

  const handleConflictLink = useCallback(async () => {
    if (!accountConflict || !auth) return;
    const snapshot = accountConflict;
    setConflictBusy(true);
    try {
      const signedIn = await loginWithExistingProvider(snapshot);

      if (snapshot.pendingCredential) {
        await linkWithCredential(signedIn, snapshot.pendingCredential);
      } else if (snapshot.pendingKakaoAccessToken) {
        const idToken = await signedIn.getIdToken();
        const res = await fetch("/api/auth/kakao/link", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ accessToken: snapshot.pendingKakaoAccessToken }),
        });
        if (!res.ok) throw new Error("KAKAO_LINK_FAILED");
      } else {
        throw new Error("NOTHING_TO_LINK");
      }

      rememberSocialProvider(snapshot.attemptedProvider);
      await signedIn.reload();
      const current = auth.currentUser;
      if (!current) throw new Error("로그인에 실패했습니다.");
      clearAccountConflict();
      await routeAfterAuth(current.uid, router);
    } finally {
      setConflictBusy(false);
    }
  }, [accountConflict, clearAccountConflict, router]);

  const loginWithEmail = async (email: string, password: string, remember = true) => {
    if (!auth) throw new Error("Firebase가 설정되지 않았습니다.");
    await applyAuthPersistence(remember);
    await signInWithEmailAndPassword(auth, email, password);
    const currentUser = auth.currentUser;
    if (currentUser && !currentUser.emailVerified) {
      await sendEmailVerification(currentUser);
      await signOut(auth);
      throw new Error(EMAIL_NOT_VERIFIED);
    }
  };

  const resumeEmailSignup = async (
    email: string,
    password: string,
    profile: SignupProfile
  ): Promise<{ needsVerification: boolean }> => {
    if (!auth) throw new Error("Firebase가 설정되지 않았습니다.");
    await signInWithEmailAndPassword(auth, email, password);
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("로그인에 실패했습니다.");

    await updateProfile(currentUser, { displayName: profile.displayName });
    const exists = await hasUserProfile(currentUser.uid);
    if (!exists) {
      await saveUserProfile(currentUser.uid, profile, currentUser.email, {
        emailVerified: currentUser.emailVerified,
      });
    }

    if (!currentUser.emailVerified) {
      try {
        await sendEmailVerification(currentUser);
      } catch {
        throw new Error(SIGNUP_VERIFY_EMAIL_FAILED);
      }
      return { needsVerification: true };
    }

    return { needsVerification: false };
  };

  const signupWithEmail = async (email: string, password: string, profile: SignupProfile) => {
    if (!auth) throw new Error("Firebase가 설정되지 않았습니다.");

    let newUser: User | null = null;
    let profileSaved = false;

    try {
      const { user: created } = await createUserWithEmailAndPassword(auth, email, password);
      newUser = created;
      await updateProfile(newUser, { displayName: profile.displayName });
      await saveUserProfile(newUser.uid, profile, newUser.email);
      profileSaved = true;

      try {
        await sendEmailVerification(newUser);
      } catch {
        throw new Error(SIGNUP_VERIFY_EMAIL_FAILED);
      }
    } catch (err) {
      if (newUser && !profileSaved) {
        await rollbackAuthUser(newUser);
      }
      throw err;
    }
  };

  const resendVerificationEmail = async () => {
    if (!auth?.currentUser) throw new Error("로그인 세션이 없습니다.");
    await sendEmailVerification(auth.currentUser);
  };

  const reloadUser = async (): Promise<boolean> => {
    if (!auth?.currentUser) return false;
    await auth.currentUser.reload();
    return auth.currentUser.emailVerified;
  };

  const loginWithGoogle = (remember = true) => loginWithProviderPopup("google", remember);
  const loginWithApple = (remember = true) => loginWithProviderPopup("apple", remember);

  const loginWithKakao = async (remember = true) => {
    if (!auth) throw new Error("Firebase가 설정되지 않았습니다.");
    await applyAuthPersistence(remember);
    ensureKakaoReady();

    return new Promise<User>((resolve, reject) => {
      window.Kakao!.Auth.login({
        success: ({ access_token }) => {
          void (async () => {
            try {
              if (!auth) throw new Error("Firebase가 설정되지 않았습니다.");
              const result = await authenticateKakaoAccessToken(access_token, remember);
              if (!result.ok) {
                await raiseConflict(result.conflict);
                return;
              }
              rememberSocialProvider("kakao");
              const current = auth.currentUser;
              if (!current) throw new Error("로그인에 실패했습니다.");
              resolve(current);
            } catch (e) {
              reject(e);
            }
          })();
        },
        fail: (err) => reject(err),
      });
    });
  };

  const loginWithNaver = (remember = true) => {
    if (typeof window === "undefined") return;
    void applyAuthPersistence(remember);
    rememberSocialProvider("naver");
    window.location.href = "/api/auth/naver/start";
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithEmail,
        signupWithEmail,
        resumeEmailSignup,
        loginWithGoogle,
        loginWithApple,
        loginWithKakao,
        loginWithNaver,
        logout,
        resendVerificationEmail,
        reloadUser,
      }}
    >
      {children}
      {accountConflict ? (
        <AccountConflictDialog
          conflict={accountConflict}
          busy={conflictBusy}
          onLoginExisting={() => void handleConflictLoginExisting()}
          onLinkAccounts={() => void handleConflictLink()}
          onCancel={clearAccountConflict}
        />
      ) : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { AUTH_ACCOUNT_CONFLICT, isAuthAccountConflict } from "@/lib/authConflict";
