"use client";

import Link from "next/link";
import { useTranslations } from "@/context/LocaleContext";
import { POPULAR_INTERESTS } from "@/lib/societyMockData";
import { DEMO_MODE } from "@/lib/demoMode";
import { buttonClass } from "@/components/ui/Button";

export default function SocietyRightRail() {
  const { t } = useTranslations();

  return (
    <aside className="flex w-full flex-col gap-0 border-t border-white/10 pt-7 xl:w-[390px] xl:shrink-0 xl:border-l xl:border-t-0 xl:pl-9 xl:pt-0">
      <div className="border-b border-white/10 pb-8">
        <h2 className="text-h3 font-semibold text-ink">{t("society.ctaTitle")}</h2>
        <p className="mt-2 text-small text-ink-3">{t("society.ctaBody")}</p>
        <Link
          href="/society?tab=discover"
          prefetch={false}
          className={buttonClass({ variant: "accent", size: "md", className: "mt-5" })}
        >
          {t("society.ctaButton")}
        </Link>
      </div>

      <div className="pt-8">
        <h3 className="text-h3 font-semibold text-ink">{t("society.popularInterests")}</h3>
        <ul className="mt-4 space-y-3">
          {POPULAR_INTERESTS.map((item) => (
            <li key={item.tag} className="flex items-center justify-between gap-3 text-small">
              <span className="text-ink-2"># {item.tag}</span>
              {DEMO_MODE ? <span className="shrink-0 text-ink-4 tabular-nums">{item.count}</span> : null}
            </li>
          ))}
        </ul>
        <Link
          href="/society?tab=discover"
          prefetch={false}
          className="mt-4 inline-flex items-center gap-1 text-xs text-xiio-accent hover:underline"
        >
          {t("society.viewAllInterests")}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </aside>
  );
}
