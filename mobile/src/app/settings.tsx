import * as ImagePicker from "expo-image-picker";
import { router, Stack } from "expo-router";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { LOCALES } from "@/i18n";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Avatar, Button, Loading } from "~/components/ui";
import { apiFetch } from "~/lib/api";
import { appText } from "~/lib/appCopy";
import { useAuth } from "~/lib/auth";
import { db, storage } from "~/lib/firebase";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

type ProfessionalProfile = {
  headline: string | null;
  bio: string | null;
  isDiscoverable: boolean;
  openToCollaborate: boolean;
  avatarUrl?: string | null;
};

/**
 * Settings and public profile (website /settings and /account/profile):
 * photo, headline, bio, visibility, language, account deletion.
 */
export default function SettingsScreen() {
  const { user, refreshGate } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const loaded = useApi(user ? `pro-profile:${user.uid}` : null, () =>
    apiFetch<ProfessionalProfile>("/api/me/professional-profile", { auth: "required" })
  );
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [discoverable, setDiscoverable] = useState(true);
  const [openToCollab, setOpenToCollab] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!loaded.data) return;
    setHeadline(loaded.data.headline ?? "");
    setBio(loaded.data.bio ?? "");
    setDiscoverable(loaded.data.isDiscoverable);
    setOpenToCollab(loaded.data.openToCollaborate);
    setAvatarUrl(loaded.data.avatarUrl ?? user?.photoURL ?? null);
  }, [loaded.data, user?.photoURL]);

  if (!user) return <SignInPrompt />;
  if (loaded.loading && !loaded.data) return <Loading />;

  async function changePhoto() {
    if (!user || !storage || !db) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    try {
      // Same Storage path as the website's uploadUserProfileAvatar.
      const ext = (asset.fileName?.split(".").pop() ?? "jpg").toLowerCase();
      const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
      const storageRef = ref(storage, `users/${user.uid}/profile/avatar.${safeExt}`);
      const blob = await (await fetch(asset.uri)).blob();
      await uploadBytes(storageRef, blob, { contentType: asset.mimeType ?? "image/jpeg" });
      const url = await getDownloadURL(storageRef);
      // Same as the website's persistUserProfileAvatarUrl: the client writes users/{uid}.avatarUrl.
      await setDoc(doc(db, "users", user.uid), { avatarUrl: url, updatedAt: serverTimestamp() }, { merge: true });
      setAvatarUrl(url);
    } catch (err) {
      setMessage({ text: (err as Error).message, ok: false });
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch("/api/me/professional-profile", {
        method: "PATCH",
        auth: "required",
        json: { headline, bio, isDiscoverable: discoverable, openToCollaborate: openToCollab },
      });
      await refreshGate();
      setMessage({ text: t("profile.edit.saved"), ok: true });
    } catch (err) {
      setMessage({ text: (err as Error).message, ok: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), gap: space(3), paddingBottom: space(12) }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t("settings.title") }} />

      <Pressable onPress={changePhoto} style={{ alignItems: "center", gap: space(2), marginBottom: space(2) }}>
        <Avatar uri={avatarUrl} name={user.displayName ?? "?"} size={88} />
        <Text style={styles.link}>{appText(locale, "changePhoto")}</Text>
      </Pressable>

      <Text style={styles.section}>{t("profile.edit.aboutTitle")}</Text>
      <Text style={styles.hint}>{t("profile.edit.aboutHint")}</Text>
      <Text style={styles.label}>{t("profile.edit.headline")}</Text>
      <TextInput value={headline} onChangeText={setHeadline} placeholder={t("profile.edit.headlinePlaceholder")} placeholderTextColor={colors.ink4} maxLength={200} style={styles.input} />
      <Text style={styles.label}>{t("profile.edit.bio")}</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        placeholder={t("profile.edit.bioPlaceholder")}
        placeholderTextColor={colors.ink4}
        multiline
        maxLength={2000}
        style={[styles.input, { minHeight: 120, paddingTop: space(3), textAlignVertical: "top" }]}
      />

      <Text style={[styles.section, { marginTop: space(4) }]}>{t("profile.edit.boothTitle")}</Text>
      <Text style={styles.hint}>{t("profile.edit.boothHint")}</Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t("profile.edit.discoverable")}</Text>
        <Switch value={discoverable} onValueChange={setDiscoverable} trackColor={{ true: colors.accent }} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t("profile.edit.openToCollaborate")}</Text>
        <Switch value={openToCollab} onValueChange={setOpenToCollab} trackColor={{ true: colors.accent }} />
      </View>

      {message ? <Text style={[styles.hint, { color: message.ok ? colors.success : colors.destructive }]}>{message.text}</Text> : null}
      <Button label={t("profile.edit.save")} loading={saving} onPress={save} />

      <Text style={[styles.section, { marginTop: space(6) }]}>{t("settings.language")}</Text>
      <Text style={styles.hint}>{t("settings.languageHint")}</Text>
      <View style={styles.segment}>
        {LOCALES.map((l) => (
          <Pressable key={l.code} onPress={() => setLocale(l.code)} style={[styles.segmentItem, locale === l.code && styles.segmentActive]}>
            <Text style={[styles.hint, locale === l.code && { color: colors.ink }]}>{l.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.section, { marginTop: space(6) }]}>{t("settings.accountSection")}</Text>
      <Text style={styles.hint}>{t("settings.deleteAccount.hint")}</Text>
      <Button variant="secondary" label={t("settings.deleteAccount.link")} onPress={() => router.push("/delete-account")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { ...type.h3, color: colors.ink },
  label: { ...type.small, color: colors.ink2, marginTop: space(2) },
  hint: { ...type.small, color: colors.ink3 },
  link: { ...type.small, color: colors.accentHover },
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
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space(2) },
  switchLabel: { ...type.body, color: colors.ink, flex: 1 },
  segment: { flexDirection: "row", borderWidth: 1, borderColor: colors.line, borderRadius: radius.control, overflow: "hidden" },
  segmentItem: { flex: 1, paddingVertical: space(3), alignItems: "center" },
  segmentActive: { backgroundColor: colors.card },
});
