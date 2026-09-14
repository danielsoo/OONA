"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import EmptyState from "@/components/ui/EmptyState";
import SectionHeader from "@/components/ui/SectionHeader";
import Tabs from "@/components/ui/Tabs";
import { useTranslations } from "@/context/LocaleContext";
import {
  filmingLocationFor,
  languageFor,
  productionJournalFor,
  releaseDateFor,
  reviewsFor,
} from "@/data/watchExtras";
import { DEMO_MODE } from "@/lib/demoMode";
import { formatRuntime, gradientForTitle } from "@/lib/works/catalog-ui";
import { aspectRatioMessageKey } from "@/lib/works/aspect-ratio";
import type { PublicWorkCredit } from "@/types/watch";
import type { VideoAspectRatio } from "@/types/work";

export type WatchDetailTab = "overview" | "credits" | "reviews";

type Props = {
  /** Owner of the work; reserved for per-work extras once they exist. */
  ownerUid: string;
  workId: string;
  tab: WatchDetailTab;
  onTabChange: (tab: WatchDetailTab) => void;
  /** The signed-in viewer uploaded this work. */
  isOwner: boolean;
  description?: string;
  durationSec?: number;
  approvedCategory?: string;
  approvedTags: string[];
  approvedAspectRatio?: VideoAspectRatio;
  approvedSchoolId?: string;
  approvedSchoolName?: string;
  credits: PublicWorkCredit[];
};

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-4 border-b border-line py-3 last:border-b-0">
      <dt className="text-small text-ink-3">{label}</dt>
      <dd className="min-w-0 text-small font-medium text-ink">{children}</dd>
    </div>
  );
}

/** Overview (synopsis + details) · Credits · Reviews (demo only). Nothing is repeated across tabs. */
export default function WatchDetailTabs({
  workId,
  tab,
  onTabChange,
  isOwner,
  description,
  durationSec,
  approvedCategory,
  approvedTags,
  approvedAspectRatio,
  approvedSchoolId,
  approvedSchoolName,
  credits,
}: Props) {
  const { t } = useTranslations();

  const tabs = [
    { id: "overview", label: t("watch.tabs.overview") },
    { id: "credits", label: `${t("watch.tabs.credits")}${credits.length > 0 ? ` ${credits.length}` : ""}` },
    ...(DEMO_MODE ? [{ id: "reviews", label: t("watch.tabs.reviews") }] : []),
  ];

  return (
    <section>
      <Tabs
        items={tabs}
        activeId={tab}
        onChange={(id) => onTabChange(id as WatchDetailTab)}
        ariaLabel={t("ui.watch.details")}
        className="sticky top-[60px] z-20 mb-8 bg-xiio-bg/95 pt-2 backdrop-blur-md"
      />

      {tab === "overview" ? (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-10">
            {description ? (
              <p className="max-w-[65ch] whitespace-pre-wrap text-body text-ink-2">{description}</p>
            ) : (
              <p className="text-body text-ink-3">{t("watch.tabs.overviewEmpty")}</p>
            )}

            {DEMO_MODE ? (
              <DemoExtras workId={workId} t={t} />
            ) : isOwner ? (
              <EmptyState
                title={t("ui.watch.ownerExtrasTitle")}
                body={t("ui.watch.ownerExtrasBody")}
                action={{ href: `/uploader/works/${workId}/edit`, label: t("ui.watch.ownerExtrasAction") }}
              />
            ) : null}
          </div>

          <aside aria-label={t("ui.watch.details")}>
            <h2 className="mb-2 text-h3 font-semibold text-ink">{t("ui.watch.details")}</h2>
            <dl>
              {approvedCategory ? <InfoRow label={t("watch.tabs.genre")}>{approvedCategory}</InfoRow> : null}
              {durationSec ? (
                <InfoRow label={t("watch.tabs.runtime")}>{formatRuntime(durationSec, t)}</InfoRow>
              ) : null}
              {approvedAspectRatio ? (
                <InfoRow label={t("watch.tabs.aspectRatio")}>{t(aspectRatioMessageKey(approvedAspectRatio))}</InfoRow>
              ) : null}
              {approvedSchoolId && approvedSchoolName ? (
                <InfoRow label={t("watch.tabs.school")}>
                  <Link href={`/school/${approvedSchoolId}`} className="text-xiio-accent hover:text-xiio-accent-hover">
                    {approvedSchoolName}
                  </Link>
                </InfoRow>
              ) : null}
              {DEMO_MODE ? (
                <>
                  <InfoRow label={t("watch.tabs.language")}>{languageFor(workId)}</InfoRow>
                  <InfoRow label={t("watch.tabs.releaseDate")}>{releaseDateFor(workId)}</InfoRow>
                  <InfoRow label={t("watch.tabs.filmingLocation")}>{filmingLocationFor(workId)}</InfoRow>
                </>
              ) : null}
            </dl>
            {approvedTags.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-2">
                {approvedTags.map((tag) => (
                  <li key={tag} className="rounded-full bg-white/[0.06] px-3 py-1 text-small text-ink-2">
                    #{tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </aside>
        </div>
      ) : null}

      {tab === "credits" ? (
        <div className="max-w-2xl">
          <p className="mb-4 text-small text-ink-3">{t("watch.tabs.creditsHint")}</p>
          {credits.length > 0 ? (
            <ul className="flex flex-col">
              {credits.map((c) => {
                const role = t(`watch.creditRole.${c.role}`);
                const character =
                  c.characterName && c.characterName.trim() !== c.displayName.trim()
                    ? t("ui.watch.creditAs", { name: c.characterName.trim() })
                    : null;
                const inner = (
                  <>
                    <span
                      className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-small font-semibold text-ink ${gradientForTitle(c.displayName)}`}
                      aria-hidden
                    >
                      {c.avatarUrl ? (
                        <Image src={c.avatarUrl} alt="" fill sizes="44px" unoptimized className="object-cover" />
                      ) : (
                        c.displayName.slice(0, 1).toUpperCase()
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold text-ink">{c.displayName}</span>
                      <span className="block truncate text-small text-ink-3">
                        {character ? `${role} · ${character}` : role}
                      </span>
                    </span>
                    {c.profileHref ? (
                      <span className="shrink-0 text-small font-medium text-xiio-accent">
                        {t("watch.tabs.viewProfile")} ›
                      </span>
                    ) : null}
                  </>
                );
                return (
                  <li key={c.id} className="border-b border-line last:border-b-0">
                    {c.profileHref ? (
                      <Link
                        href={c.profileHref}
                        className="flex items-center gap-3.5 px-1 py-4 transition-colors hover:bg-white/[0.03]"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3.5 px-1 py-4">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-body text-ink-3">{t("watch.tabs.creditsEmpty")}</p>
          )}
        </div>
      ) : null}

      {tab === "reviews" && DEMO_MODE ? (
        <ul className="flex max-w-2xl flex-col">
          {reviewsFor(workId).map((rv, i) => (
            <li key={i} className="border-b border-line py-5 last:border-b-0">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-body font-semibold text-ink">{rv.name}</span>
                <span className="text-small text-ink-4">{rv.time}</span>
              </div>
              <div className="mb-2.5 text-small tracking-[0.05em] text-xiio-gold">{rv.stars}</div>
              <p className="text-body text-ink-2">{rv.text}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function DemoExtras({ workId, t }: { workId: string; t: (key: string) => string }) {
  const journal = productionJournalFor(workId);
  return (
    <>
      <div>
        <SectionHeader title={t("watch.tabs.behindTheScenes")} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`aspect-[4/3] rounded-card ring-1 ring-inset ring-line ${gradientForTitle(`${workId}-bts-${i}`)}`} />
          ))}
        </div>
      </div>
      <div>
        <SectionHeader title={t("watch.tabs.productionJournal")} />
        <ul className="flex flex-col">
          {journal.map((entry, i) => (
            <li key={i} className="border-b border-line py-5 last:border-b-0">
              <p className="mb-2 text-micro font-semibold uppercase text-xiio-accent">{entry.date}</p>
              <p className="text-body text-ink-2">{entry.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
