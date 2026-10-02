import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { REPORT_REASON_CODES, type ReportReasonCode } from "@/types/report";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Button } from "~/components/ui";
import { apiFetch, ApiError } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { colors, radius, space, type } from "~/theme";

/** Report a work (website ReportContentModal, POST /api/reports). */
export default function ReportScreen() {
  const { ownerUid, workId, target } = useLocalSearchParams<{ ownerUid: string; workId: string; target?: string }>();
  const { user } = useAuth();
  const { t } = useLocale();
  const [reason, setReason] = useState<ReportReasonCode | null>(null);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return <SignInPrompt title={t("report.loginRequired")} />;

  async function submit() {
    if (!reason) return;
    if (reason === "other" && !detail.trim()) return setError(t("report.detailRequired"));
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/reports", {
        method: "POST",
        auth: "required",
        json: {
          targetType: target === "promo" ? "promo" : "full",
          targetOwnerUid: ownerUid,
          targetWorkId: workId,
          reasonCode: reason,
          reasonDetail: detail.trim() || undefined,
        },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? t("report.duplicate") : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(5), gap: space(3) }}>
      <Stack.Screen options={{ title: t("report.title"), presentation: "modal" }} />
      {done ? (
        <>
          <Text style={styles.body}>{t("report.thankYou")}</Text>
          <Button label={t("report.close")} onPress={() => router.back()} />
        </>
      ) : (
        <>
          <Text style={styles.label}>{t("report.reasonLabel")}</Text>
          {REPORT_REASON_CODES.map((code) => (
            <Pressable key={code} onPress={() => setReason(code)} style={[styles.option, reason === code && styles.optionActive]}>
              <View style={[styles.radio, reason === code && styles.radioOn]} />
              <Text style={styles.body}>{t(`report.reason.${code}`)}</Text>
            </Pressable>
          ))}
          <Text style={styles.label}>{t("report.detailLabel")}</Text>
          <TextInput
            value={detail}
            onChangeText={setDetail}
            multiline
            maxLength={1000}
            style={[styles.input, { minHeight: 100, paddingTop: space(3), textAlignVertical: "top" }]}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t("report.submit")} loading={busy} disabled={!reason} onPress={submit} />
          <Button variant="secondary" label={t("report.cancel")} onPress={() => router.back()} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { ...type.small, color: colors.ink2, marginTop: space(2) },
  body: { ...type.body, color: colors.ink },
  option: { flexDirection: "row", alignItems: "center", gap: space(3), padding: space(3), borderRadius: radius.control, backgroundColor: colors.surface },
  optionActive: { backgroundColor: "rgba(61,125,255,0.12)" },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.lineStrong },
  radioOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  input: {
    ...type.body,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    paddingHorizontal: space(4),
  },
  error: { ...type.small, color: colors.destructive },
});
