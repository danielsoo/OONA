import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "~/components/ui";
import type { PersonCard } from "~/lib/discovery";
import { colors, space, type } from "~/theme";

export function PersonRow({ person }: { person: PersonCard }) {
  return (
    <Pressable onPress={() => router.push(`/people/${person.handle}`)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View>
        <Avatar uri={person.avatarUrl} name={person.displayName} size={48} />
        {person.isOnline ? <View style={styles.online} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {person.displayName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          @{person.handle}
          {person.headline ? ` · ${person.headline}` : ""}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  online: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  name: { ...type.body, color: colors.ink, fontWeight: "500" },
  meta: { ...type.small, color: colors.ink3 },
});
