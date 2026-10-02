import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LOCALES } from "@/i18n";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Avatar, Button } from "~/components/ui";
import { appText } from "~/lib/appCopy";
import { useAuth } from "~/lib/auth";
import { loadHandleForUid } from "~/lib/feeds";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

export default function MeScreen() {
  const { user, signOut } = useAuth();
  const { locale, setLocale } = useLocale();
  const handle = useApi(user ? `handle:${user.uid}` : null, () => loadHandleForUid(user!.uid));

  if (!user) return <SignInPrompt />;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), gap: space(6) }}>
      <View style={styles.header}>
        <Avatar uri={user.photoURL} name={user.displayName ?? user.email ?? "?"} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user.displayName ?? user.email}</Text>
          {handle.data ? <Text style={styles.sub}>@{handle.data.handle}</Text> : null}
        </View>
      </View>

      {handle.data ? (
        <Button
          variant="secondary"
          label={appText(locale, "myProfile")}
          onPress={() => router.push(`/people/${handle.data!.handle}`)}
        />
      ) : null}

      <View style={{ gap: space(2) }}>
        <Text style={styles.label}>{appText(locale, "language")}</Text>
        <View style={styles.segment}>
          {LOCALES.map((l) => (
            <Pressable
              key={l.code}
              onPress={() => setLocale(l.code)}
              style={[styles.segmentItem, locale === l.code && styles.segmentActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: locale === l.code }}
            >
              <Text style={[styles.segmentText, locale === l.code && { color: colors.ink }]}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Button variant="secondary" label={appText(locale, "signOut")} onPress={() => void signOut()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: space(4), paddingTop: space(2) },
  name: { ...type.h3, color: colors.ink },
  sub: { ...type.small, color: colors.ink3 },
  label: { ...type.small, color: colors.ink2 },
  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    overflow: "hidden",
  },
  segmentItem: { flex: 1, paddingVertical: space(3), alignItems: "center" },
  segmentActive: { backgroundColor: colors.card },
  segmentText: { ...type.small, color: colors.ink3 },
});
