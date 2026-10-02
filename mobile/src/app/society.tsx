import { router, Stack } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { PersonRow } from "~/components/PersonRow";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Loading, Message } from "~/components/ui";
import { useAuth } from "~/lib/auth";
import { discoverPeople, type RoleFilter } from "~/lib/discovery";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, space, type } from "~/theme";

type Tab = "discover" | "open" | "connections";

/** Society (website /society): find people, people open to collaborate, and the people you follow. */
export default function SocietyScreen() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [tab, setTab] = useState<Tab>("discover");
  const [role, setRole] = useState<RoleFilter | null>(null);
  const needsAuth = tab === "connections" && !user;
  const people = useApi(needsAuth ? null : `society:${tab}:${role ?? "all"}:${user?.uid ?? "guest"}`, () =>
    discoverPeople({ openOnly: tab === "open", followingOnly: tab === "connections", role: role ?? undefined })
  );
  const roles: { id: RoleFilter | null; label: string }[] = [
    { id: null, label: t("society.filterAllRoles") },
    { id: "director", label: t("society.roleDirector") },
    { id: "actor", label: t("society.roleActor") },
    { id: "crew", label: t("society.roleCrew") },
  ];

  const tabs: { id: Tab; label: string }[] = [
    { id: "discover", label: t("society.tabDiscover") },
    { id: "open", label: t("profile.edit.openToCollaborate") },
    { id: "connections", label: t("society.tabConnections") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: t("society.title"),
          headerRight: user
            ? () => (
                <Text onPress={() => router.push("/invites")} style={{ ...type.small, color: colors.accentHover }}>
                  {t("society.tabRequests")}
                </Text>
              )
            : undefined,
        }}
      />
      <View style={styles.tabs}>
        {tabs.map((x) => (
          <Pressable key={x.id} onPress={() => setTab(x.id)} style={[styles.tab, tab === x.id && styles.tabActive]}>
            <Text style={[styles.tabText, tab === x.id && { color: colors.ink }]}>{x.label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.filters}>
        {roles.map((r) => (
          <Pressable
            key={r.id ?? "all"}
            onPress={() => setRole(r.id)}
            style={[styles.chip, role === r.id && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: role === r.id }}
          >
            <Text style={[styles.tabText, role === r.id && { color: colors.ink }]}>{r.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {needsAuth ? (
        <SignInPrompt title={t("society.loginRequired")} />
      ) : people.loading && !people.data ? (
        <Loading />
      ) : people.error && !people.data ? (
        <Message title={t("society.loadError")} body={people.error.message} />
      ) : (
        <FlatList
          data={people.data ?? []}
          keyExtractor={(p) => p.uid}
          refreshControl={<RefreshControl refreshing={people.loading} onRefresh={people.refresh} tintColor={colors.ink2} />}
          ListEmptyComponent={<Message title={t("society.empty")} />}
          renderItem={({ item }) => <PersonRow person={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  tab: { flex: 1, alignItems: "center", paddingVertical: space(3), borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.accent },
  tabText: { ...type.small, color: colors.ink3 },
  filters: { gap: space(2), paddingHorizontal: space(4), paddingVertical: space(3) },
  chip: { paddingHorizontal: space(3), paddingVertical: space(2), borderRadius: 999, borderWidth: 1, borderColor: colors.line },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.card },
});
