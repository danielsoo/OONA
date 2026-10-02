import { router, Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "~/components/ui";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { colors, radius, space, type } from "~/theme";

/** About OONA (website /about). */
export default function AboutScreen() {
  const { t } = useLocale();
  const { user } = useAuth();
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(12) }}>
      <Stack.Screen options={{ title: t("about.title") }} />
      <Text style={styles.title}>{t("about.title")}</Text>
      <Text style={styles.body}>{t("about.lead")}</Text>
      <View style={{ gap: space(2) }}>
        <Button label={t("ui.home.browseCta")} onPress={() => router.push("/")} />
        <Button variant="secondary" label={t("ui.home.uploadCta")} onPress={() => router.push(user ? "/upload" : "/login")} />
      </View>
      <View style={styles.card}>
        <Text style={styles.section}>{t("about.campusTitle")}</Text>
        <Text style={styles.body}>{t("about.campusBody")}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h1, color: colors.ink },
  section: { ...type.h3, color: colors.ink },
  body: { ...type.body, color: colors.ink2 },
  card: { padding: space(4), borderRadius: radius.card, backgroundColor: colors.surface, gap: space(2) },
});
