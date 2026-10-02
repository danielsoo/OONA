import { Image } from "expo-image";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { PromoFeedItem } from "@/types/work";
import { Avatar, SectionTitle } from "~/components/ui";
import type { PersonCard } from "~/lib/discovery";
import { colors, radius, space, type } from "~/theme";

/** 9:16 shorts thumbnails; tapping opens the Discover pager. */
export function ShortsRail({ title, items }: { title: string; items: PromoFeedItem[] }) {
  if (items.length === 0) return null;
  return (
    <View style={{ marginBottom: space(7) }}>
      <SectionTitle>{title}</SectionTitle>
      <FlatList
        horizontal
        data={items.slice(0, 12)}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: space(4), gap: space(3) }}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push("/discover")} accessibilityRole="button" accessibilityLabel={item.title} style={styles.short}>
            {item.thumbnailUrl ? <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
            <View style={styles.shortShade}>
              <Text style={styles.shortTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

/** Round avatars of creators, linking to their profiles. */
export function CreatorsRail({ title, people, onSeeAll, seeAllLabel }: { title: string; people: PersonCard[]; onSeeAll: () => void; seeAllLabel: string }) {
  if (people.length === 0) return null;
  return (
    <View style={{ marginBottom: space(7) }}>
      <SectionTitle
        action={
          <Text onPress={onSeeAll} style={styles.seeAll} accessibilityRole="link">
            {seeAllLabel}
          </Text>
        }
      >
        {title}
      </SectionTitle>
      <FlatList
        horizontal
        data={people.slice(0, 12)}
        keyExtractor={(p) => p.uid}
        contentContainerStyle={{ paddingHorizontal: space(4), gap: space(4) }}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/people/${item.handle}`)} accessibilityRole="button" accessibilityLabel={item.displayName} style={styles.creator}>
            <Avatar uri={item.avatarUrl} name={item.displayName} size={64} />
            <Text style={styles.creatorName} numberOfLines={1}>
              {item.displayName}
            </Text>
            {item.roleTags[0] ? <Text style={styles.creatorRole}>{item.roleTags[0]}</Text> : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  short: { width: 120, aspectRatio: 9 / 16, borderRadius: radius.card, overflow: "hidden", backgroundColor: colors.card, justifyContent: "flex-end" },
  shortShade: { padding: space(2), backgroundColor: "rgba(0,0,0,0.4)" },
  shortTitle: { ...type.small, color: colors.ink, fontWeight: "500" },
  creator: { width: 76, alignItems: "center", gap: space(1) },
  creatorName: { ...type.small, color: colors.ink, textAlign: "center" },
  creatorRole: { ...type.small, fontSize: 11, color: colors.ink3 },
  seeAll: { ...type.small, color: colors.accentHover },
});
