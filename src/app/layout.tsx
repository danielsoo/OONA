import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import AppShell from "@/components/layout/AppShell";
import { DEFAULT_HOME_HERO_THEME } from "@/lib/homeHeroColors";
import { LOCALE_BOOT_SCRIPT } from "@/i18n/locale-boot";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The boot script may set lang and data-locale-pending before React hydrates.
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_BOOT_SCRIPT }} />
      </head>
      <body className={`font-sans ${playfair.variable} ${inter.variable} min-w-[360px]`}>
        <Providers initialHomeTheme={DEFAULT_HOME_HERO_THEME}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
