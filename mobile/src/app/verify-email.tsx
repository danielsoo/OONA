import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "~/components/ui";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { colors, space, type } from "~/theme";

/** Shown while an email/password account is unverified (website: signup verifyPhase "pending"). */
export default function VerifyEmailScreen() {
  const { t } = useLocale();
  const { user, checkVerified, resendVerification, signOut } = useAuth();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("auth.signup.verifyPendingTitle")}</Text>
      <Text style={styles.body}>{t("auth.signup.verifyPendingBody", { email: user?.email ?? "" })}</Text>
      {message ? <Text style={[styles.message, { color: message.ok ? colors.success : colors.destructive }]}>{message.text}</Text> : null}
      <Button
        label={t("auth.signup.verifyCheck")}
        loading={busy}
        onPress={async () => {
          setBusy(true);
          try {
            // The root layout leaves this screen once the gate clears.
            const verified = await checkVerified();
            if (!verified) setMessage({ text: t("auth.signup.errorVerifyPending"), ok: false });
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button
        variant="secondary"
        label={t("auth.signup.verifyResend")}
        onPress={async () => {
          try {
            await resendVerification();
            setMessage({ text: t("auth.signup.verifyResent"), ok: true });
          } catch (err) {
            setMessage({ text: (err as Error).message, ok: false });
          }
        }}
      />
      <Text style={styles.link} onPress={() => void signOut()}>
        {t("common.cancel")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: space(6), justifyContent: "center", gap: space(4) },
  title: { ...type.h1, color: colors.ink, textAlign: "center" },
  body: { ...type.body, color: colors.ink3, textAlign: "center" },
  message: { ...type.small, textAlign: "center" },
  link: { ...type.small, color: colors.ink3, textAlign: "center", paddingVertical: space(3) },
});
