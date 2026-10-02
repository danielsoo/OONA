import { Image } from "expo-image";
import { router, Stack } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { SchoolListItem } from "@/types/school";
import { Loading, Message } from "~/components/ui";
import { apiFetch } from "~/lib/api";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

/** School rankings (website /schools, GET /api/schools). */
export default function SchoolsScreen() {
  const { t } = useLocale();
  const schools = useApi("schools", async () => {
    const data = await apiFetch<{ schools?: SchoolListItem[] }>("/api/schools?limit=50");
    return data.schools ?? [];
  });

  if (schools.loading && !schools.data) return <Loading />;
  if (schools.error && !schools.data) return <Message title={t("common.retry")} body={schools.error.message} />;

  return (
    <>
      <Stack.Screen options={{ title: t("schools.directoryTitle") }} />
      <FlatList
        style={{ backgroundColor: colors.bg }}
        data={schools.data ?? []}
        keyExtractor={(s) => s.id}
        refreshControl={<RefreshControl refreshing={schools.loading} onRefresh={schools.refresh} tintColor={colors.ink2} />}
        ListHeaderComponent={<Text style={styles.lead}>{t("schools.directorySubtitle")}</Text>}
        ListEmptyComponent={<Message title={t("schools.empty")} />}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => router.push(`/schools/${item.id}`)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <Text style={styles.rank}>{index + 1}</Text>
            {item.logoUrl ? (
              <Image source={{ uri: item.logoUrl }} style={styles.logo} contentFit="contain" />
            ) : (
              <View style={[styles.logo, { backgroundColor: item.colorPrimary }]}>
                <Text style={[styles.initials, { color: item.colorSecondary }]}>{item.initials}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.meta}>{t("schools.workCount", { count: item.workCount ?? 0 })}</Text>
            </View>
          </Pressable>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  lead: { ...type.body, color: colors.ink3, padding: space(4) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rank: { ...type.h3, color: colors.ink3, width: 28, textAlign: "center" },
  logo: { width: 44, height: 44, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  initials: { ...type.small, fontWeight: "700" },
  name: { ...type.body, color: colors.ink, fontWeight: "500" },
  meta: { ...type.small, color: colors.ink3 },
});
