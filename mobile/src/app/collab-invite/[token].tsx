import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { CollabInvitePublicView } from "@/types/collab-invite";
import { Button, Loading, Message } from "~/components/ui";
import { apiFetch, ApiError } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

/**
 * Accept a credit invite sent by email (website /collab-invite/[token]).
 * Opens from oona://collab-invite/<token>.
 */
export default function CollabInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invite = useApi(authLoading ? null : `invite:${token}:${user?.uid ?? "guest"}`, async () => {
    const data = await apiFetch<{ invite?: CollabInvitePublicView }>(`/api/collab-invite/${encodeURIComponent(token)}`, {
      auth: "optional",
    });
    return data.invite ?? null;
  });

  if (authLoading || (invite.loading && !invite.data)) return <Loading />;
  if (!invite.data) {
    const notFound = invite.error instanceof ApiError && invite.error.status === 404;
    return <Message title={t(notFound || !invite.error ? "collabInvite.notFound" : "collabInvite.loadError")} />;
  }

  const view = invite.data;

  async function accept() {
    setAccepting(true);
    setError(null);
    try {
      await apiFetch(`/api/collab-invite/${encodeURIComponent(token)}/accept`, { method: "POST", auth: "required" });
      setAccepted(true);
      await invite.refresh();
    } catch (err) {
      setError((err as Error).message || t("collabInvite.acceptError"));
    } finally {
      setAccepting(false);
    }
  }

  const row = (label: string, value: string) => (
    <View style={{ gap: 2 }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(5), gap: space(5) }}>
      <Stack.Screen options={{ title: t("collabInvite.title") }} />
      <View style={styles.card}>
        {row(t("collabInvite.workLabel"), view.workTitle)}
        {row(t("collabInvite.roleLabel"), t(`network.credits.role.${view.role}`))}
        {row(t("collabInvite.invitedBy"), view.ownerDisplayName)}
        {row(t("collabInvite.invitedEmail"), view.invitedEmailMasked)}
        {view.expiresAt ? row(t("collabInvite.expires"), new Date(view.expiresAt).toLocaleString()) : null}
      </View>

      {accepted || view.status === "accepted" ? (
        <Text style={[styles.status, { color: colors.success }]}>
          {t(accepted ? "collabInvite.accepted" : "collabInvite.alreadyAccepted")}
        </Text>
      ) : view.status === "expired" ? (
        <Text style={[styles.status, { color: colors.gold }]}>{t("collabInvite.expired")}</Text>
      ) : !user ? (
        <View style={{ gap: space(3) }}>
          <Text style={styles.status}>{t("collabInvite.loginRequired")}</Text>
          <Button label={t("collabInvite.login")} onPress={() => router.push("/login")} />
          <Button variant="secondary" label={t("collabInvite.signup")} onPress={() => router.push("/signup")} />
        </View>
      ) : view.acceptBlockReason === "email_mismatch" ? (
        <Text style={[styles.status, { color: colors.destructive }]}>{t("collabInvite.emailMismatch")}</Text>
      ) : view.canAccept ? (
        <Button label={accepting ? t("collabInvite.accepting") : t("collabInvite.accept")} loading={accepting} onPress={accept} />
      ) : (
        <Text style={styles.status}>{t("collabInvite.notPending")}</Text>
      )}

      {error ? <Text style={[styles.status, { color: colors.destructive }]}>{error}</Text> : null}
      <Button variant="secondary" label={t("collabInvite.goHome")} onPress={() => router.replace("/")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { gap: space(4), padding: space(5), borderRadius: radius.card, backgroundColor: colors.surface },
  label: { ...type.small, color: colors.ink3 },
  value: { ...type.body, color: colors.ink },
  status: { ...type.body, color: colors.ink2 },
});
