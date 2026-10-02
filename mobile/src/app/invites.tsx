import { router, Stack } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { formatDmTime } from "@/lib/dm/formatDmTime";
import type { BusinessInviteListItem } from "@/types/business-invite";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Avatar, Button, Loading, Message } from "~/components/ui";
import { apiFetch } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

type Box = "received" | "sent";
type InviteRow = BusinessInviteListItem & { createdAt: string | null; expiresAt: string | null };

/**
 * Business invites (job offers / applications). A chat opens only once the
 * recipient accepts, same gate as the website (Society > Requests / Sent).
 */
export default function InvitesScreen() {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const [box, setBox] = useState<Box>("received");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const invites = useApi(user ? `invites:${box}:${user.uid}` : null, async () => {
    const data = await apiFetch<{ invites?: InviteRow[] }>(`/api/me/business-invites?box=${box}`, { auth: "required" });
    return data.invites ?? [];
  });

  if (!user) return <SignInPrompt />;

  async function respond(invite: InviteRow, accept: boolean) {
    setBusyId(invite.id);
    setError(null);
    try {
      if (accept) {
        const res = await apiFetch<{ threadId?: string }>(`/api/me/business-invites/${invite.id}/accept`, { method: "POST", auth: "required" });
        if (res.threadId) router.push(`/messages/${res.threadId}`);
      } else {
        await apiFetch(`/api/me/business-invites/${invite.id}/decline`, { method: "POST", auth: "required" });
      }
      await invites.refresh();
    } catch (err) {
      setError((err as Error).message || t("dm.invites.errorGeneric"));
    } finally {
      setBusyId(null);
    }
  }

  const statusLabel: Record<string, string> = {
    pending: t("dm.invites.pending"),
    accepted: t("dm.invites.accepted"),
    declined: t("dm.invites.declined"),
    expired: t("dm.invites.expired"),
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: t("society.tabRequests") }} />
      <View style={styles.tabs}>
        {(["received", "sent"] as const).map((b) => (
          <Pressable key={b} onPress={() => setBox(b)} style={[styles.tab, box === b && styles.tabActive]}>
            <Text style={[styles.tabText, box === b && { color: colors.ink }]}>
              {t(b === "received" ? "dm.invites.receivedTab" : "dm.invites.sentTab")}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {invites.loading && !invites.data ? (
        <Loading />
      ) : (
        <FlatList
          data={invites.data ?? []}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: space(4), gap: space(3) }}
          refreshControl={<RefreshControl refreshing={invites.loading} onRefresh={invites.refresh} tintColor={colors.ink2} />}
          ListEmptyComponent={<Message title={t(box === "received" ? "dm.invites.emptyReceived" : "dm.invites.emptySent")} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable style={styles.head} onPress={() => item.otherHandle && router.push(`/people/${item.otherHandle}`)}>
                <Avatar uri={item.otherAvatarUrl} name={item.otherDisplayName} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.otherDisplayName}</Text>
                  <Text style={styles.meta}>
                    {t(item.direction === "application" ? "dm.invites.badgeApplication" : "dm.invites.badgeOffer")} ·{" "}
                    {formatDmTime(item.createdAt, locale)}
                  </Text>
                </View>
                <Text style={styles.status}>{statusLabel[item.status] ?? item.status}</Text>
              </Pressable>
              {item.projectTitle || item.role ? (
                <Text style={styles.body}>{[item.projectTitle, item.role].filter(Boolean).join(" · ")}</Text>
              ) : null}
              {item.message ? <Text style={styles.body}>{item.message}</Text> : null}
              {box === "received" && item.status === "pending" ? (
                <View style={styles.actions}>
                  <Button
                    variant="secondary"
                    label={busyId === item.id ? t("dm.invites.declining") : t("dm.invites.decline")}
                    disabled={busyId !== null}
                    onPress={() => respond(item, false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label={busyId === item.id ? t("dm.invites.accepting") : t("dm.invites.accept")}
                    disabled={busyId !== null}
                    onPress={() => respond(item, true)}
                    style={{ flex: 1 }}
                  />
                </View>
              ) : null}
              {item.status === "accepted" && item.threadId ? (
                <Button variant="secondary" label={t("dm.invites.goToChat")} onPress={() => router.push(`/messages/${item.threadId}`)} />
              ) : null}
            </View>
          )}
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
  card: { gap: space(3), padding: space(4), borderRadius: radius.card, backgroundColor: colors.surface },
  head: { flexDirection: "row", alignItems: "center", gap: space(3) },
  name: { ...type.body, color: colors.ink, fontWeight: "500" },
  meta: { ...type.small, color: colors.ink3 },
  status: { ...type.small, color: colors.ink2 },
  body: { ...type.body, color: colors.ink2 },
  actions: { flexDirection: "row", gap: space(3) },
  error: { ...type.small, color: colors.destructive, padding: space(4) },
});
