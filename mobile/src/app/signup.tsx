import { router } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LOCALES, type Locale } from "@/i18n";
import { formatSignupErrorMessage } from "@/lib/authErrors";
import { birthDateToIso, parseBirthDateInput, validateSignupBirthDate } from "@/lib/userBirthDate";
import { genderLabelKey, USER_GENDERS } from "@/lib/userGender";
import type { PlatformPurpose, SignupProfile, UserGender } from "@/types/user";
import { Button } from "~/components/ui";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { colors, radius, space, type } from "~/theme";

type StepId = "basic" | "purpose" | "director" | "account";

const PURPOSES: { id: PlatformPurpose; title: string; desc: string }[] = [
  { id: "watch", title: "auth.signup.purposeWatchTitle", desc: "auth.signup.purposeWatchDesc" },
  { id: "collaborate", title: "auth.signup.purposeCollaborateTitle", desc: "auth.signup.purposeCollaborateDesc" },
  { id: "upload", title: "auth.signup.purposeUploadTitle", desc: "auth.signup.purposeUploadDesc" },
  { id: "both", title: "auth.signup.purposeBothTitle", desc: "auth.signup.purposeBothDesc" },
];

/**
 * Sign-up, same steps and rules as the website's /signup:
 * basic info → purpose → director name (uploaders) → email and password.
 * A user who is already signed in (Apple/Google, or a profile left unfinished)
 * skips the account step and only completes the profile.
 */
export default function SignupScreen() {
  const { t, locale, setLocale } = useLocale();
  const { user, signUpWithEmail, completeProfile, signOut } = useAuth();
  const profileOnly = Boolean(user);

  const [stepIndex, setStepIndex] = useState(0);
  const [signupLocale, setSignupLocale] = useState<Locale>(locale);
  const [name, setName] = useState(user?.displayName ?? "");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<UserGender | "">("");
  const [purpose, setPurpose] = useState<PlatformPurpose | "">("");
  const [directorName, setDirectorName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const needsDirector = purpose === "upload" || purpose === "both";
  const steps = useMemo<StepId[]>(() => {
    const list: StepId[] = ["basic", "purpose"];
    if (needsDirector) list.push("director");
    if (!profileOnly) list.push("account");
    return list;
  }, [needsDirector, profileOnly]);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;

  function birthError(result: ReturnType<typeof validateSignupBirthDate>): string {
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
  }

  function validate(current: StepId): string | null {
    switch (current) {
      case "basic": {
        if (!name.trim()) return t("auth.signup.errorNameRequired");
        const result = validateSignupBirthDate(parseBirthDateInput(birthDate));
        if (result !== "ok") return birthError(result);
        if (!gender) return t("auth.signup.errorGenderRequired");
        return null;
      }
      case "purpose":
        return purpose ? null : t("auth.signup.errorPurposeRequired");
      case "director":
        return directorName.trim().length > 120 ? t("auth.signup.errorDirectorNameInvalid") : null;
      case "account":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return t("auth.signup.errorEmailInvalid");
        if (password.length < 6) return t("auth.signup.errorPasswordMin");
        if (password !== confirm) return t("auth.signup.errorPasswordMismatch");
        return null;
    }
  }

  function buildProfile(): SignupProfile {
    const trimmedDirector = directorName.trim();
    return {
      displayName: name.trim(),
      locale: signupLocale,
      birthDate: birthDateToIso(parseBirthDateInput(birthDate)!),
      gender: gender as UserGender,
      platformPurpose: purpose as PlatformPurpose,
      ...(needsDirector && trimmedDirector ? { defaultDirectorName: trimmedDirector.slice(0, 120) } : {}),
    };
  }

  async function next() {
    const problem = validate(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }
    setBusy(true);
    try {
      setLocale(signupLocale);
      if (profileOnly) await completeProfile(buildProfile());
      else await signUpWithEmail(email, password, buildProfile());
      // The root layout sends unverified email accounts to /verify-email.
      router.replace("/");
    } catch (err) {
      setError(formatSignupErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.progress}>{t("auth.signup.stepProgress", { current: stepIndex + 1, total: steps.length })}</Text>

        {step === "basic" ? (
          <View style={styles.section}>
            <Text style={styles.title}>{t("auth.signup.basicTitle")}</Text>
            <Text style={styles.subtitle}>{t("auth.signup.basicSubtitle")}</Text>

            <Text style={styles.label}>{t("auth.signup.languageLabel")}</Text>
            <Choices
              options={LOCALES.map((l) => ({ id: l.code, label: l.label }))}
              value={signupLocale}
              onChange={(code) => setSignupLocale(code as Locale)}
            />

            <Text style={styles.label}>{t("auth.signup.nameLabel")}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("auth.signup.namePlaceholder")}
              placeholderTextColor={colors.ink4}
              style={styles.input}
            />

            <Text style={styles.label}>{t("auth.signup.birthDateLabel")}</Text>
            <TextInput
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.ink4}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              style={styles.input}
            />

            <Text style={styles.label}>{t("auth.signup.genderLabel")}</Text>
            <Choices
              options={USER_GENDERS.map((g) => ({ id: g, label: t(genderLabelKey(g)) }))}
              value={gender}
              onChange={(g) => setGender(g as UserGender)}
            />
          </View>
        ) : null}

        {step === "purpose" ? (
          <View style={styles.section}>
            <Text style={styles.title}>{t("auth.signup.purposeTitle")}</Text>
            <Text style={styles.subtitle}>{t("auth.signup.purposeSubtitle")}</Text>
            {PURPOSES.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setPurpose(p.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: purpose === p.id }}
                style={[styles.card, purpose === p.id && styles.cardActive]}
              >
                <Text style={styles.cardTitle}>{t(p.title)}</Text>
                <Text style={styles.cardDesc}>{t(p.desc)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {step === "director" ? (
          <View style={styles.section}>
            <Text style={styles.title}>{t("auth.signup.directorStepTitle")}</Text>
            <Text style={styles.subtitle}>{t("auth.signup.directorStepSubtitle")}</Text>
            <Text style={styles.label}>{t("auth.signup.directorNameLabel")}</Text>
            <TextInput
              value={directorName}
              onChangeText={setDirectorName}
              placeholder={t("auth.signup.directorNamePlaceholder")}
              placeholderTextColor={colors.ink4}
              maxLength={120}
              style={styles.input}
            />
          </View>
        ) : null}

        {step === "account" ? (
          <View style={styles.section}>
            <Text style={styles.title}>{t("auth.signup.accountTitle")}</Text>
            <Text style={styles.subtitle}>{t("auth.signup.accountSubtitle")}</Text>
            <Text style={styles.label}>{t("auth.signup.emailLabel")}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              style={styles.input}
            />
            <Text style={styles.label}>{t("auth.signup.passwordLabel")}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder={t("auth.signup.passwordPlaceholder")}
              placeholderTextColor={colors.ink4}
              textContentType="newPassword"
              style={styles.input}
            />
            <Text style={styles.label}>{t("auth.signup.confirmPasswordLabel")}</Text>
            <TextInput value={confirm} onChangeText={setConfirm} secureTextEntry textContentType="newPassword" style={styles.input} />
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          {stepIndex > 0 ? (
            <Button variant="secondary" label={t("common.previous")} onPress={() => setStepIndex((i) => i - 1)} style={{ flex: 1 }} />
          ) : null}
          <Button label={isLast ? t("common.save") : t("common.next")} loading={busy} onPress={next} style={{ flex: 2 }} />
        </View>

        {profileOnly ? (
          <Text style={styles.link} onPress={() => void signOut()}>
            {t("common.cancel")}
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Choices({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.choices}>
      {options.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => onChange(o.id)}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === o.id }}
          style={[styles.choice, value === o.id && styles.cardActive]}
        >
          <Text style={[styles.choiceText, value === o.id && { color: colors.ink }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: space(6), gap: space(4), paddingBottom: space(12) },
  progress: { ...type.small, color: colors.ink3 },
  section: { gap: space(2) },
  title: { ...type.h1, color: colors.ink },
  subtitle: { ...type.body, color: colors.ink3, marginBottom: space(2) },
  label: { ...type.small, color: colors.ink2, marginTop: space(3) },
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
  choices: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  choice: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    backgroundColor: colors.surface,
  },
  choiceText: { ...type.small, color: colors.ink2 },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: space(4),
    backgroundColor: colors.surface,
    gap: space(1),
  },
  cardActive: { borderColor: colors.accent, backgroundColor: "rgba(61,125,255,0.12)" },
  cardTitle: { ...type.h3, color: colors.ink },
  cardDesc: { ...type.small, color: colors.ink3 },
  error: { ...type.small, color: colors.destructive },
  actions: { flexDirection: "row", gap: space(3), marginTop: space(2) },
  link: { ...type.small, color: colors.ink3, textAlign: "center", paddingVertical: space(3) },
});
