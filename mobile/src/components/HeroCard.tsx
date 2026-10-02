import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CatalogFeedItem } from "@/types/work";
import { itemMeta } from "~/lib/catalog";
import { useLocale } from "~/lib/locale";
import { colors, radius, space, type } from "~/theme";

/** Large featured work with a play button (website home/browse hero). */
export function HeroCard({ item, label }: { item: CatalogFeedItem; label?: string }) {
  const { t } = useLocale();
  const meta = itemMeta(item);
  return (
    <Pressable
      onPress={() => router.push(`/watch/${item.ownerUid}/${item.workId}`)}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.9 }]}
    >
      {item.thumbnailUrl ? <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
      <View style={styles.shade} />
      <View style={styles.copy}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        <View style={styles.cta}>
          <Text style={styles.ctaText}>▶ {t("watch.playFilm")}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: space(4), aspectRatio: 4 / 5, maxHeight: 520, borderRadius: radius.card, overflow: "hidden", backgroundColor: colors.card, justifyContent: "flex-end" },
  shade: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.35)" },
  copy: { padding: space(4), gap: space(1) },
  label: { ...type.small, color: colors.accentHover, letterSpacing: 0.5 },
  title: { ...type.h1, color: colors.ink },
  meta: { ...type.small, color: colors.ink2 },
  cta: { alignSelf: "flex-start", marginTop: space(3), backgroundColor: colors.ink, borderRadius: 999, paddingHorizontal: space(5), paddingVertical: space(2) },
  ctaText: { ...type.small, color: "#000", fontWeight: "600" },
});
