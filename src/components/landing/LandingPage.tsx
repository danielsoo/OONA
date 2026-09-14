"use client";

import Image from "next/image";
import Link from "next/link";
import XiioWordmark from "@/components/layout/XiioWordmark";
import { useTranslations } from "@/context/LocaleContext";
import homeHeroImage from "../../../home_hero.webp";

const FEATURES = [
  {
    titleKey: "landing.feature1Title",
    bodyKey: "landing.feature1Body",
    shape: (
      <div className="w-11 h-11 rounded-xl border border-xiio-accent/40 bg-xiio-accent/10" />
    ),
  },
  {
    titleKey: "landing.feature2Title",
    bodyKey: "landing.feature2Body",
    shape: (
      <div className="w-11 h-11 rounded-full border border-xiio-gold/40 bg-xiio-gold/10" />
    ),
  },
  {
    titleKey: "landing.feature3Title",
    bodyKey: "landing.feature3Body",
    shape: <div className="w-11 h-11 rotate-45 border border-white/30 bg-white/[0.06]" />,
  },
] as const;

export default function LandingPage() {
  const { t } = useTranslations();

  return (
    <div className="min-h-screen bg-[#08080a] text-[#f5f4f2]">
      <header className="sticky top-0 z-30 bg-gradient-to-b from-[#08080a]/90 to-transparent">
        <div className="flex items-center justify-between px-6 sm:px-14 py-6">
          <XiioWordmark className="!h-[22px]" />
          <nav className="hidden md:flex items-center gap-10 text-sm text-white/60">
            <span>{t("landing.navForCreators")}</span>
            <span>{t("landing.navForStudios")}</span>
            <span>{t("landing.navUniversityProgram")}</span>
            <Link
              href="/login"
              className="inline-flex items-center rounded-full border border-white/30 text-[#f5f4f2] text-sm font-medium px-5 py-2.5 hover:bg-white/[0.06] transition"
            >
              {t("landing.signIn")}
            </Link>
          </nav>
          <Link
            href="/login"
            className="md:hidden inline-flex items-center rounded-full border border-white/30 text-[#f5f4f2] text-sm font-medium px-4 py-2 hover:bg-white/[0.06] transition"
          >
            {t("landing.signIn")}
          </Link>
        </div>
      </header>

      <section className="relative isolate flex min-h-[92vh] sm:min-h-[680px] w-full flex-col overflow-hidden -mt-[76px] pt-[76px]">
        <Image
          src={homeHeroImage}
          alt="A lighthouse standing in a stormy sea"
          fill
          priority
          unoptimized
          placeholder="blur"
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,10,0.92)_0%,rgba(8,8,10,0.62)_42%,rgba(8,8,10,0.1)_74%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,10,0.18)_0%,rgba(8,8,10,0.08)_52%,#08080a_100%)]" />
        <div className="relative z-10 flex flex-1 items-center px-6 sm:px-14">
          <div className="max-w-[760px]">
            <p className="text-[13px] font-bold tracking-[0.18em] text-xiio-accent uppercase mb-6">
              {t("landing.eyebrow")}
            </p>
            <h1 className="font-serif text-[clamp(2.5rem,7vw,5rem)] font-semibold leading-[1.05] tracking-tight mb-7">
              {t("landing.heroTitle")}
            </h1>
            <p className="text-[clamp(0.95rem,1.5vw,1.1875rem)] leading-relaxed text-white/60 max-w-[560px] mb-10">
              {t("landing.heroSubtitle")}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center rounded-full bg-[#f5f4f2] text-[#0b0b0d] font-semibold px-[30px] py-4 text-[15px] hover:bg-white/90 transition"
              >
                {t("landing.ctaPrimary")}
              </Link>
              <Link
                href="/uploader/upload"
                className="inline-flex items-center rounded-full border border-white/30 text-[#f5f4f2] font-medium px-[30px] py-4 text-[15px] hover:bg-white/[0.06] transition"
              >
                {t("landing.ctaSecondary")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 sm:px-14 py-16 sm:py-[120px]">
        <div className="grid gap-10 sm:gap-12 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.titleKey}>
              <div className="mb-6">{f.shape}</div>
              <h3 className="font-serif text-2xl font-semibold mb-3">{t(f.titleKey)}</h3>
              <p className="text-[15px] leading-relaxed text-white/55">{t(f.bodyKey)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 sm:px-14 pb-20 sm:pb-[140px]">
        <div className="border-t border-white/10 pt-16 flex flex-wrap items-center justify-between gap-10">
          <div className="max-w-[520px]">
            <h2 className="font-serif text-2xl sm:text-[32px] font-semibold mb-3.5">
              {t("landing.universityTitle")}
            </h2>
            <p className="text-[15px] leading-relaxed text-white/55">{t("landing.universityBody")}</p>
          </div>
          <Link
            href="/schools"
            className="shrink-0 whitespace-nowrap inline-flex items-center rounded-full border border-white/30 text-[#f5f4f2] font-medium px-[26px] py-3.5 text-sm hover:bg-white/[0.06] transition"
          >
            {t("landing.universityCta")}
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.08]">
        <div className="px-6 sm:px-14 py-8 flex items-center justify-between text-[13px] text-white/35">
          <span>© {new Date().getFullYear()} OONA</span>
          <span>{t("landing.footerLegal")}</span>
        </div>
      </footer>
    </div>
  );
}
