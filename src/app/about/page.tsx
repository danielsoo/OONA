"use client";

import AppPageShell from "@/components/layout/AppPageShell";
import { ButtonLink } from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { UPLOAD_HREF } from "@/lib/appNav";

export default function AboutPage() {
  const { t } = useTranslations();
  const { user } = useAuth();

  return (
    <AppPageShell>
      <PageHeader title={t("about.title")} description={t("about.lead")} className="!pt-4 lg:!pt-8">
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/movies" variant="primary" size="md">
            {t("ui.home.browseCta")}
          </ButtonLink>
          <ButtonLink href={user ? UPLOAD_HREF : "/login"} variant="secondary" size="md">
            {t("ui.home.uploadCta")}
          </ButtonLink>
        </div>
      </PageHeader>

      <section id="campus" className="max-w-3xl rounded-card border border-line bg-white/[0.02] p-6">
        <h2 className="text-h3 font-semibold text-ink">{t("about.campusTitle")}</h2>
        <p className="mt-2 text-body text-ink-2">{t("about.campusBody")}</p>
      </section>
    </AppPageShell>
  );
}
