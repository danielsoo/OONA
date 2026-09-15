"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { DmInboxProvider } from "@/components/messages/DmInboxContext";
import DmInboxLayout from "@/components/messages/DmInboxLayout";
import AppPageShell from "@/components/layout/AppPageShell";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";

export default function MessagesLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useTranslations();

  if (!user) {
    return (
      <main className="h-[calc(100dvh-60px-64px-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-60px)] flex items-center justify-center overflow-hidden bg-xiio-bg">
        <Link href="/login" className="text-xiio-accent hover:underline">
          {t("common.loginRequired")}
        </Link>
      </main>
    );
  }

  return (
    <AppPageShell fitViewport className="!pt-0 !px-0" contentClassName="h-full max-w-none">
      <DmInboxProvider>
        <DmInboxLayout>{children}</DmInboxLayout>
      </DmInboxProvider>
    </AppPageShell>
  );
}
