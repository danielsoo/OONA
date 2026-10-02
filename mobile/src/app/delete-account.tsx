import { router, Stack } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { isEmailPasswordUser } from "@/lib/authProviders";
import { Button } from "~/components/ui";
import { apiFetch, ApiError } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { unregisterPush } from "~/lib/push";
import { colors, radius, space, type } from "~/theme";

// Same disclosure lists as the website's AccountDeleteDialog.
const SECTIONS: { title: string; tone: "removed" | "retained" | "default"; items: string[] }[] = [
  { title: "sectionAccount", tone: "default", items: ["itemAuthDeleted", "itemAuthLinksRemoved", "itemNoServiceAccess"] },
  {
    title: "sectionRemoved",
    tone: "removed",
    items: [
      "itemProfileRemoved",
      "itemPeopleHidden",
      "itemPiiRemoved",
      "itemWatchProfilesRemoved",
      "itemUnpublishedWorksDeleted",
      "itemPortfolioSharesRemoved",
      "itemActivityRemoved",
      "itemFollowsRemoved",
      "itemBlocksRemoved",
      "itemDmRemoved",
      "itemAvatarStorageRemoved",
      "itemBillingRemoved",
      "itemPendingRequestsCancelled",
    ],
  },
  {
    title: "sectionRetained",
    tone: "retained",
    items: [
      "itemPublishedWorksRemain",
      "itemWatchUrlsRemain",
      "itemDirectorCreditNamesRemain",
      "itemCreditsOnOthersWorksRemain",
      "itemPaymentEventsRetained",
      "itemReportsAuditRetained",
      "itemModerationRetained",
    ],
  },
  { title: "sectionRecovery", tone: "default", items: ["itemNoRecovery", "itemReregisterRequired", "itemHandleMayBeReused"] },
  { title: "sectionNotes", tone: "default", items: ["itemAdminCannotDelete", "itemPartialFailure", "itemLogoutAfterDelete"] },
];

/** In-app account deletion (App Store / Play requirement), same rules and API as the website. */
export default function DeleteAccountScreen() {
  const { user, signOut } = useAuth();
  const { t } = useLocale();
  const [agreed, setAgreed] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;
  const needsPassword = isEmailPasswordUser(user);
  const expected = t("settings.deleteAccount.confirmPhraseExpected");
  const canSubmit = agreed && phrase.trim() === expected && (!needsPassword || password.length > 0) && !busy;

  async function submit() {
    if (!user || !canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      if (needsPassword && user.email) {
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      }
      await unregisterPush();
      await apiFetch("/api/me/account/delete", { method: "POST", auth: "required", json: { confirmPhrase: phrase.trim() } });
      await signOut().catch(() => {});
      router.replace("/");
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (err instanceof ApiError && err.code === "admin_cannot_delete") setError(t("settings.deleteAccount.errorAdmin"));
      else if (code === "auth/requires-recent-login") setError(t("settings.deleteAccount.errorRecentLogin"));
      else if (code === "auth/wrong-password" || code === "auth/invalid-credential") setError(t("settings.deleteAccount.errorWrongPassword"));
      else setError((err as Error).message || t("settings.deleteAccount.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(12) }}>
      <Stack.Screen options={{ title: t("settings.deleteAccount.dialogTitle") }} />
      <Text style={styles.lead}>{t("settings.deleteAccount.dialogLead")}</Text>

      {SECTIONS.map((section) => (
        <View key={section.title} style={{ gap: space(1) }}>
          <Text
            style={[
              styles.sectionTitle,
              section.tone === "removed" && { color: colors.destructive },
              section.tone === "retained" && { color: colors.gold },
            ]}
          >
            {t(`settings.deleteAccount.${section.title}`)}
          </Text>
          {section.items.map((item) => (
            <Text key={item} style={styles.item}>
              · {t(`settings.deleteAccount.${item}`)}
            </Text>
          ))}
        </View>
      ))}

      <Pressable onPress={() => setAgreed((v) => !v)} style={styles.checkRow} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}>
        <View style={[styles.checkbox, agreed && styles.checkboxOn]} />
        <Text style={[styles.item, { flex: 1 }]}>{t("settings.deleteAccount.confirmCheckbox")}</Text>
      </Pressable>

      <Text style={styles.label}>{t("settings.deleteAccount.confirmPhraseLabel")}</Text>
      <TextInput
        value={phrase}
        onChangeText={setPhrase}
        placeholder={t("settings.deleteAccount.confirmPhrasePlaceholder")}
        placeholderTextColor={colors.ink4}
        autoCapitalize="characters"
        style={styles.input}
      />
      {needsPassword ? (
        <>
          <Text style={styles.label}>{t("settings.deleteAccount.passwordLabel")}</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={busy ? t("settings.deleteAccount.submitting") : t("settings.deleteAccount.submit")}
        loading={busy}
        disabled={!canSubmit}
        onPress={submit}
        style={{ backgroundColor: colors.destructive }}
      />
      <Button variant="secondary" label={t("settings.deleteAccount.cancel")} onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  lead: { ...type.body, color: colors.ink2 },
  sectionTitle: { ...type.small, fontWeight: "600", color: colors.ink },
  item: { ...type.small, color: colors.ink3 },
  label: { ...type.small, color: colors.ink2 },
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
  checkRow: { flexDirection: "row", gap: space(3), alignItems: "center" },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: colors.lineStrong },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  error: { ...type.small, color: colors.destructive },
});
