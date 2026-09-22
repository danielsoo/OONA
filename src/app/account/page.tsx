"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import AppPageShell from "@/components/layout/AppPageShell";
import AccountProfileContent from "@/components/account/AccountProfileContent";
import UiText from "@/components/i18n/UiText";

function AccountProfileFallback() {
  const { t } = useTranslations();
  return <p className="text-xiio-muted py-8 text-center">{t("common.loading")}</p>;
}

export default function AccountPage() {
  const { user } = useAuth();
  const { t } = useTranslations();

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-xiio-bg text-xiio-muted">
        <Link href="/login" className="text-xiio-accent hover:underline">
          {t("common.loginRequired")}
        </Link>
      </main>
    );
  }

  return (
    <AppPageShell className="!bg-[#020a12] !pt-0" contentClassName="!max-w-[1520px]">
      <header className="mb-8 flex h-16 items-center justify-center border-b border-[#183145] text-[15px] text-white/80"><UiText text={"Account & Settings"} /></header>
      <Suspense fallback={<AccountProfileFallback />}>
        <AccountProfileContent />
      </Suspense>
    </AppPageShell>
  );
}
