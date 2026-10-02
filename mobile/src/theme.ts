/** Design tokens from the website's tailwind.config.ts (XIIO tokens). */
export const colors = {
  bg: "#0b0b0d",
  surface: "#111114",
  card: "#16161a",
  tabBar: "#020a12",
  tabBorder: "#223746",
  accent: "#3D7DFF",
  accentHover: "#5c92ff",
  tabActive: "#6dd8ff",
  gold: "#e3c483",
  success: "#7fd99a",
  destructive: "#ff8080",
  ink: "#f5f4f2",
  ink2: "rgba(245,244,242,0.72)",
  ink3: "rgba(245,244,242,0.5)",
  ink4: "rgba(245,244,242,0.32)",
  line: "rgba(255,255,255,0.08)",
  lineStrong: "rgba(255,255,255,0.16)",
} as const;

/** Type scale: display 64 · h1 36 · h2 22 · h3 17 · body 15 · small 13 · micro 12. */
export const type = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: "600" as const },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: "600" as const },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: "600" as const },
  h3: { fontSize: 17, lineHeight: 24, fontWeight: "600" as const },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 19 },
  micro: { fontSize: 12, lineHeight: 16, letterSpacing: 1.4 },
};

export const radius = { control: 8, card: 12 } as const;
export const space = (n: number) => n * 4;
