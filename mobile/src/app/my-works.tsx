import { Image } from "expo-image";
import { router, Stack } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import type { WorkListItem } from "@/types/work";
import { SignInPrompt } from "~/components/SignInPrompt";
import { Button, Loading, Message } from "~/components/ui";
import { apiFetch } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";
import { colors, radius, space, type } from "~/theme";

/** Same rule as the website's thumbnailForWork (src/lib/works/my-works-ui.ts). */
function thumbnailFor(work: WorkListItem): string | null {
  return (work.promo?.thumbnailUrl ?? work.promoDraft?.thumbnailUrl ?? null)?.trim() || null;
}

/**
 * My works (website /uploader/works, GET /api/me/works): open, edit, delete
 * drafts, request removal of published works, and reorder.
 */
export default function MyWorksScreen() {
  const { user } = useAuth();
  const { t, ui } = useLocale();
  const [ordering, setOrdering] = useState(false);
  const [order, setOrder] = useState<WorkListItem[]>([]);
  const [removal, setRemoval] = useState<WorkListItem | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const works = useApi(user ? `my-works:${user.uid}` : null, async () => {
    const data = await apiFetch<{ works?: WorkListItem[] }>("/api/me/works", { auth: "required" });
    return data.works ?? [];
  });

  useEffect(() => {
    if (!ordering) setOrder(works.data ?? []);
  }, [works.data, ordering]);

  if (!user) return <SignInPrompt />;
  if (works.loading && !works.data) return <Loading />;
  if (works.error && !works.data) return <Message title={t("common.retry")} body={works.error.message} />;

  function remove(work: WorkListItem) {
    const draft = work.platformStatus === "draft";
    Alert.alert(t(draft ? "myWorks.draftDeleteConfirm" : "myWorks.confirmDelete"), work.title, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t(draft ? "myWorks.deleteDraft" : "myWorks.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/api/me/works/${work.id}`, { method: "DELETE", auth: "required" });
            await works.refresh();
          } catch (err) {
            Alert.alert((err as Error).message);
          }
        },
      },
    ]);
  }

  function move(index: number, delta: number) {
    const next = [...order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  async function finishOrdering() {
    setBusy(true);
    try {
      await apiFetch("/api/me/works/reorder", { method: "PATCH", auth: "required", json: { workIds: order.map((w) => w.id) } });
      setOrdering(false);
      await works.refresh();
    } catch (err) {
      Alert.alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitRemoval() {
    if (!removal || !reason.trim()) return;
    setBusy(true);
    try {
      await apiFetch(`/api/me/works/${removal.id}/deletion-request`, { method: "POST", auth: "required", json: { reason: reason.trim() } });
      setRemoval(null);
      setReason("");
      Alert.alert(t("myWorks.deletionRequested"));
      await works.refresh();
    } catch (err) {
      Alert.alert((err as Error).message || t("myWorks.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  function publishedActions(work: WorkListItem) {
    Alert.alert(work.title, undefined, [
      { text: t("myWorks.editVideo"), onPress: () => router.push(`/edit-work/${work.id}`) },
      { text: t("myWorks.requestRemoval"), style: "destructive", onPress: () => setRemoval(work) },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t("myWorks.title"),
          headerRight: () =>
            (works.data?.length ?? 0) > 1 ? (
              <Text
                onPress={() => (ordering ? void finishOrdering() : setOrdering(true))}
                style={{ ...type.small, color: colors.accentHover, opacity: busy ? 0.5 : 1 }}
              >
                {ordering ? t("promoEditor.submitProgress.done") : ui("Reorder")}
              </Text>
            ) : null,
        }}
      />
      <Modal visible={removal !== null} transparent animationType="fade" onRequestClose={() => setRemoval(null)}>
        <View style={styles.scrim}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{t("myWorks.requestRemoval")}</Text>
            <Text style={styles.meta}>{removal?.title}</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={t("myWorks.deletionReasonPrompt")}
              placeholderTextColor={colors.ink4}
              maxLength={500}
              multiline
              style={styles.input}
            />
            <Button variant="secondary" label={t("myWorks.requestRemoval")} loading={busy} disabled={busy || !reason.trim()} onPress={submitRemoval} />
            <Button variant="secondary" label={t("common.cancel")} onPress={() => setRemoval(null)} />
          </View>
        </View>
      </Modal>
      <FlatList
        style={{ backgroundColor: colors.bg }}
        data={ordering ? order : works.data ?? []}
        keyExtractor={(w) => w.id}
        contentContainerStyle={{ padding: space(4), gap: space(3) }}
        refreshControl={<RefreshControl refreshing={works.loading} onRefresh={works.refresh} tintColor={colors.ink2} />}
        ListHeaderComponent={
          <View style={{ gap: space(2), marginBottom: space(2) }}>
            <Button label={t("myWorks.uploadNew")} onPress={() => router.push("/upload")} />
            <Button variant="secondary" label={t("myWorks.viewAnalytics")} onPress={() => router.push("/analytics")} />
          </View>
        }
        ListEmptyComponent={<Message title={t("myWorks.empty")} />}
        renderItem={({ item, index }) => {
          const thumb = thumbnailFor(item);
          const published = item.platformStatus === "published";
          return (
            <Pressable
              onPress={() => !ordering && published && router.push(`/watch/${user.uid}/${item.id}`)}
              delayLongPress={350}
              onLongPress={() => {
                if (ordering) return;
                if (item.platformStatus === "draft" || item.platformStatus === "rejected") remove(item);
                else if (published) publishedActions(item);
              }}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
            >
              {thumb ? <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" /> : <View style={styles.thumb} />}
              <View style={{ flex: 1, gap: space(1) }}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title || t("myWorks.untitledDraft")}
                </Text>
                <Text style={[styles.status, published && { color: colors.success }]}>
                  {t(`myWorks.status.${item.platformStatus}`)}
                  {item.streamStatus && item.streamStatus !== "ready" ? ` · ${t(`myWorks.stream.${item.streamStatus}`)}` : ""}
                </Text>
                {published && item.viewCount != null ? (
                  <Text style={styles.meta}>{t("myWorks.statsFullViews", { count: item.viewCount })}</Text>
                ) : null}
                {published ? (
                  <Text style={styles.edit} onPress={() => router.push(`/edit-work/${item.id}`)}>
                    {t("myWorks.editVideo")}
                  </Text>
                ) : null}
              </View>
              {ordering ? (
                <View style={{ justifyContent: "center", gap: space(2) }}>
                  <Pressable onPress={() => move(index, -1)} hitSlop={8} accessibilityRole="button" accessibilityLabel={ui("Move up")} disabled={index === 0}>
                    <Ionicons name="chevron-up" size={24} color={index === 0 ? colors.ink4 : colors.ink} />
                  </Pressable>
                  <Pressable
                    onPress={() => move(index, 1)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={ui("Move down")}
                    disabled={index === order.length - 1}
                  >
                    <Ionicons name="chevron-down" size={24} color={index === order.length - 1 ? colors.ink4 : colors.ink} />
                  </Pressable>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space(3), padding: space(3), borderRadius: radius.card, backgroundColor: colors.surface },
  thumb: { width: 120, aspectRatio: 16 / 9, borderRadius: radius.control, backgroundColor: colors.card },
  title: { ...type.body, color: colors.ink, fontWeight: "500" },
  status: { ...type.small, color: colors.ink3 },
  meta: { ...type.small, color: colors.ink4 },
  edit: { ...type.small, color: colors.accentHover, marginTop: space(1) },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: space(6) },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.card, padding: space(4), gap: space(3) },
  input: {
    ...type.body,
    color: colors.ink,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    padding: space(3),
    minHeight: 96,
    textAlignVertical: "top",
  },
});
