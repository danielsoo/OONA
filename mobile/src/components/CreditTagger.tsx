import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { WORK_CREDIT_ROLES, type WorkCreditRole } from "@/types/credits";
import { useLocale } from "~/lib/locale";
import { searchUsersByHandle, type CreditDraft, type HandleSearchResult, type InviteDraft } from "~/lib/upload";
import { colors, radius, space, type } from "~/theme";

/**
 * Tag collaborators by @handle, or invite people without an account by email.
 * Same model as the website's CreditTagInput: tagged users go into the upload
 * request, email invites are sent once the work exists.
 */
export function CreditTagger({
  credits,
  invites,
  onChangeCredits,
  onChangeInvites,
}: {
  credits: CreditDraft[];
  invites: InviteDraft[];
  onChangeCredits: (next: CreditDraft[]) => void;
  onChangeInvites: (next: InviteDraft[]) => void;
}) {
  const { t } = useLocale();
  const [role, setRole] = useState<WorkCreditRole>("actor");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HandleSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim().replace(/^@/, "");
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchUsersByHandle(q)
        .then((items) => !cancelled && setResults(items))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setSearching(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function add(user: HandleSearchResult) {
    if (credits.some((c) => c.userId === user.uid && c.role === role)) return;
    onChangeCredits([...credits, { userId: user.uid, handle: user.handle, displayName: user.displayName, role }]);
    setQuery("");
    setResults([]);
  }

  function addInvite() {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError(t("network.credits.invite.invalidEmail"));
      return;
    }
    setEmailError(null);
    if (!invites.some((i) => i.email === trimmed && i.role === role)) onChangeInvites([...invites, { email: trimmed, role }]);
    setEmail("");
  }

  return (
    <View style={{ gap: space(3) }}>
      <Text style={styles.hint}>{t("network.credits.hint")}</Text>

      <Text style={styles.label}>{t("network.credits.roleLabel")}</Text>
      <View style={styles.chips}>
        {WORK_CREDIT_ROLES.map((r) => (
          <Pressable key={r} onPress={() => setRole(r)} style={[styles.chip, role === r && styles.chipActive]}>
            <Text style={[styles.chipText, role === r && { color: colors.ink }]}>{t(`network.credits.role.${r}`)}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t("network.credits.searchPlaceholder")}
        placeholderTextColor={colors.ink4}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      {searching ? <Text style={styles.hint}>{t("network.credits.searching")}</Text> : null}
      {results.map((u) => (
        <Pressable key={u.uid} onPress={() => add(u)} style={styles.result}>
          <Text style={styles.resultName}>{u.displayName}</Text>
          <Text style={styles.hint}>@{u.handle}</Text>
        </Pressable>
      ))}
      {!searching && query.trim().length >= 2 && results.length === 0 ? (
        <Text style={styles.hint}>{t("network.credits.addNoResults")}</Text>
      ) : null}

      {credits.map((c, i) => (
        <View key={`${c.userId}:${c.role}`} style={styles.row}>
          <Text style={styles.rowText}>
            {c.displayName} · @{c.handle} · {t(`network.credits.role.${c.role}`)}
          </Text>
          <Text style={styles.remove} onPress={() => onChangeCredits(credits.filter((_, j) => j !== i))}>
            {t("network.credits.remove")}
          </Text>
        </View>
      ))}

      <Text style={[styles.label, { marginTop: space(4) }]}>{t("network.credits.invite.sectionTitle")}</Text>
      <Text style={styles.hint}>{t("network.credits.invite.hint")}</Text>
      <View style={{ flexDirection: "row", gap: space(2) }}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t("network.credits.invite.emailPlaceholder")}
          placeholderTextColor={colors.ink4}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, { flex: 1 }]}
        />
        <Pressable onPress={addInvite} style={styles.addButton}>
          <Text style={styles.addText}>{t("network.credits.add")}</Text>
        </Pressable>
      </View>
      {emailError ? <Text style={styles.error}>{emailError}</Text> : null}
      {invites.map((inv, i) => (
        <View key={`${inv.email}:${inv.role}`} style={styles.row}>
          <Text style={styles.rowText}>
            {inv.email} · {t(`network.credits.role.${inv.role}`)}
          </Text>
          <Text style={styles.remove} onPress={() => onChangeInvites(invites.filter((_, j) => j !== i))}>
            {t("network.credits.remove")}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...type.small, color: colors.ink2 },
  hint: { ...type.small, color: colors.ink3 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: "rgba(61,125,255,0.12)" },
  chipText: { ...type.small, color: colors.ink2 },
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
  result: { paddingVertical: space(2), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  resultName: { ...type.body, color: colors.ink },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space(2),
    padding: space(3),
    borderRadius: radius.control,
    backgroundColor: colors.card,
  },
  rowText: { ...type.small, color: colors.ink, flex: 1 },
  remove: { ...type.small, color: colors.destructive },
  addButton: {
    borderRadius: radius.control,
    backgroundColor: colors.card,
    paddingHorizontal: space(4),
    justifyContent: "center",
  },
  addText: { ...type.small, color: colors.ink },
  error: { ...type.small, color: colors.destructive },
});
