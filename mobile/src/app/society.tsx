import { Stack } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { PersonRow } from "~/components/PersonRow";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Loading, Message } from "~/components/ui";
import { useAuth } from "~/lib/auth";
import { discoverPeople } from "~/lib/discovery";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, space, type } from "~/theme";

type Tab = "discover" | "open" | "connections";

/** Society (website /society): find people, people open to collaborate, and the people you follow. */
export default function SocietyScreen() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [tab, setTab] = useState<Tab>("discover");
  const needsAuth = tab === "connections" && !user;
  const people = useApi(needsAuth ? null : `society:${tab}:${user?.uid ?? "guest"}`, () =>
    discoverPeople({ openOnly: tab === "open", followingOnly: tab === "connections" })
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "discover", label: t("society.tabDiscover") },
    { id: "open", label: t("profile.edit.openToCollaborate") },
    { id: "connections", label: t("society.tabConnections") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: t("society.title") }} />
      <View style={styles.tabs}>
        {tabs.map((x) => (
          <Pressable key={x.id} onPress={() => setTab(x.id)} style={[styles.tab, tab === x.id && styles.tabActive]}>
            <Text style={[styles.tabText, tab === x.id && { color: colors.ink }]}>{x.label}</Text>
          </Pressable>
        ))}
      </View>
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
});
