"use client";

import { memo } from "react";
import Link from "next/link";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { useTranslations } from "@/context/LocaleContext";
import { formatLastActive } from "@/lib/formatLastActive";
import {
  mockSchoolForUid,
  mockTagsForPerson,
  primaryRoleLabelKey,
} from "@/lib/societyMockData";
import type { SocietyPerson } from "@/lib/societyTypes";
import { buttonClass } from "@/components/ui/Button";

type Props = {
  person: SocietyPerson;
  connected: boolean;
  connectBusy: boolean;
  onConnect: () => void;
};

export default memo(function SocietyCreatorRow({
  person,
  connected,
  connectBusy,
  onConnect,
}: Props) {
  const { t, locale } = useTranslations();
  const school = mockSchoolForUid(person.uid);
  const tags = mockTagsForPerson(person.uid, person.roleTags, person.headline);
  const roleKey = primaryRoleLabelKey(person.roleTags);
  const roleLabel = roleKey ? t(roleKey) : t("society.roleCrew");
  const quote =
    person.headline?.trim() ||
    person.collaborationNote?.trim() ||
    person.bio?.trim()?.slice(0, 120) ||
    "";
  const activeLabel = formatLastActive(person.lastSeenAt, locale);

  return (
    <article className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:gap-6 lg:gap-8">
      <div className="flex items-center gap-4 sm:contents">
        <Link
          href={`/people/${person.handle}`}
          prefetch={false}
          className="relative shrink-0"
          aria-label={person.displayName}
        >
          <ProfileAvatar
            displayName={person.displayName}
            avatarUrl={person.avatarUrl}
            className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/[0.05] text-xl font-bold text-white ring-1 ring-white/10 sm:h-20 sm:w-20 sm:text-2xl"
            imgClassName="h-full w-full object-cover"
          />
        </Link>

        <div className="min-w-0 flex-1 sm:w-[160px] sm:flex-none lg:w-[180px]">
          <div className="flex items-center gap-2">
            <Link
              href={`/people/${person.handle}`}
              prefetch={false}
              className="truncate text-h3 font-semibold text-ink transition-colors hover:text-xiio-accent"
            >
              {person.displayName}
            </Link>
            {person.isOnline ? (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-emerald-400"
                aria-label={t("society.online")}
              />
            ) : null}
          </div>
          <p className="mt-0.5 text-small text-ink-3">{roleLabel}</p>
          <p className="mt-0.5 truncate text-small text-ink-3">{school}</p>
        </div>
      </div>

      <div className="min-w-0 flex-1 sm:ml-10 sm:max-w-md md:ml-14 lg:ml-20 lg:max-w-lg">
        {quote ? (
          <p className="text-sm leading-relaxed text-white/55 line-clamp-2">{quote}</p>
        ) : null}
        <div className={`flex flex-wrap gap-2 ${quote ? "mt-3" : ""}`}>
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-white/10 bg-white/[0.055] px-3 py-1 text-xs text-white/60"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:min-w-[120px] sm:items-end">
        <button
          type="button"
          disabled={connectBusy || connected}
          onClick={onConnect}
          className={buttonClass({
            variant: "secondary",
            size: "md",
            className: connected ? "!text-ink-3" : "",
          })}
        >
          {connectBusy
            ? t("society.connecting")
            : connected
              ? t("society.connected")
              : t("society.connect")}
        </button>
        {activeLabel ? (
          <p className="text-center text-xs text-white/35 sm:text-right">
            {t("society.activeAgo", { time: activeLabel })}
          </p>
        ) : null}
      </div>
    </article>
  );
});
