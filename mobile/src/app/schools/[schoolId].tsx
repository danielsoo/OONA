import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { SchoolListItem, SchoolStats } from "@/types/school";
import type { CatalogFeedItem } from "@/types/work";
import { Loading, Message } from "~/components/ui";
import { WorkCard, WorkRail, type RailItem } from "~/components/WorkRail";
import { apiFetch } from "~/lib/api";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

type SchoolPayload = {
  redirectTo?: string;
  school?: SchoolListItem;
  stats?: SchoolStats;
  representative?: CatalogFeedItem | null;
  latest?: CatalogFeedItem[];
  mostViewed?: CatalogFeedItem[];
};

function rail(items: CatalogFeedItem[] = []): RailItem[] {
  return items.map((w) => ({ key: `${w.ownerUid}:${w.workId}`, ownerUid: w.ownerUid, workId: w.workId, title: w.title, subtitle: w.director, thumbnailUrl: w.thumbnailUrl }));
}

/** School profile (website /school/[schoolId], GET /api/schools/{id}). */
export default function SchoolScreen() {
  const { schoolId } = useLocalSearchParams<{ schoolId: string }>();
  const { t } = useLocale();
  const data = useApi(`school:${schoolId}`, () => apiFetch<SchoolPayload>(`/api/schools/${encodeURIComponent(schoolId)}`));

  useEffect(() => {
    if (data.data?.redirectTo) router.replace(`/schools/${data.data.redirectTo}`);
  }, [data.data?.redirectTo]);

  if (data.loading && !data.data) return <Loading />;
  const payload = data.data;
  if (!payload?.school) return <Message title={t("common.retry")} body={data.error?.message} />;

  const { school, stats, representative } = payload;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: space(10) }}>
      <Stack.Screen options={{ title: school.shortName || school.name }} />
      <View style={[styles.hero, { backgroundColor: school.colorPrimary }]}>
        {school.logoUrl ? (
          <Image source={{ uri: school.logoUrl }} style={styles.logo} contentFit="contain" />
        ) : (
          <Text style={[styles.initials, { color: school.colorSecondary }]}>{school.initials}</Text>
        )}
        <Text style={[styles.name, { color: school.colorSecondary }]}>{school.name}</Text>
      </View>

      {stats ? (
        <View style={styles.stats}>
          <Stat label={t("schools.statWorks")} value={stats.workCount} />
          <Stat label={t("schools.profileMovies")} value={stats.movieCount} />
          <Stat label={t("schools.profileEntertainment")} value={stats.entertainmentCount} />
        </View>
      ) : null}

      {representative ? (
        <View style={{ paddingHorizontal: space(4), marginBottom: space(7), gap: space(3) }}>
          <Text style={styles.section}>{t("schools.representative")}</Text>
          <WorkCard item={rail([representative])[0]} width="100%" />
        </View>
      ) : null}
      <WorkRail title={t("schools.latest")} items={rail(payload.latest)} />
      <WorkRail title={t("schools.mostViewed")} items={rail(payload.mostViewed)} />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: space(3), paddingVertical: space(8), paddingHorizontal: space(4) },
  logo: { width: 88, height: 88 },
  initials: { fontSize: 40, fontWeight: "700" },
  name: { ...type.h2, textAlign: "center" },
  stats: { flexDirection: "row", padding: space(4), gap: space(3), marginBottom: space(4) },
  stat: { flex: 1, alignItems: "center", padding: space(3), borderRadius: radius.card, backgroundColor: colors.surface },
  statValue: { ...type.h2, color: colors.ink },
  statLabel: { ...type.small, color: colors.ink3, textAlign: "center" },
  section: { ...type.h3, color: colors.ink },
});
