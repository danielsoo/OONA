import type { Config } from "tailwindcss";

/**
 * XIIO design tokens.
 *
 * Type scale (7 steps): use these instead of arbitrary `text-[13.5px]` values:
 *   text-display  64  hero titles (serif)
 *   text-h1       36  page titles without a hero (serif)
 *   text-h2       22  section titles
 *   text-h3       17  panel titles
 *   text-body     15  body copy, card titles
 *   text-small    13  metadata, helper text
 *   text-micro    12  eyebrows and badges (uppercase only at this step)
 *
 * Text colour (4 steps): text-ink (primary) · text-ink-2 (secondary) ·
 * text-ink-3 (tertiary) · text-ink-4 (disabled).
 *
 * Radius (3): rounded-control 8 · rounded-card 12 · rounded-full.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        xiio: {
          bg: "#0b0b0d",
          sidebar: "#0d0d10",
          surface: "#111114",
          card: "#16161a",
          accent: "#3D7DFF",
          "accent-hover": "#5c92ff",
          gold: "#e3c483",
          "gold-dim": "#C9A15A",
          success: "#7fd99a",
          destructive: "#ff8080",
          muted: "#b3b3b3",
        },
        ink: {
          DEFAULT: "#f5f4f2",
          2: "rgb(245 244 242 / 0.72)",
          3: "rgb(245 244 242 / 0.5)",
          4: "rgb(245 244 242 / 0.32)",
        },
        line: {
          DEFAULT: "rgb(255 255 255 / 0.08)",
          strong: "rgb(255 255 255 / 0.16)",
        },
      },
      fontSize: {
        micro: ["12px", { lineHeight: "1.4", letterSpacing: "0.12em" }],
        small: ["13px", { lineHeight: "1.5" }],
        body: ["15px", { lineHeight: "1.6" }],
        h3: ["17px", { lineHeight: "1.4" }],
        h2: ["22px", { lineHeight: "1.3" }],
        h1: ["36px", { lineHeight: "1.15" }],
        display: ["64px", { lineHeight: "1.05" }],
      },
      borderRadius: {
        control: "8px",
        card: "12px",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Pretendard",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "Malgun Gothic",
          "system-ui",
          "sans-serif",
        ],
        serif: ["var(--font-serif)", "Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
