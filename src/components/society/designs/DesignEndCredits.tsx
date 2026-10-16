"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import type { DirGroup, Directory } from "@/lib/society-directory";
import { matchesQuery, personHref, Still, useCreditRole, usePersonRole, workHref } from "./shared";
import styles from "./DesignEndCredits.module.css";

const GROUPS: { id: DirGroup; label: string }[] = [
  { id: "director", label: "Directed by" },
  { id: "cast", label: "Cast" },
  { id: "crew", label: "Crew" },
];

/** B · End credits: names grouped the way a film credits them; pick one to see their work. */
export default function DesignEndCredits({ people }: Directory) {
  const copy = useUiCopy();
  const role = usePersonRole();
  const creditRole = useCreditRole();
  const [query, setQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [pickedUid, setPickedUid] = useState<string | null>(null);

  const shown = useMemo(
    () => people.filter((person) => matchesQuery(person, query) && (!availableOnly || person.available)),
    [availableOnly, people, query]
  );
  // Each name once, under the first thing they do (directing, then acting, then crew).
  const groups = GROUPS.map((group) => ({ ...group, people: shown.filter((person) => person.groups[0] === group.id) })).filter((group) => group.people.length > 0);
  const picked = shown.find((person) => person.uid === pickedUid) ?? shown.find((person) => person.credits.length > 0) ?? shown[0] ?? null;
  const work = picked?.credits[0]?.work ?? null;
  const byUid = useMemo(() => new Map(people.map((person) => [person.uid, person])), [people]);
  const href = picked ? personHref(picked) : null;

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}><UiText text="OONA SOCIETY" /></p>
          <h1><UiText text="Everyone in the credits." /></h1>
          <p className={styles.sub}><UiText text="Pick a name to see what they made, and who they made it with." /></p>
        </div>
        <div className={styles.controls}>
          <label className={styles.search}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy("Search names or schools")} aria-label={copy("Search names or schools")} />
          </label>
          <button type="button" className={styles.toggle} aria-pressed={availableOnly} onClick={() => setAvailableOnly((on) => !on)}>
            <span className={styles.dot} aria-hidden="true" /><UiText text="Available now" />
          </button>
        </div>
      </header>

      {picked === null ? (
        <p className={styles.none}><UiText text="No matches yet" /></p>
      ) : (
        <div className={styles.body}>
          <div className={styles.names}>
            {groups.map((group) => (
              <section key={group.id} className={styles.group}>
                <h2>{copy(group.label)}</h2>
                {group.people.map((person) => (
                  <button
                    key={person.uid}
                    type="button"
                    className={styles.name}
                    aria-pressed={person.uid === picked.uid}
                    onClick={() => setPickedUid(person.uid)}
                  >
                    <span className={styles.nameText}>{person.name}</span>
                    <span className={styles.nameMeta}>{person.schools[0] ?? role(person)}</span>
                  </button>
                ))}
              </section>
            ))}
          </div>

          <div className={styles.stage}>
            <div className={styles.screen}>
              <Still work={work} className={styles.still} sizes="(max-width: 900px) 100vw, 60vw" />
              <div className={styles.card}>
                <span className={styles.kicker}>{picked.credits[0] ? creditRole(picked.credits[0]) : role(picked)}</span>
                <strong>{picked.name}</strong>
                <span className={styles.work}>{work ? work.title : copy("No credits yet")}</span>
                <div className={styles.actions}>
                  {href ? <Link href={href} className={styles.solid}><UiText text="View profile" /></Link> : null}
                  {work ? <Link href={workHref(work)} className={styles.ghost}><UiText text="Watch" /></Link> : null}
                </div>
              </div>
            </div>

            {picked.credits.length > 1 ? (
              <div className={styles.line}>
                <span className={styles.lineLabel}><UiText text="Also credited on" /></span>
                {picked.credits.slice(1, 6).map((credit) => (
                  <Link key={`${credit.work.key}:${credit.role}`} href={workHref(credit.work)} className={styles.chip}>
                    {credit.work.title} <em>· {creditRole(credit)}</em>
                  </Link>
                ))}
              </div>
            ) : null}

            {picked.collaborators.length > 0 ? (
              <div className={styles.line}>
                <span className={styles.lineLabel}><UiText text="Worked with" /></span>
                {picked.collaborators.slice(0, 8).map((uid) => {
                  const other = byUid.get(uid);
                  if (!other) return null;
                  return (
                    <button key={uid} type="button" className={styles.chip} onClick={() => { setQuery(""); setAvailableOnly(false); setPickedUid(uid); }}>
                      {other.name}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

