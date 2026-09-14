"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateProfile } from "firebase/auth";
import {
  SIGNUP_VERIFY_EMAIL_FAILED,
  useAuth,
  isAuthAccountConflict,
} from "@/context/AuthContext";
import { formatAuthError, formatSignupErrorMessage } from "@/lib/authErrors";
import { auth, db } from "@/lib/firebase";
import { resolvePostLoginPath } from "@/lib/activeWatchProfile";
import {
  FIRESTORE_PERMISSION_DENIED,
  fetchUserProfileWithRetry,
  isProfileComplete,
  markEmailVerified,
  saveUserProfile,
} from "@/lib/userProfile";
import type { PlatformPurpose, SignupProfile, UserGender } from "@/types/user";
import { USER_GENDERS, genderLabelKey } from "@/lib/userGender";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import KakaoScript from "@/components/auth/KakaoScript";
import { PasswordInput } from "@/components/auth/PasswordInput";
import {
  isOAuthProfileUser,
  resolveSocialProvider,
  type SocialProviderKey,
} from "@/lib/authProviders";
import { formatSocialAuthError } from "@/lib/socialAuthClient";
import { useTranslations } from "@/context/LocaleContext";
import { LOCALES, getStoredLocale, type Locale } from "@/i18n";
import XiioWordmark from "@/components/layout/XiioWordmark";
import {
  birthDateToIso,
  maxBirthDateInputValue,
  parseBirthDateInput,
  validateSignupBirthDate,
} from "@/lib/userBirthDate";

const inputClass =
  "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-xiio-accent transition";

type StepId = "basic" | "purpose" | "director" | "account";

/** Google(또는 이미 로그인된) 가입은 프로필·설문만 — 이메일/비밀번호 단계 없음 */
function buildStepList(skipAccountStep: boolean, needsDirector: boolean): StepId[] {
  const steps: StepId[] = ["basic", "purpose"];
  if (needsDirector) steps.push("director");
  if (!skipAccountStep) steps.push("account");
  return steps;
}

function needsDirectorStep(purpose: PlatformPurpose | ""): boolean {
  return purpose === "upload" || purpose === "both";
}

const PROVIDER_LABEL_KEYS: Record<SocialProviderKey, string> = {
  google: "auth.signup.providerGoogle",
  apple: "auth.signup.providerApple",
  kakao: "auth.signup.providerKakao",
  naver: "auth.signup.providerNaver",
};

type VerifyPhase = "pending" | "verified";

export default function SignupPage() {
  const {
    signupWithEmail,
    resumeEmailSignup,
    loginWithGoogle,
    loginWithApple,
    loginWithKakao,
    loginWithNaver,
    logout,
    resendVerificationEmail,
    reloadUser,
  } = useAuth();
  const { t, setLocale } = useTranslations();
  const router = useRouter();

  const stepLabels: Record<StepId, string> = useMemo(
    () => ({
      basic: t("auth.signup.stepBasic"),
      purpose: t("auth.signup.stepPurpose"),
      director: t("auth.signup.stepDirector"),
      account: t("auth.signup.stepAccount"),
    }),
    [t]
  );

  const [verifyPhase, setVerifyPhase] = useState<VerifyPhase | null>(null);
  const [sentEmail, setSentEmail] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  const [socialPending, setSocialPending] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<SocialProviderKey | null>(null);
  /** Auth에는 있으나 Firestore users 문서가 없을 때 ({t("common.login")}만 한 경우) */
  const [profileOnlyMode, setProfileOnlyMode] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const [name, setName] = useState("");
  const [signupLocale, setSignupLocale] = useState<Locale>("ko");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<UserGender | "">("");
  const [platformPurpose, setPlatformPurpose] = useState<PlatformPurpose | "">("");
  const [directorName, setDirectorName] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileCheckReady, setProfileCheckReady] = useState(() => !auth?.currentUser);
  const [profileConnectionError, setProfileConnectionError] = useState(false);

  const oauthSignup = useMemo(() => {
    if (socialPending) return true;
    if (profileOnlyMode && isOAuthProfileUser(auth?.currentUser ?? null)) return true;
    return isOAuthProfileUser(auth?.currentUser ?? null);
  }, [socialPending, profileOnlyMode, auth?.currentUser]);

  const needsDirector = needsDirectorStep(platformPurpose);
  const steps = useMemo(
    () => buildStepList(oauthSignup, needsDirector),
    [oauthSignup, needsDirector]
  );
  const currentStep = steps[stepIndex] ?? "basic";
  const connectedEmail = auth?.currentUser?.email ?? email;
  const connectedProviderKey = resolveSocialProvider(auth?.currentUser ?? null, pendingProvider);
  const connectedProviderLabel = connectedProviderKey
    ? t(PROVIDER_LABEL_KEYS[connectedProviderKey])
    : t("auth.signup.googleConnected");
  const isLastStep = stepIndex === steps.length - 1;
  const progress = ((stepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    const stored = getStoredLocale();
    setSignupLocale(stored);
    setLocale(stored);
  }, [setLocale]);

  useEffect(() => {
    if (stepIndex >= steps.length) {
      setStepIndex(Math.max(0, steps.length - 1));
    }
  }, [stepIndex, steps.length]);

  useEffect(() => {
    if (verifyPhase !== "pending" || !auth?.currentUser) return;

    const poll = async () => {
      try {
        const verified = await reloadUser();
        if (verified && auth?.currentUser) {
          await markEmailVerified(auth.currentUser.uid);
          await logout();
          setVerifyPhase("verified");
        }
      } catch {
        // reload 실패 시 무시하고 다음 폴링에서 재시도
      }
    };

    const interval = setInterval(() => void poll(), 4000);
    return () => clearInterval(interval);
  }, [verifyPhase, reloadUser, logout]);

  // 가입은 됐는데 화면 전환 전 새로고침·멈춤 시 인증 대기 화면 복구
  useEffect(() => {
    const currentUser = auth?.currentUser;
    if (!currentUser || verifyPhase || socialPending) return;
    if (currentUser.emailVerified) return;
    const isEmailProvider = currentUser.providerData.some((p) => p.providerId === "password");
    if (!isEmailProvider || !currentUser.email) return;

    setSentEmail(currentUser.email);
    setVerifyPhase("pending");
    setLoading(false);
  }, [verifyPhase, socialPending]);

  useEffect(() => {
    if (!oauthSignup) return;
    if (stepIndex >= steps.length) {
      setStepIndex(Math.max(0, steps.length - 1));
    }
  }, [oauthSignup, stepIndex, steps.length]);

  useEffect(() => {
    const currentUser = auth?.currentUser;
    if (!currentUser || verifyPhase) {
      if (!currentUser) {
        setProfileCheckReady(true);
        setProfileConnectionError(false);
      }
      return;
    }

    let cancelled = false;
    setProfileCheckReady(false);
    setProfileConnectionError(false);

    void (async () => {
      const result = await fetchUserProfileWithRetry(currentUser.uid);
      if (cancelled) return;

      if (result.status === "error") {
        setProfileConnectionError(true);
        setProfileCheckReady(true);
        return;
      }

      if (result.status === "found" && isProfileComplete(result.profile)) {
        router.replace(resolvePostLoginPath(currentUser.uid, "/"));
        return;
      }

      if (result.status === "found") {
        const profile = result.profile;
        if (profile.displayName.trim()) setName(profile.displayName.trim());
        if (profile.locale) {
          setSignupLocale(profile.locale);
          setLocale(profile.locale);
        }
        if (profile.birthDate) setBirthDate(profile.birthDate);
        if (profile.gender) setGender(profile.gender);
        if (profile.platformPurpose) setPlatformPurpose(profile.platformPurpose);
        if (profile.defaultDirectorName) setDirectorName(profile.defaultDirectorName);
        if (isOAuthProfileUser(currentUser)) {
          setSocialPending(true);
          setProfileOnlyMode(true);
        }
      } else {
        if (currentUser.displayName) setName(currentUser.displayName);
        if (currentUser.email) setEmail(currentUser.email);
        if (isOAuthProfileUser(currentUser)) {
          setSocialPending(true);
          setProfileOnlyMode(true);
          void currentUser.getIdTokenResult().then((token) => {
            const claim = token.claims.socialProvider;
            if (claim === "kakao" || claim === "naver" || claim === "google" || claim === "apple") {
              setPendingProvider(claim);
            }
          });
        } else {
          setProfileOnlyMode(true);
        }
      }

      setProfileCheckReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [verifyPhase, router, setLocale]);

  const birthDateValidationMessage = (result: ReturnType<typeof validateSignupBirthDate>) => {
    switch (result) {
      case "empty":
        return t("auth.signup.errorBirthDateRequired");
      case "future":
        return t("auth.signup.errorBirthDateFuture");
      case "tooYoung":
        return t("auth.signup.errorBirthDateTooYoung");
      case "tooOld":
        return t("auth.signup.errorBirthDateTooOld");
      default:
        return t("auth.signup.errorBirthDateInvalid");
    }
  };

  const buildProfile = (): SignupProfile | null => {
    if (!name.trim() || !platformPurpose || !signupLocale || !gender) return null;
    const parsedBirth = parseBirthDateInput(birthDate);
    if (validateSignupBirthDate(parsedBirth) !== "ok") return null;
    const trimmedDirector = directorName.trim();
    const includeDirector =
      needsDirectorStep(platformPurpose) && trimmedDirector.length > 0;

    return {
      displayName: name.trim(),
      locale: signupLocale,
      birthDate: birthDateToIso(parsedBirth!),
      gender,
      platformPurpose,
      ...(includeDirector ? { defaultDirectorName: trimmedDirector.slice(0, 120) } : {}),
    };
  };

  const validateStep = (step: StepId): boolean => {
    switch (step) {
      case "basic": {
        if (!signupLocale) {
          setError(t("auth.signup.errorLocaleRequired"));
          return false;
        }
        if (!name.trim()) {
          setError(t("auth.signup.errorNameRequired"));
          return false;
        }
        const parsedBirth = parseBirthDateInput(birthDate);
        const birthResult = validateSignupBirthDate(parsedBirth);
        if (birthResult !== "ok") {
          setError(birthDateValidationMessage(birthResult));
          return false;
        }
        if (!gender) {
          setError(t("auth.signup.errorGenderRequired"));
          return false;
        }
        return true;
      }
      case "purpose":
        if (!platformPurpose) {
          setError(t("auth.signup.errorPurposeRequired"));
          return false;
        }
        return true;
      case "director": {
        const trimmed = directorName.trim();
        if (trimmed.length > 120) {
          setError(t("auth.signup.errorDirectorNameInvalid"));
          return false;
        }
        return true;
      }
      case "account":
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setError(t("auth.signup.errorEmailInvalid"));
          return false;
        }
        if (password.length < 6) {
          setError(t("auth.signup.errorPasswordMin"));
          return false;
        }
        if (password !== confirm) {
          setError(t("auth.signup.errorPasswordMismatch"));
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const finishSignup = async (profile: SignupProfile) => {
    setLoading(true);
    setError("");

    if (!auth || !db) {
      setError(t("auth.signup.errorFirebaseNotConfigured"));
      setLoading(false);
      return;
    }

    try {
      setLocale(profile.locale);
      if (oauthSignup || profileOnlyMode) {
        const currentUser = auth?.currentUser;
        if (!currentUser) {
          setError(t("auth.signup.errorSessionExpired"));
          return;
        }
        await updateProfile(currentUser, { displayName: profile.displayName });
        await saveUserProfile(currentUser.uid, profile, currentUser.email, {
          emailVerified: isOAuthProfileUser(currentUser) || currentUser.emailVerified,
        });
      } else {
        await signupWithEmail(email, password, profile);
        setSentEmail(email);
        setVerifyPhase("pending");
        setLoading(false);
        return;
      }
      router.push("/");
    } catch (err: unknown) {
      const { code, message } = formatAuthError(err);
      console.error("[signup] failed", { code, message, err });

      if (message === SIGNUP_VERIFY_EMAIL_FAILED) {
        setSentEmail(email);
        setVerifyPhase("pending");
        setError(t("auth.signup.errorVerifySendFailedResend"));
        setLoading(false);
        return;
      }

      if (code === "auth/email-already-in-use") {
        try {
          const { needsVerification } = await resumeEmailSignup(email, password, profile);
          if (needsVerification) {
            setSentEmail(email);
            setVerifyPhase("pending");
            setLoading(false);
            return;
          }
          router.push(resolvePostLoginPath(auth!.currentUser!.uid, "/"));
          return;
        } catch (resumeErr) {
          console.error("[signup] resume failed", resumeErr);
          setError(formatSignupErrorMessage(resumeErr, t));
          const accountIdx = steps.indexOf("account");
          if (accountIdx >= 0) setStepIndex(accountIdx);
          setLoading(false);
          return;
        }
      }

      if (message === FIRESTORE_PERMISSION_DENIED || code === "permission-denied") {
        setError(t("auth.signup.errorFirestoreRules"));
      } else {
        setError(formatSignupErrorMessage(err, t));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    setError("");
    if (!validateStep(currentStep)) return;

    if (isLastStep) {
      const profile = buildProfile();
      if (!profile) {
        setError(t("auth.signup.errorReviewInput"));
        return;
      }
      await finishSignup(profile);
      return;
    }

    setStepIndex((i) => i + 1);
  };

  const handleBack = () => {
    setError("");
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const handleSocial = async (
    provider: SocialProviderKey,
    action: () => Promise<import("firebase/auth").User> | void
  ) => {
    setError("");
    setLoading(true);
    try {
      const result = action();
      if (!(result instanceof Promise)) return;

      const signedIn = await result;
      const profileResult = await fetchUserProfileWithRetry(signedIn.uid);
      if (profileResult.status === "found" && isProfileComplete(profileResult.profile)) {
        router.push(resolvePostLoginPath(signedIn.uid, "/"));
        return;
      }
      if (signedIn.displayName) setName(signedIn.displayName);
      if (signedIn.email) setEmail(signedIn.email);
      setSocialPending(true);
      setPendingProvider(provider);
      setProfileOnlyMode(true);

      const builtProfile = buildProfile();
      if (builtProfile) {
        await finishSignup(builtProfile);
        return;
      }

      setStepIndex(0);
    } catch (err) {
      if (isAuthAccountConflict(err)) return;
      const msg = formatSocialAuthError(err, t, provider, "signup");
      setError(msg || formatSignupErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleNext();
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    if (currentStep === "purpose" && !platformPurpose) return;
    e.preventDefault();
    void handleNext();
  };

  const handleCheckVerification = async () => {
    setError("");
    setResendMessage("");
    const verified = await reloadUser();
    if (verified && auth?.currentUser) {
      await markEmailVerified(auth.currentUser.uid);
      await logout();
      setVerifyPhase("verified");
    } else {
      setError(t("auth.signup.errorVerifyPending"));
    }
  };

  const handleResendVerification = async () => {
    setError("");
    setResendMessage("");
    try {
      await resendVerificationEmail();
      setResendMessage(t("auth.signup.verifyResent"));
    } catch (err) {
      setError(formatSignupErrorMessage(err, t));
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-xiio-bg">
      <KakaoScript />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex" aria-label="OONA">
            <XiioWordmark className="!h-[20px]" />
          </Link>
        </div>

        {verifyPhase === "pending" && (
          <div className="bg-xiio-surface rounded-card p-8 border border-line">
            <h1 className="text-xl font-bold text-white text-center mb-2">{t("auth.signup.verifyPendingTitle")}</h1>
            <p className="text-sm text-xiio-muted text-center mb-6">
              {t("auth.signup.verifyPendingBody", { email: sentEmail })}
            </p>
            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm whitespace-pre-wrap break-words">
                {error}
              </div>
            )}
            {resendMessage && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                {resendMessage}
              </div>
            )}
            <button
              type="button"
              onClick={() => void handleCheckVerification()}
              className="w-full py-3 rounded-lg bg-xiio-accent hover:bg-xiio-accent-hover text-white font-semibold transition mb-3"
            >
              {t("auth.signup.verifyCheck")}
            </button>
            <button
              type="button"
              onClick={() => void handleResendVerification()}
              className="w-full py-3 rounded-lg border border-white/20 text-white hover:bg-white/5 transition text-sm"
            >
              {t("auth.signup.verifyResend")}
            </button>
          </div>
        )}

        {verifyPhase === "verified" && (
          <div className="bg-xiio-surface rounded-2xl p-8 border border-white/10 text-center">
            <h1 className="text-xl font-bold text-white mb-2">{t("auth.signup.verifyDoneTitle")}</h1>
            <p className="text-sm text-xiio-muted mb-6">{t("auth.signup.verifyDoneSubtitle")}</p>
            <Link
              href="/login"
              className="inline-block w-full py-3 rounded-lg bg-xiio-accent hover:bg-xiio-accent-hover text-white font-semibold transition"
            >
              {t("auth.signup.verifyDoneCta")}
            </Link>
          </div>
        )}

        {verifyPhase === null && !profileCheckReady && (
          <div className="bg-xiio-surface rounded-2xl p-8 border border-white/10 min-h-[420px] flex items-center justify-center">
            <p className="text-xiio-muted">{t("common.loading")}</p>
          </div>
        )}

        {verifyPhase === null && profileCheckReady && profileConnectionError && (
          <div className="bg-xiio-surface rounded-2xl p-8 border border-white/10 min-h-[420px] flex flex-col items-center justify-center gap-4 text-center">
            <p className="text-xiio-muted text-sm">{t("auth.signup.profileConnectionError")}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm px-4 py-2 rounded-lg bg-xiio-accent hover:bg-xiio-accent-hover text-white transition"
            >
              {t("common.retry")}
            </button>
          </div>
        )}

        {verifyPhase === null && profileCheckReady && !profileConnectionError && (
        <div className="bg-xiio-surface rounded-2xl p-8 border border-white/10 min-h-[420px] flex flex-col">
          {!oauthSignup ? (
            <div className="mb-6">
              <SocialAuthButtons
                layout="signup"
                disabled={loading}
                onGoogle={() => void handleSocial("google", () => loginWithGoogle())}
                onApple={() => void handleSocial("apple", () => loginWithApple())}
                onKakao={() => void handleSocial("kakao", () => loginWithKakao())}
                onNaver={() => void handleSocial("naver", () => loginWithNaver())}
              />
              <p className="text-xs text-xiio-muted text-center mt-2">
                {t("auth.signup.googleSignupHint")}
              </p>
              <div className="flex items-center gap-3 mt-5">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-xiio-muted">{t("auth.signup.emailSignupDivider")}</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-lg border border-xiio-accent/30 bg-xiio-accent/10 px-4 py-3">
              <p className="text-sm text-white font-medium">
                {t("auth.signup.socialConnectedProvider", { provider: connectedProviderLabel })}
              </p>
              {connectedEmail ? (
                <p className="text-xs text-xiio-muted mt-1">{connectedEmail}</p>
              ) : null}
              <p className="text-xs text-xiio-muted mt-2">
                {t("auth.signup.googleConnectedHint")}
              </p>
            </div>
          )}

          <div className="mb-6">
            <div className="flex justify-between text-xs text-xiio-muted mb-2">
              <span>{stepLabels[currentStep]}</span>
              <span>{t("auth.signup.stepProgress", { current: stepIndex + 1, total: steps.length })}</span>
            </div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-xiio-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm whitespace-pre-wrap break-words">
              {error}
            </div>
          )}

          <form
            onSubmit={handleFormSubmit}
            onKeyDown={handleFormKeyDown}
            className="flex-1 flex flex-col justify-center"
          >
            {currentStep === "basic" && (
              <StepShell title={t("auth.signup.basicTitle")} subtitle={t("auth.signup.basicSubtitle")}>
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="block text-sm text-xiio-muted mb-1.5">{t("auth.signup.languageLabel")}</p>
                    <p className="text-xs text-xiio-muted mb-2">{t("auth.signup.languageHint")}</p>
                    <div className="flex gap-2">
                      {LOCALES.map(({ code, label }) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            setSignupLocale(code);
                            setLocale(code);
                          }}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition border ${
                            signupLocale === code
                              ? "bg-xiio-accent border-xiio-accent text-white"
                              : "border-white/20 text-xiio-muted hover:text-white hover:border-white/40"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Field label={t("auth.signup.nameLabel")}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                      placeholder={t("auth.signup.namePlaceholder")}
                      className={inputClass}
                    />
                  </Field>
                  <Field label={t("auth.signup.birthDateLabel")}>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      max={maxBirthDateInputValue()}
                      required
                      className={inputClass}
                    />
                  </Field>
                  <div>
                    <p className="text-sm text-white/80 mb-2">{t("auth.signup.genderLabel")}</p>
                    <div
                      className="flex flex-col sm:flex-row gap-2"
                      role="radiogroup"
                      aria-label={t("auth.signup.genderLabel")}
                    >
                      {USER_GENDERS.map((value) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={gender === value}
                          onClick={() => setGender(value)}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition border ${
                            gender === value
                              ? "bg-xiio-accent border-xiio-accent text-white"
                              : "border-white/20 text-xiio-muted hover:text-white hover:border-white/40"
                          }`}
                        >
                          {t(genderLabelKey(value))}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </StepShell>
            )}

            {currentStep === "purpose" && (
              <StepShell title={t("auth.signup.purposeTitle")} subtitle={t("auth.signup.purposeSubtitle")}>
                <div className="flex flex-col gap-3">
                  <PurposeOption
                    selected={platformPurpose === "watch"}
                    onClick={() => setPlatformPurpose("watch")}
                    title={t("auth.signup.purposeWatchTitle")}
                    description={t("auth.signup.purposeWatchDesc")}
                  />
                  <PurposeOption
                    selected={platformPurpose === "collaborate"}
                    onClick={() => setPlatformPurpose("collaborate")}
                    title={t("auth.signup.purposeCollaborateTitle")}
                    description={t("auth.signup.purposeCollaborateDesc")}
                  />
                  <PurposeOption
                    selected={platformPurpose === "upload"}
                    onClick={() => setPlatformPurpose("upload")}
                    title={t("auth.signup.purposeUploadTitle")}
                    description={t("auth.signup.purposeUploadDesc")}
                  />
                  <PurposeOption
                    selected={platformPurpose === "both"}
                    onClick={() => setPlatformPurpose("both")}
                    title={t("auth.signup.purposeBothTitle")}
                    description={t("auth.signup.purposeBothDesc")}
                  />
                </div>
              </StepShell>
            )}

            {currentStep === "director" && (
              <StepShell
                title={t("auth.signup.directorStepTitle")}
                subtitle={t("auth.signup.directorStepSubtitle")}
              >
                <Field label={t("auth.signup.directorNameLabel")}>
                  <input
                    type="text"
                    value={directorName}
                    onChange={(e) => setDirectorName(e.target.value)}
                    placeholder={t("auth.signup.directorNamePlaceholder")}
                    className={inputClass}
                    maxLength={120}
                    autoFocus
                  />
                </Field>
              </StepShell>
            )}

            {currentStep === "account" && !oauthSignup && (
              <StepShell title={t("auth.signup.accountTitle")} subtitle={t("auth.signup.accountSubtitle")}>
                <div className="flex flex-col gap-4">
                  <Field label={t("auth.signup.emailLabel")}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                      placeholder="example@email.com"
                      className={inputClass}
                    />
                  </Field>
                  <Field label={t("auth.signup.passwordLabel")}>
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("auth.signup.passwordPlaceholder")}
                      className={`${inputClass} pr-11`}
                    />
                  </Field>
                  <Field label={t("auth.signup.confirmPasswordLabel")}>
                    <PasswordInput
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputClass} pr-11`}
                    />
                  </Field>
                </div>

              </StepShell>
            )}

            <div className="flex gap-3 mt-auto pt-6">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="flex-1 py-3 rounded-lg border border-white/20 text-white hover:bg-white/5 disabled:opacity-50 transition"
              >
                {t("common.previous")}
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`py-3 rounded-lg bg-xiio-accent hover:bg-xiio-accent-hover disabled:opacity-50 text-white font-semibold transition ${
                stepIndex === 0 ? "w-full" : "flex-1"
              }`}
            >
              {loading ? t("common.processing") : isLastStep ? t("auth.signup.submitSignup") : t("common.next")}
            </button>
          </div>
          </form>

        </div>
        )}

        {verifyPhase === null && profileCheckReady && !profileConnectionError && (
          <p className="mt-6 text-center text-sm text-xiio-muted">
            {t("auth.signup.hasAccount")}{" "}
            <Link href="/login" className="text-xiio-accent hover:underline">
              {t("common.login")}
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
      <p className="text-sm text-xiio-muted mb-6">{subtitle}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-xiio-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function PurposeOption({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg border transition ${
        selected
          ? "border-xiio-accent bg-xiio-accent/15"
          : "border-white/10 hover:border-white/25"
      }`}
    >
      <span className="block text-sm font-medium text-white">{title}</span>
      <span className="block text-xs text-xiio-muted mt-0.5">{description}</span>
    </button>
  );
}
