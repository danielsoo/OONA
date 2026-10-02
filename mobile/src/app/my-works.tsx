import { Image } from "expo-image";
import { router, Stack } from "expo-router";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
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

/** My works (website /uploader/works, GET /api/me/works). */
export default function MyWorksScreen() {
  const { user } = useAuth();
  const { t } = useLocale();
  const works = useApi(user ? `my-works:${user.uid}` : null, async () => {
    const data = await apiFetch<{ works?: WorkListItem[] }>("/api/me/works", { auth: "required" });
    return data.works ?? [];
  });

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

  return (
    <>
      <Stack.Screen options={{ title: t("myWorks.title") }} />
      <FlatList
        style={{ backgroundColor: colors.bg }}
        data={works.data ?? []}
        keyExtractor={(w) => w.id}
        contentContainerStyle={{ padding: space(4), gap: space(3) }}
        refreshControl={<RefreshControl refreshing={works.loading} onRefresh={works.refresh} tintColor={colors.ink2} />}
        ListHeaderComponent={
          <Button label={t("myWorks.uploadNew")} onPress={() => router.push("/upload")} style={{ marginBottom: space(2) }} />
        }
        ListEmptyComponent={<Message title={t("myWorks.empty")} />}
        renderItem={({ item }) => {
          const thumb = thumbnailFor(item);
          const published = item.platformStatus === "published";
          return (
            <Pressable
              onPress={() => published && router.push(`/watch/${user.uid}/${item.id}`)}
              onLongPress={() => (item.platformStatus === "draft" || item.platformStatus === "rejected") && remove(item)}
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
              </View>
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
});
