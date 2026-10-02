import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "~/lib/auth";
import { LocaleProvider } from "~/lib/locale";
import { colors } from "~/theme";

void SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.bg,
    text: colors.ink,
    border: colors.line,
  },
};

function RootStack() {
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        headerTitleStyle: { color: colors.ink },
        contentStyle: { backgroundColor: colors.bg },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="watch/[ownerUid]/[workId]" options={{ title: "" }} />
      <Stack.Screen name="people/[handle]" options={{ title: "" }} />
      <Stack.Screen name="login" options={{ presentation: "modal", title: "" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <LocaleProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <RootStack />
          </AuthProvider>
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
