import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { Pressable, View } from "react-native";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { useLocale } from "~/lib/locale";
import { colors } from "~/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

function icon(outline: IconName, filled: IconName) {
  return ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={focused ? filled : outline} color={color as string} size={size} />
  );
}

/** Same five tabs as the website's mobile tab bar (src/lib/appNav.ts MOBILE_TABS). */
export default function TabLayout() {
  const { t } = useLocale();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: "rgba(255,255,255,0.48)",
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.tabBorder },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.films"),
          headerTitle: "OONA",
          tabBarIcon: icon("film-outline", "film"),
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 18, marginRight: 16 }}>
              <Pressable accessibilityLabel={t("nav.schools")} onPress={() => router.push("/schools")} hitSlop={8}>
                <Ionicons name="school-outline" size={22} color={colors.ink} />
              </Pressable>
              <Pressable accessibilityLabel={t("nav.society")} onPress={() => router.push("/society")} hitSlop={8}>
                <Ionicons name="people-outline" size={22} color={colors.ink} />
              </Pressable>
              <Pressable accessibilityLabel={t("nav.search")} onPress={() => router.push("/search")} hitSlop={8}>
                <Ionicons name="search-outline" size={22} color={colors.ink} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: t("nav.discover"), tabBarIcon: icon("compass-outline", "compass") }}
      />
      <Tabs.Screen
        name="upload"
        options={{ title: t("nav.upload"), tabBarIcon: icon("add-circle-outline", "add-circle") }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: t("topBar.notifications"), tabBarIcon: icon("notifications-outline", "notifications") }}
      />
      <Tabs.Screen name="me" options={{ title: t("nav.me"), tabBarIcon: icon("person-outline", "person") }} />
    </Tabs>
  );
}
