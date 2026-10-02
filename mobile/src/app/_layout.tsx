import { DarkTheme, router, Stack, ThemeProvider, useSegments } from "expo-router";
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

/** Sends signed-in users to the step they still owe: verify their email, or finish the profile. */
function useAuthGateRedirect() {
  const { gate, signOut } = useAuth();
  const segments = useSegments();
  const screen = segments[0];

  useEffect(() => {
    if (gate === "verify" && screen !== "verify-email") router.replace("/verify-email");
    else if (gate === "profile" && screen !== "signup") router.replace("/signup");
    else if (gate === "deleted") void signOut();
    else if (gate === "none" && screen === "verify-email") router.replace("/");
  }, [gate, screen, signOut]);
}

function RootStack() {
  const { loading } = useAuth();
  useAuthGateRedirect();

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
      <Stack.Screen name="signup" options={{ title: "" }} />
      <Stack.Screen name="verify-email" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="my-works" options={{ title: "" }} />
      <Stack.Screen name="collab-invite/[token]" options={{ title: "" }} />
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
