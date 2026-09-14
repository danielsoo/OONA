"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { sendPasswordResetEmail, type User } from "firebase/auth";
import { EMAIL_NOT_VERIFIED, useAuth, isAuthAccountConflict } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import KakaoScript from "@/components/auth/KakaoScript";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { KakaoIcon } from "@/components/auth/KakaoIcon";
import { PasswordInput } from "@/components/auth/PasswordInput";
import XiioWordmark from "@/components/layout/XiioWordmark";
import { auth } from "@/lib/firebase";
import { routeAfterAuth } from "@/lib/postAuthRoute";
import { loadRememberLogin, saveRememberLogin } from "@/lib/authPersistence";
import { formatLoginErrorMessage } from "@/lib/authErrors";
import type { SocialProviderKey } from "@/lib/authProviders";
import { formatSocialAuthError } from "@/lib/socialAuthClient";
import styles from "./login.module.css";

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" aria-hidden>
      <path d="M20 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" aria-hidden>
      <path d="M4 12h15M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden>
      <rect x="3" y="5.25" width="18" height="13.5" rx="1.8" />
      <path d="m4.5 7 7.5 5.6L19.5 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LoginForm() {
  const { loginWithEmail, loginWithGoogle, loginWithKakao } = useAuth();
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { remember, email: savedEmail } = loadRememberLogin();
    setRememberMe(remember);
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const finishAuth = async (signedIn: User) => {
    const stored =
      typeof window !== "undefined" ? sessionStorage.getItem("xiio-auth-return") : null;
    const target = returnTo ?? stored;
    if (target && target.startsWith("/") && !target.startsWith("//")) {
      sessionStorage.removeItem("xiio-auth-return");
      router.push(target);
      return;
    }
    await routeAfterAuth(signedIn.uid, router);
  };

  const completeSocialLogin = async (signedIn: User) => {
    saveRememberLogin(rememberMe, email);
    await finishAuth(signedIn);
  };

  const runSocial = async (
    provider: SocialProviderKey,
    action: () => Promise<User> | void
  ) => {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      saveRememberLogin(rememberMe, email);
      const result = action();
      if (result instanceof Promise) {
        const signedIn = await result;
        await completeSocialLogin(signedIn);
      }
    } catch (e) {
      if (isAuthAccountConflict(e)) return;
      const msg = formatSocialAuthError(e, t, provider, "login");
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      saveRememberLogin(rememberMe, email);
      await loginWithEmail(email, password, rememberMe);
      const current = auth?.currentUser;
      if (!current) throw new Error("no user");
      await finishAuth(current);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === EMAIL_NOT_VERIFIED) {
        setError(t("auth.login.errorEmailNotVerified"));
      } else {
        setError(formatLoginErrorMessage(err, t));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setNotice("");

    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    if (!auth) {
      setError("Password reset is not available right now.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice("Check your email for a password reset link.");
    } catch (err: unknown) {
      setError(formatLoginErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <KakaoScript />

      <div className={styles.artwork} aria-hidden="true" />
      <div className={styles.artworkShade} aria-hidden="true" />

      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label="OONA home">
          <XiioWordmark />
        </Link>
        <Link href="/" className={styles.backLink}>
          <span>Back to home</span>
          <ArrowLeftIcon />
        </Link>
      </header>

      <section className={styles.formPane} aria-labelledby="login-title">
        <div className={styles.formContent}>
          <div className={styles.intro}>
            <h1 id="login-title">Welcome back.</h1>
            <p>Continue your story.</p>
          </div>

          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className={styles.noticeMessage} role="status">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field} htmlFor="login-email">
              <span>{t("auth.login.emailLabel")}</span>
              <div className={styles.inputWrap}>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  aria-label={t("auth.login.emailLabel")}
                />
                <span className={styles.fieldIcon}>
                  <MailIcon />
                </span>
              </div>
            </label>

            <label className={styles.field} htmlFor="login-password">
              <span>{t("auth.login.passwordLabel")}</span>
              <PasswordInput
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={styles.passwordInput}
              />
            </label>

            <div className={styles.optionsRow}>
              <label className={styles.rememberLabel}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>{t("auth.login.rememberMe")}</span>
              </label>
              <button
                type="button"
                onClick={() => void handleForgotPassword()}
                disabled={loading}
                className={styles.forgotButton}
              >
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={loading} className={styles.submitButton}>
              <span>{loading ? t("auth.login.submitting") : t("auth.login.submit")}</span>
              <ArrowRightIcon />
            </button>
          </form>

          <div className={styles.divider} aria-hidden="true">
            <span />
            <p>Or continue with</p>
            <span />
          </div>

          <div className={styles.socialRow}>
            <button
              type="button"
              disabled={loading}
              onClick={() => void runSocial("google", () => loginWithGoogle(rememberMe))}
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void runSocial("kakao", () => loginWithKakao(rememberMe))}
            >
              <span className={styles.kakaoIcon}>
                <KakaoIcon />
              </span>
              <span>Continue with Kakao</span>
            </button>
          </div>

          <p className={styles.signupPrompt}>
            <span>New to OONA?</span>
            <Link href="/signup">
              Create an account
              <ArrowRightIcon />
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className={styles.loadingScreen}>Loading…</main>}>
      <LoginForm />
    </Suspense>
  );
}
