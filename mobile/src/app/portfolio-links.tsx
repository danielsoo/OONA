import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Button, Loading, Message } from "~/components/ui";
import { apiFetch } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { API_BASE_URL } from "~/lib/config";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

type ShareRow = { id: string; token: string; title: string; viewCount: number; visibility: string };
type EligibleWork = { workId: string; ownerUid: string; title: string; role: string; portfolioSubmissionHidden: boolean };

const linkFor = (token: string) => `${API_BASE_URL}/p/${token}`;

/**
 * Portfolio share links (website settings PortfolioShareSection,
 * /api/me/portfolio-shares): pick which credited works to hide, create a link,
 * share or revoke it.
 */
export default function PortfolioLinksScreen() {
  const { user } = useAuth();
  const { t } = useLocale();
  const data = useApi(user ? `portfolio-shares:${user.uid}` : null, () =>
    apiFetch<{ shares?: ShareRow[]; eligibleWorks?: EligibleWork[] }>("/api/me/portfolio-shares", { auth: "required" })
  );
  const [title, setTitle] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setHidden(new Set((data.data?.eligibleWorks ?? []).filter((w) => w.portfolioSubmissionHidden).map((w) => w.workId)));
  }, [data.data]);

  if (!user) return <SignInPrompt />;
  if (data.loading && !data.data) return <Loading />;
  if (!data.data) return <Message title={t("portfolio.share.loadError")} body={data.error?.message} />;
  const works = data.data.eligibleWorks ?? [];
  const shares = data.data.shares ?? [];

  async function toggleHidden(workId: string, hide: boolean) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (hide) next.add(workId);
      else next.delete(workId);
      return next;
    });
    try {
      await apiFetch(`/api/me/works/${encodeURIComponent(workId)}/portfolio-visibility`, {
        method: "PATCH",
        auth: "required",
        json: { portfolioSubmissionHidden: hide },
      });
    } catch (e) {
      setErr((e as Error).message);
      await data.refresh();
    }
  }

  async function create() {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch<{ token?: string }>("/api/me/portfolio-shares", {
        method: "POST",
        auth: "required",
        json: { title: title.trim() || t("portfolio.share.defaultTitle"), excludedWorkIds: [...hidden] },
      });
      setTitle("");
      await data.refresh();
      if (res.token) void Share.share({ url: linkFor(res.token), message: linkFor(res.token) });
    } catch (e) {
      setErr((e as Error).message || t("portfolio.share.createError"));
    } finally {
      setBusy(false);
    }
  }

  function revoke(share: ShareRow) {
    Alert.alert(t("portfolio.share.revoke"), share.title, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("portfolio.share.revoke"),
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/api/me/portfolio-shares/${encodeURIComponent(share.id)}`, { method: "DELETE", auth: "required" });
            await data.refresh();
          } catch (e) {
            setErr((e as Error).message);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), gap: space(3), paddingBottom: space(12) }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t("portfolio.share.title") }} />
      <Text style={styles.hint}>{t("portfolio.share.hint")}</Text>

      {works.length === 0 ? (
        <Text style={styles.hint}>{t("portfolio.share.noPublishedWorks")}</Text>
      ) : (
        <>
          <Text style={styles.section}>{t("portfolio.share.worksToggle")}</Text>
          <Text style={styles.hint}>{t("portfolio.share.hideHint")}</Text>
          {works.map((w) => (
            <View key={`${w.ownerUid}_${w.workId}`} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.body} numberOfLines={1}>
                  {w.title}
                </Text>
                <Text style={styles.hint}>{w.role}</Text>
              </View>
              {/* On = shown in shared portfolios; off = hidden, same flag as the website's checkbox. */}
              <Switch
                value={!hidden.has(w.workId)}
                onValueChange={(show) => void toggleHidden(w.workId, !show)}
                trackColor={{ true: colors.accent }}
                accessibilityLabel={w.title}
              />
            </View>
          ))}
        </>
      )}

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t("portfolio.share.titlePlaceholder")}
        placeholderTextColor={colors.ink4}
        maxLength={200}
        style={styles.input}
      />
      <Button label={t("portfolio.share.create")} loading={busy} disabled={busy || works.length === 0} onPress={create} />
      {err ? <Text style={[styles.hint, { color: colors.destructive }]}>{err}</Text> : null}

      {shares.map((s) => (
        <View key={s.id} style={styles.card}>
          <Text style={styles.body}>{s.title}</Text>
          <Text style={styles.hint}>
            /p/{s.token.slice(0, 8)}… · {s.viewCount} {t("portfolio.share.views")}
            {s.visibility === "revoked" ? ` · ${t("portfolio.share.revoked")}` : ""}
          </Text>
          {s.visibility === "active" ? (
            <View style={{ flexDirection: "row", gap: space(4), marginTop: space(1) }}>
              <Text style={styles.link} onPress={() => void Share.share({ url: linkFor(s.token), message: linkFor(s.token) })}>
                {t("portfolio.share.copy")}
              </Text>
              <Text style={styles.link} onPress={() => router.push(`/p/${s.token}`)}>
                {t("portfolio.share.preview")}
              </Text>
              <Text style={[styles.link, { color: colors.destructive }]} onPress={() => revoke(s)}>
                {t("portfolio.share.revoke")}
              </Text>
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { ...type.h3, color: colors.ink, marginTop: space(2) },
  body: { ...type.body, color: colors.ink },
  hint: { ...type.small, color: colors.ink3 },
  link: { ...type.small, color: colors.accentHover },
  row: { flexDirection: "row", alignItems: "center", gap: space(3), paddingVertical: space(1) },
  card: { padding: space(3), borderRadius: radius.card, backgroundColor: colors.surface, gap: 2 },
  input: {
    ...type.body,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    paddingHorizontal: space(4),
    minHeight: 48,
    marginTop: space(3),
  },
});
