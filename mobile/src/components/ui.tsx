import { Image } from "expo-image";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";
import { colors, radius, space, type } from "~/theme";

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        (pressed || disabled) && { opacity: 0.7 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <Text style={[styles.buttonLabel, !primary && { color: colors.ink }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Avatar({ uri, name, size = 40 }: { uri?: string | null; name?: string; size?: number }) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
  ) : (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarInitial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

export function Centered({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.centered, style]}>{children}</View>;
}

export function Loading() {
  return (
    <Centered>
      <ActivityIndicator color={colors.ink2} />
    </Centered>
  );
}

export function Message({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <Centered style={{ gap: space(3), padding: space(8) }}>
      <Text style={[type.h3, { color: colors.ink, textAlign: "center" }]}>{title}</Text>
      {body ? <Text style={[type.body, { color: colors.ink3, textAlign: "center" }]}>{body}</Text> : null}
      {children}
    </Centered>
  );
}

export const textStyles = StyleSheet.create<Record<string, TextStyle>>({
  primary: { color: colors.ink },
  secondary: { color: colors.ink2 },
  tertiary: { color: colors.ink3 },
});

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space(4),
    marginBottom: space(3),
  },
  sectionTitle: { ...type.h3, color: colors.ink },
  button: {
    minHeight: 48,
    borderRadius: radius.control,
    paddingHorizontal: space(5),
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: { borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  buttonLabel: { ...type.body, fontWeight: "600", color: "#ffffff" },
  avatarFallback: { backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: colors.ink2, fontWeight: "600" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
});
