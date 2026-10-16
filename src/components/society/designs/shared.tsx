"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, type ReactNode } from "react";
import { useUiCopy } from "@/components/i18n/UiText";
import { useTranslations } from "@/context/LocaleContext";
import { primaryRole, type DirCredit, type DirPerson, type DirWork } from "@/lib/society-directory";
import { watchHref } from "@/lib/works/catalog-ui";
import styles from "./shell.module.css";

export function personHref(person: Pick<DirPerson, "handle">): string | null {
  return person.handle ? `/people/${person.handle}` : null;
}

export function workHref(work: DirWork): string {
  return watchHref(work.ownerUid, work.workId);
}

/** Name, handle, headline, schools or a work title contains the query. */
export function matchesQuery(person: DirPerson, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [person.name, person.handle, person.headline, ...person.schools, ...person.credits.map((c) => c.work.title)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export function initialOf(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "?";
}

/** A deep blue-to-violet backdrop, the same for a person every time. */
export function backdropFor(uid: string): string {
  let h = 0;
  for (const ch of uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = 195 + (h % 95);
  return `linear-gradient(165deg, hsl(${hue} 38% 24%), #070c13 78%)`;
}

/** "Director", "Sound", … (their most frequent credit), or "Creative crew". */
export function usePersonRole() {
  const { t } = useTranslations();
  const copy = useUiCopy();
  return useCallback(
    (person: Pick<DirPerson, "credits" | "roleTags">) => {
      const role = primaryRole(person);
      return role === "crew" ? copy("Creative crew") : t(`watch.creditRole.${role}`);
    },
    [copy, t]
  );
}

export function useCreditRole() {
  const { t } = useTranslations();
  return useCallback((credit: DirCredit) => t(`watch.creditRole.${credit.role}`), [t]);
}

/** Role · school, for a line under a name. */
export function usePersonMeta() {
  const role = usePersonRole();
  return useCallback(
    (person: DirPerson) => [role(person), person.schools[0]].filter(Boolean).join(" · "),
    [role]
  );
}

/** Their photo, or their initial on a backdrop. */
export function Portrait({ person, className, sizes = "240px" }: { person: DirPerson; className?: string; sizes?: string }) {
  return (
    <span className={`${styles.portrait} ${className ?? ""}`} style={person.avatarUrl ? undefined : { background: backdropFor(person.uid) }}>
      {person.avatarUrl ? (
        <Image src={person.avatarUrl} alt="" fill unoptimized sizes={sizes} className={styles.portraitImage} />
      ) : (
        <span className={styles.portraitInitial} aria-hidden="true">{initialOf(person.name)}</span>
      )}
    </span>
  );
}

/** A still from the work, or a quiet backdrop while there is none. */
export function Still({ work, className, sizes = "640px" }: { work: DirWork | null; className?: string; sizes?: string }) {
  return (
    <span className={`${styles.still} ${className ?? ""}`}>
      {work?.stillUrl ? (
        <Image
          src={work.stillUrl}
          alt=""
          fill
          unoptimized={/^https?:/.test(work.stillUrl)}
          sizes={sizes}
          className={styles.portraitImage}
        />
      ) : null}
    </span>
  );
}

/** A link to their profile when they have one; plain otherwise. */
export function PersonLink({ person, className, children, label }: { person: DirPerson; className?: string; children: ReactNode; label?: string }) {
  const href = personHref(person);
  return href ? (
    <Link href={href} className={className} aria-label={label}>{children}</Link>
  ) : (
    <span className={className}>{children}</span>
  );
}
