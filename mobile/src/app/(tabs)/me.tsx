import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Avatar, Button } from "~/components/ui";
import { appText } from "~/lib/appCopy";
import { useAuth } from "~/lib/auth";
import { loadHandleForUid } from "~/lib/feeds";
import { useLocale } from "~/lib/locale";
import { unregisterPush } from "~/lib/push";
import { useApi } from "~/lib/useApi";
import { colors, space, type } from "~/theme";

export default function MeScreen() {
  const { user, profile, signOut } = useAuth();
  const { locale, t, ui } = useLocale();
  const handle = useApi(user ? `handle:${user.uid}` : null, () => loadHandleForUid(user!.uid));

  if (!user) return <SignInPrompt />;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), gap: space(3) }}>
      <View style={styles.header}>
        <Avatar uri={profile?.avatarUrl ?? user.photoURL} name={profile?.displayName ?? user.displayName ?? user.email ?? "?"} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile?.displayName ?? user.displayName ?? user.email}</Text>
          {handle.data ? <Text style={styles.sub}>@{handle.data.handle}</Text> : null}
        </View>
      </View>

      {handle.data ? (
        <Button variant="secondary" label={appText(locale, "myProfile")} onPress={() => router.push(`/people/${handle.data!.handle}`)} />
      ) : null}
      <Button variant="secondary" label={t("dm.inboxTitle")} onPress={() => router.push("/messages")} />
      <Button variant="secondary" label={t("myWorks.title")} onPress={() => router.push("/my-works")} />
      <Button variant="secondary" label={t("myList.title")} onPress={() => router.push("/my-list")} />
      <Button variant="secondary" label={ui("Projects")} onPress={() => router.push("/projects")} />
      <Button variant="secondary" label={t("settings.title")} onPress={() => router.push("/settings")} />
      <Button variant="secondary" label={t("about.title")} onPress={() => router.push("/about")} />
      <Button
        variant="secondary"
        label={appText(locale, "signOut")}
        onPress={async () => {
          await unregisterPush();
          await signOut();
        }}
        style={{ marginTop: space(4) }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: space(4), paddingVertical: space(3) },
  name: { ...type.h3, color: colors.ink },
  sub: { ...type.small, color: colors.ink3 },
});
