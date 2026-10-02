import { Image } from "expo-image";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, space, type } from "~/theme";
import { SectionTitle } from "~/components/ui";

export type RailItem = {
  key: string;
  ownerUid: string;
  workId: string;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string | null;
  /** 0–100, draws a progress bar (Continue Watching). */
  progressPercent?: number;
};

const CARD_WIDTH = 220;

export function WorkCard({ item, width = CARD_WIDTH }: { item: RailItem; width?: number | "100%" }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={() => router.push(`/watch/${item.ownerUid}/${item.workId}`)}
      style={({ pressed }) => [{ width }, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.thumbWrap}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]} />
        )}
        {item.progressPercent != null ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, item.progressPercent))}%` }]} />
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
      {item.subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function WorkRail({ title, items }: { title: string; items: RailItem[] }) {
  if (items.length === 0) return null;
  return (
    <View style={{ marginBottom: space(7) }}>
      <SectionTitle>{title}</SectionTitle>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <WorkCard item={item} />}
        contentContainerStyle={{ paddingHorizontal: space(4), gap: space(3) }}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  thumbWrap: { borderRadius: radius.card, overflow: "hidden", backgroundColor: colors.card },
  thumb: { width: "100%", aspectRatio: 16 / 9 },
  thumbEmpty: { backgroundColor: colors.card },
  progressTrack: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3, backgroundColor: colors.lineStrong },
  progressFill: { height: 3, backgroundColor: colors.accent },
  title: { ...type.body, color: colors.ink, marginTop: space(2), fontWeight: "500" },
  subtitle: { ...type.small, color: colors.ink3 },
});
