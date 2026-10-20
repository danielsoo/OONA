import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import AppShell from "@/components/layout/AppShell";
import { DEFAULT_HOME_HERO_THEME } from "@/lib/homeHeroColors";
import { LOCALE_BOOT_SCRIPT } from "@/i18n/locale-boot";
import { HOME_INTRO_BOOT_SCRIPT } from "@/components/home/intro-boot";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OONA — The next generation content platform",
  description: "Films, series, shows, and emerging creators — all in one cinematic platform.",
};

/**
 * The stylesheets are render-blocking, so until they arrive the browser has
 * nothing but its own default — white, on a site that is dark everywhere and
 * opens on a dark intro. Declaring the scheme in the markup makes that first
 * moment dark instead; globals.css says the same once it lands.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#0b0b0d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The boot scripts may set lang, data-locale-pending and
    // data-home-intro-pending before React hydrates.
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: HOME_INTRO_BOOT_SCRIPT }} />
      </head>
      <body className={`font-sans ${playfair.variable} ${inter.variable} min-w-[360px]`}>
        <Providers initialHomeTheme={DEFAULT_HOME_HERO_THEME}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
