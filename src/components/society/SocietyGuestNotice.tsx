"use client";

import Link from "next/link";
import { useTranslations } from "@/context/LocaleContext";

/** Public browsing stays available; only an explicit sign-in link leaves the page. */
export default function SocietyGuestNotice({ returnTo = "/society" }: { returnTo?: string }) {
  const { t } = useTranslations();
  return (
    <div className="mx-auto my-5 flex max-w-[1540px] flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
      <p className="text-white/65">{t("society.guest.browseHint")}</p>
      <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className="shrink-0 text-xiio-accent hover:underline">
        {t("auth.login.submit")}
      </Link>
    </div>
  );
}
