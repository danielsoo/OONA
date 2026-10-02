import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { formatLoginErrorMessage } from "@/lib/authErrors";
import { Button, Message } from "~/components/ui";
import { EMAIL_NOT_VERIFIED, useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { colors, radius, space, type } from "~/theme";

/** Maps server codes from the Kakao/Naver flow to the website's login messages. */
function useSocialErrorMessage() {
  const { t } = useLocale();
  return (message: string, kind: string): string | null => {
    if (!message.startsWith("SOCIAL_")) return null;
    const code = message.slice("SOCIAL_".length);
    if (code === "account_exists") return t("auth.login.errorAccountExistsDifferent");
    if (code === "admin_not_configured") return t("auth.login.errorAdminNotConfigured");
    if (code === "naver_denied" || code === "kakao_denied") return t(kind === "naver" ? "auth.login.errorNaverDenied" : "auth.login.errorKakaoFailed");
    if (code.endsWith("not_configured")) return t(kind === "naver" ? "auth.login.errorNaverNotConfigured" : "auth.login.errorKakaoNotConfigured");
    return t(kind === "naver" ? "auth.login.errorNaverFailed" : "auth.login.errorKakaoFailed");
  };
}

export default function LoginScreen() {
  const { t, ui } = useLocale();
  const {
    configured,
    googleAvailable,
    appleAvailable,
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    signInWithSocialWeb,
    resetPassword,
  } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);
  const socialErrorMessage = useSocialErrorMessage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | "apple" | "kakao" | "naver" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!configured) {
    return <Message title={t("auth.login.errorAdminNotConfigured")} body="EXPO_PUBLIC_FIREBASE_* (.env.local)" />;
  }

  async function run(kind: "email" | "google" | "apple" | "kakao" | "naver", action: () => Promise<void>, fallbackKey?: string) {
    setBusy(kind);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (err) {
      const code = (err as { code?: string }).code;
      const social = socialErrorMessage((err as Error).message, kind);
      if (social) {
        setError(social);
        return;
      }
      if ((err as Error).message === EMAIL_NOT_VERIFIED) {
        setError(t("auth.login.errorEmailNotVerified"));
        return;
      }
      // The user closed the Apple / Google sheet: not an error.
      if (code === "ERR_REQUEST_CANCELED" || code === "SIGN_IN_CANCELLED") return;
      setError(fallbackKey && !code?.startsWith("auth/") ? t(fallbackKey) : formatLoginErrorMessage(err, t));
    } finally {
      setBusy(null);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t("auth.login.title")}</Text>

        {appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={radius.control}
            style={{ height: 48 }}
            onPress={() => run("apple", signInWithApple, "auth.login.errorAppleFailed")}
          />
        ) : null}
        {googleAvailable ? (
          <Button
            variant="secondary"
            label={t("auth.login.google")}
            loading={busy === "google"}
            onPress={() => run("google", signInWithGoogle, "auth.login.errorGoogleFailed")}
          />
        ) : null}

        <Button
          variant="secondary"
          label={t("auth.login.kakao")}
          loading={busy === "kakao"}
          onPress={() => run("kakao", () => signInWithSocialWeb("kakao"))}
        />
        <Button
          variant="secondary"
          label={t("auth.login.naver")}
          loading={busy === "naver"}
          onPress={() => run("naver", () => signInWithSocialWeb("naver"))}
        />

        <View style={styles.divider}>
          <View style={styles.rule} />
          <Text style={styles.or}>{t("common.or")}</Text>
          <View style={styles.rule} />
        </View>

        <Text style={styles.label}>{t("auth.login.emailLabel")}</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          style={styles.input}
          placeholderTextColor={colors.ink4}
        />
        <Text style={styles.label}>{t("auth.login.passwordLabel")}</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          style={styles.input}
          onSubmitEditing={() => run("email", () => signInWithEmail(email, password))}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <Button
          label={busy === "email" ? t("auth.login.submitting") : t("auth.login.submit")}
          loading={busy === "email"}
          disabled={!email || !password}
          onPress={() => run("email", () => signInWithEmail(email, password))}
          style={{ marginTop: space(2) }}
        />

        <Text
          style={styles.link}
          accessibilityRole="link"
          onPress={async () => {
            if (!email) {
              setError(t("auth.signup.errorEmailInvalid"));
              return;
            }
            try {
              await resetPassword(email);
              setError(null);
              setNotice(ui("Password reset email sent."));
            } catch (err) {
              setError(formatLoginErrorMessage(err, t));
            }
          }}
        >
          {ui("Forgot password?")}
        </Text>

        <View style={styles.signupRow}>
          <Text style={styles.or}>{ui("New to OONA?")}</Text>
          <Text style={styles.link} accessibilityRole="link" onPress={() => router.replace("/signup")}>
            {ui("Create an account")}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space(6), gap: space(3) },
  title: { ...type.h1, color: colors.ink, marginBottom: space(4) },
  divider: { flexDirection: "row", alignItems: "center", gap: space(3), marginVertical: space(2) },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  or: { ...type.small, color: colors.ink3 },
  label: { ...type.small, color: colors.ink2, marginTop: space(2) },
  input: {
    ...type.body,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    paddingHorizontal: space(4),
    minHeight: 48,
  },
  error: { ...type.small, color: colors.destructive },
  notice: { ...type.small, color: colors.success },
  link: { ...type.small, color: colors.accentHover, paddingVertical: space(2) },
  signupRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space(2), marginTop: space(4) },
});
