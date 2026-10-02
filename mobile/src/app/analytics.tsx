import { Stack } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import type { UploaderAnalyticsPayload } from "@/types/engagement";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Loading, Message } from "~/components/ui";
import { apiFetch } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

const DAYS = 30;
const CHART_HEIGHT = 120;

/** Last N days as YYYY-MM-DD, oldest first, so empty days still get a slot. */
function lastDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
  return out;
}

/**
 * Daily series as thin bars on one axis: single series, so no legend; the
 * title names it. Tap a bar to read its value; the peak is labeled.
 */
function DailyBars({ title, byDay, emptyLabel }: { title: string; byDay: Record<string, number>; emptyLabel: string }) {
  const days = lastDays(DAYS);
  const values = days.map((d) => byDay[d] ?? 0);
  const max = Math.max(...values);
  const peak = values.indexOf(max);
  const [selected, setSelected] = useState<number | null>(null);
  const shown = selected ?? peak;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {max === 0 ? (
        <Text style={styles.muted}>{emptyLabel}</Text>
      ) : (
        <>
          <Text style={styles.readout}>
            {values[shown].toLocaleString()} <Text style={styles.muted}>· {days[shown]}</Text>
          </Text>
          <View style={styles.chart} accessibilityRole="image" accessibilityLabel={`${title}: ${values.join(", ")}`}>
            {values.map((v, i) => (
              <Pressable key={days[i]} onPress={() => setSelected(i)} style={styles.slot} hitSlop={4}>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(2, (v / max) * CHART_HEIGHT) },
                    i === shown ? { backgroundColor: colors.accentHover } : null,
                  ]}
                />
              </Pressable>
            ))}
          </View>
          <View style={styles.axis}>
            <Text style={styles.axisLabel}>{days[0].slice(5)}</Text>
            <Text style={styles.axisLabel}>{days[days.length - 1].slice(5)}</Text>
          </View>
        </>
      )}
    </View>
  );
}

/** Uploader analytics (website /uploader/analytics, GET /api/me/analytics). */
export default function AnalyticsScreen() {
  const { user } = useAuth();
  const { t } = useLocale();
  const data = useApi(user ? `analytics:${user.uid}` : null, () =>
    apiFetch<UploaderAnalyticsPayload>(`/api/me/analytics?days=${DAYS}`, { auth: "required" })
  );

  if (!user) return <SignInPrompt title={t("myWorks.loginRequired")} />;
  if (data.loading && !data.data) return <Loading />;
  if (!data.data) return <Message title={t("uploader.analytics.loadError")} body={data.error?.message} />;

  const { summary, breakdown } = data.data;
  // Same rounding as the website: one decimal, "—" without views.
  const rate = summary.totalViews > 0 ? `${Math.round((summary.totalLikes / summary.totalViews) * 1000) / 10}%` : "—";

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(10) }}
      refreshControl={<RefreshControl refreshing={data.loading} onRefresh={data.refresh} tintColor={colors.ink2} />}
    >
      <Stack.Screen options={{ title: t("uploader.analytics.title") }} />
      <Text style={styles.muted}>{t("uploader.analytics.subtitle")}</Text>

      <View style={styles.tiles}>
        <Tile label={t("uploader.analytics.totalViews")} value={summary.totalViews.toLocaleString()} />
        <Tile label={t("uploader.analytics.totalLikes")} value={summary.totalLikes.toLocaleString()} />
        <Tile label={t("uploader.analytics.engagementRate")} value={rate} />
      </View>

      <DailyBars title={t("uploader.analytics.chartViewsTitle")} byDay={summary.viewsByDay} emptyLabel={t("uploader.analytics.chartEmpty")} />
      <DailyBars title={t("uploader.analytics.chartLikesTitle")} byDay={summary.likesByDay} emptyLabel={t("uploader.analytics.chartEmpty")} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("uploader.analytics.breakdownTitle")}</Text>
        {breakdown.length === 0 ? (
          <Text style={styles.muted}>{t("uploader.analytics.breakdownEmpty")}</Text>
        ) : (
          <>
            <View style={styles.row}>
              <Text style={[styles.th, { flex: 2, textAlign: "left" }]}>{t("uploader.analytics.colTitle")}</Text>
              <Text style={styles.th}>{t("uploader.analytics.colFullViews")}</Text>
              <Text style={styles.th}>{t("uploader.analytics.colPromoViews")}</Text>
              <Text style={styles.th}>{t("uploader.analytics.colPromoLikes")}</Text>
            </View>
            {breakdown.map((w) => (
              <View key={w.workId} style={styles.row}>
                <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>
                  {w.title}
                </Text>
                <Text style={styles.num}>{w.fullViews.toLocaleString()}</Text>
                <Text style={styles.num}>{w.promoViews.toLocaleString()}</Text>
                <Text style={styles.num}>{w.promoLikes.toLocaleString()}</Text>
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { ...type.small, color: colors.ink3 },
  tiles: { flexDirection: "row", gap: space(3) },
  tile: { flex: 1, padding: space(3), borderRadius: radius.card, backgroundColor: colors.surface, gap: 2 },
  tileValue: { ...type.h2, color: colors.ink },
  tileLabel: { ...type.small, color: colors.ink3 },
  card: { padding: space(4), borderRadius: radius.card, backgroundColor: colors.surface, gap: space(3) },
  cardTitle: { ...type.h3, color: colors.ink },
  readout: { ...type.body, color: colors.ink, fontVariant: ["tabular-nums"] },
  chart: {
    height: CHART_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.lineStrong,
  },
  slot: { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar: { backgroundColor: colors.accent, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axis: { flexDirection: "row", justifyContent: "space-between" },
  axisLabel: { ...type.small, fontSize: 11, color: colors.ink4 },
  row: { flexDirection: "row", gap: space(2), paddingVertical: space(2), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  th: { ...type.small, color: colors.ink3, flex: 1, textAlign: "right" },
  td: { ...type.small, color: colors.ink },
  num: { ...type.small, color: colors.ink, flex: 1, textAlign: "right", fontVariant: ["tabular-nums"] },
});
