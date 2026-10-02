import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import type { WorkSection } from "@/types/work";
import { HeroCard } from "~/components/HeroCard";
import { Loading, Message } from "~/components/ui";
import { WorkCard } from "~/components/WorkRail";
import { toRailItem } from "~/lib/catalog";
import { loadCatalog } from "~/lib/feeds";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, space, type } from "~/theme";

const SECTIONS: WorkSection[] = ["movies", "series", "entertainment"];

/** Full list for one section (website /movies, /series, /entertainment), with a category filter. */
export default function SectionScreen() {
  const params = useLocalSearchParams<{ section: string }>();
  const section: WorkSection = SECTIONS.includes(params.section as WorkSection) ? (params.section as WorkSection) : "movies";
  const { t, ui } = useLocale();
  const items = useApi(`catalog:${section}`, () => loadCatalog(section, 24));
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const item of items.data ?? []) {
      const c = item.approvedCategory?.trim();
      if (c) seen.add(c);
    }
    return [...seen];
  }, [items.data]);

  if (items.loading && !items.data) return <Loading />;
  if (items.error && !items.data) return <Message title={t("common.retry")} body={items.error.message} />;
  const all = items.data ?? [];
  const shown = category ? all.filter((i) => i.approvedCategory?.trim() === category) : all;
  const [hero, ...rest] = shown;

  return (
    <>
      <Stack.Screen options={{ title: t(`nav.${section}`) }} />
      <FlatList
        style={{ backgroundColor: colors.bg }}
        data={rest}
        numColumns={2}
        keyExtractor={(i) => `${i.ownerUid}:${i.workId}`}
        columnWrapperStyle={{ gap: space(3), paddingHorizontal: space(4) }}
        contentContainerStyle={{ gap: space(4), paddingBottom: space(10) }}
        refreshControl={<RefreshControl refreshing={items.loading} onRefresh={items.refresh} tintColor={colors.ink2} />}
        ListHeaderComponent={
          <View style={{ gap: space(4), paddingTop: space(3) }}>
            {categories.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2), paddingHorizontal: space(4) }}>
                {[null, ...categories].map((c) => (
                  <Pressable
                    key={c ?? "all"}
                    onPress={() => setCategory(c)}
                    style={[styles.chip, category === c && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: category === c }}
                  >
                    <Text style={[styles.chipText, category === c && { color: colors.ink }]}>{c ?? ui("All")}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            {hero ? <HeroCard item={hero} /> : null}
          </View>
        }
        ListEmptyComponent={hero ? null : <Message title={ui("The first approved work in this category will appear here.")} />}
        renderItem={({ item }) => (
          <View style={{ flex: 1 / 2 }}>
            <WorkCard item={toRailItem(item)} width="100%" />
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: space(3), paddingVertical: space(2), borderRadius: 999, borderWidth: 1, borderColor: colors.line },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.card },
  chipText: { ...type.small, color: colors.ink3 },
});
