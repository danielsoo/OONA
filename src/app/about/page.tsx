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

  const sections = [
    {
      eyebrow: t("about.discoveryEyebrow"),
      title: t("about.discoveryTitle"),
      body: t("about.discoveryBody"),
    },
    {
      eyebrow: t("about.connectionEyebrow"),
      title: t("about.connectionTitle"),
      body: t("about.connectionBody"),
    },
    {
      eyebrow: t("about.creatorEyebrow"),
      title: t("about.creatorTitle"),
      body: t("about.creatorBody"),
    },
  ];

  return (
    <AppPageShell>
      <PageHeader
        eyebrow={t("about.eyebrow")}
        title={t("about.title")}
        description={t("about.lead")}
        className="!pt-4 lg:!pb-14 lg:!pt-8"
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/movies" variant="primary" size="md">
            {t("ui.home.browseCta")}
          </ButtonLink>
          <ButtonLink href={user ? UPLOAD_HREF : "/login"} variant="secondary" size="md">
            {t("ui.home.uploadCta")}
          </ButtonLink>
        </div>
      </PageHeader>

      <div className="border-t border-line">
        {sections.map((section, index) => (
          <section
            key={section.title}
            className="grid gap-5 border-b border-line py-10 md:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] md:gap-12 lg:py-16"
          >
            <div>
              <p className="text-micro font-semibold uppercase tracking-[0.2em] text-xiio-accent">
                {section.eyebrow}
              </p>
              <p className="mt-3 font-serif text-[22px] text-ink/35">0{index + 1}</p>
            </div>
            <div className="max-w-3xl">
              <h2 className="font-serif text-[28px] font-semibold leading-tight text-ink sm:text-h2">
                {section.title}
              </h2>
              <p className="mt-4 whitespace-pre-line text-body leading-7 text-ink-2">
                {section.body}
              </p>
            </div>
          </section>
        ))}
      </div>

      <section
        id="campus"
        className="my-10 rounded-card border border-line bg-white/[0.025] p-6 sm:p-8 lg:my-16 lg:grid lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-12 lg:p-10"
      >
        <p className="text-micro font-semibold uppercase tracking-[0.2em] text-xiio-accent">
          {t("about.campusEyebrow")}
        </p>
        <div className="mt-4 max-w-3xl lg:mt-0">
          <h2 className="font-serif text-[28px] font-semibold leading-tight text-ink sm:text-h2">
            {t("about.campusTitle")}
          </h2>
          <p className="mt-4 whitespace-pre-line text-body leading-7 text-ink-2">
            {t("about.campusBody")}
          </p>
        </div>
      </section>

      <section className="pb-8 pt-2 text-center lg:pb-16 lg:pt-6">
        <p className="text-micro font-semibold uppercase tracking-[0.2em] text-xiio-accent">
          {t("about.futureEyebrow")}
        </p>
        <h2 className="mx-auto mt-4 max-w-3xl font-serif text-[30px] font-semibold leading-tight text-ink sm:text-h1">
          {t("about.futureTitle")}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl whitespace-pre-line text-body leading-7 text-ink-2">
          {t("about.futureBody")}
        </p>
        <p className="mt-8 font-serif text-xl text-ink">{t("about.signature")}</p>
      </section>
    </AppPageShell>
  );
}
