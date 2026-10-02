import { Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { PersonRow } from "~/components/PersonRow";
import { WorkCard } from "~/components/WorkRail";
import { searchPeople, type PersonCard } from "~/lib/discovery";
import { loadCatalog } from "~/lib/feeds";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

/**
 * Search (website /search): titles are matched on the catalog feeds, people
 * through GET /api/discover/people?q=, 300ms after typing stops.
 */
export default function SearchScreen() {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [people, setPeople] = useState<PersonCard[]>([]);

  const catalog = useApi("search-catalog", async () => {
    const [m, s, e] = await Promise.all([loadCatalog("movies", 30), loadCatalog("series", 30), loadCatalog("entertainment", 30)]);
    return [...m, ...s, ...e];
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim().toLowerCase()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debounced.length < 2) {
      setPeople([]);
      return;
    }
    let cancelled = false;
    searchPeople(debounced)
      .then((p) => !cancelled && setPeople(p))
      .catch(() => !cancelled && setPeople([]));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const titles = useMemo(
    () => (debounced ? (catalog.data ?? []).filter((w) => w.title.toLowerCase().includes(debounced)).slice(0, 20) : []),
    [catalog.data, debounced]
  );

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space(10) }}>
      <Stack.Screen options={{ title: t("search.title") }} />
      <View style={{ padding: space(4) }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("search.placeholder")}
          placeholderTextColor={colors.ink4}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
        />
      </View>

      {!debounced ? <Text style={styles.prompt}>{t("search.prompt")}</Text> : null}
      {debounced && titles.length === 0 && people.length === 0 ? <Text style={styles.prompt}>{t("search.noResults")}</Text> : null}

      {titles.length > 0 ? (
        <View style={{ marginBottom: space(6) }}>
          <Text style={styles.section}>{t("search.titlesLabel")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space(4), gap: space(3) }}>
            {titles.map((w) => (
              <WorkCard
                key={`${w.ownerUid}:${w.workId}`}
                item={{ key: w.workId, ownerUid: w.ownerUid, workId: w.workId, title: w.title, subtitle: w.director, thumbnailUrl: w.thumbnailUrl }}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {people.length > 0 ? (
        <View>
          <Text style={styles.section}>{t("search.peopleLabel")}</Text>
          {people.map((p) => (
            <PersonRow key={p.uid} person={p} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  prompt: { ...type.body, color: colors.ink3, textAlign: "center", padding: space(8) },
  section: { ...type.h3, color: colors.ink, paddingHorizontal: space(4), marginBottom: space(3) },
});
