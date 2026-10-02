import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";
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
        options={{ title: t("nav.films"), headerTitle: "OONA", tabBarIcon: icon("film-outline", "film") }}
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
