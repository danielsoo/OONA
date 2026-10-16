"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import type { DirPerson, Directory } from "@/lib/society-directory";
import { matchesQuery, PersonLink, usePersonRole, workHref } from "./shared";
import styles from "./DesignIndex.module.css";

const CHOSEONG = ["ㄱ", "ㄱ", "ㄴ", "ㄷ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅂ", "ㅅ", "ㅅ", "ㅇ", "ㅈ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const HANGUL_ORDER = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

/** The index letter for a name: A–Z, a Hangul initial (ㄱ…ㅎ), or #. */
export function indexLetter(name: string): string {
  const first = Array.from(name.trim())[0] ?? "";
  const code = first.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return CHOSEONG[Math.floor((code - 0xac00) / 588)]!;
  const latin = first.normalize("NFD").charAt(0).toUpperCase();
  return /[A-Z]/.test(latin) ? latin : "#";
}

function letterOrder(letter: string): number {
  if (/[A-Z]/.test(letter)) return letter.charCodeAt(0);
  const hangul = HANGUL_ORDER.indexOf(letter);
  return hangul >= 0 ? 1000 + hangul : 2000;
}

type Sort = "name" | "credits";

/** E · Index: every name A to Z, with what they do, where, and what they made. */
export default function DesignIndex({ people }: Directory) {
  const copy = useUiCopy();
  const role = usePersonRole();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [availableOnly, setAvailableOnly] = useState(false);
  const collator = useMemo(() => new Intl.Collator(undefined, { sensitivity: "base" }), []);

  const shown = useMemo(
    () => people.filter((person) => matchesQuery(person, query) && (!availableOnly || person.available)),
    [availableOnly, people, query]
  );

  const sections = useMemo(() => {
    if (sort === "credits") {
      return [{ letter: "", people: [...shown].sort((a, b) => b.credits.length - a.credits.length || collator.compare(a.name, b.name)) }];
    }
    const byLetter = new Map<string, DirPerson[]>();
    for (const person of [...shown].sort((a, b) => collator.compare(a.name, b.name))) {
      const letter = indexLetter(person.name);
      byLetter.set(letter, [...(byLetter.get(letter) ?? []), person]);
    }
    return [...byLetter.entries()].sort((a, b) => letterOrder(a[0]) - letterOrder(b[0])).map(([letter, list]) => ({ letter, people: list }));
  }, [collator, shown, sort]);

  const jump = (letter: string) => document.getElementById(`society-index-${letter}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}><UiText text="OONA SOCIETY" /></p>
          <h1><UiText text="Every name, A to Z." /></h1>
          <p className={styles.sub}><UiText text="Search, sort, and go straight to anyone." /></p>
        </div>
        <div className={styles.controls}>
          <label className={styles.search}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy("Search names or schools")} aria-label={copy("Search names or schools")} />
          </label>
          <div className={styles.segment} role="group" aria-label={copy("Sort")}>
            <button type="button" aria-pressed={sort === "name"} onClick={() => setSort("name")}><UiText text="A–Z" /></button>
            <button type="button" aria-pressed={sort === "credits"} onClick={() => setSort("credits")}><UiText text="Most credits" /></button>
          </div>
          <button type="button" className={styles.toggle} aria-pressed={availableOnly} onClick={() => setAvailableOnly((on) => !on)}>
            <span className={styles.dot} aria-hidden="true" /><UiText text="Available now" />
          </button>
        </div>
      </header>

      {sort === "name" && sections.length > 1 ? (
        <nav className={styles.letters} aria-label={copy("Jump to a letter")}>
          {sections.map((section) => <button key={section.letter} type="button" onClick={() => jump(section.letter)}>{section.letter}</button>)}
        </nav>
      ) : null}

      {shown.length === 0 ? (
        <p className={styles.none}><UiText text="No matches yet" /></p>
      ) : (
        <div className={styles.table}>
          <div className={styles.columns} aria-hidden="true">
            <span><UiText text="Name" /></span>
            <span><UiText text="Role" /></span>
            <span><UiText text="School" /></span>
            <span><UiText text="Credits" /></span>
          </div>
          {sections.map((section) => (
            <section key={section.letter || "all"} id={section.letter ? `society-index-${section.letter}` : undefined} className={styles.section}>
              {section.letter ? <h2 className={styles.letter}>{section.letter}</h2> : null}
              <div className={styles.rows}>
                {section.people.map((person) => (
                  <div key={person.uid} className={styles.row}>
                    <PersonLink person={person} className={styles.name}>
                      <strong>{person.name}</strong>
                      {person.available ? <span className={styles.dot} title={copy("Available now")} /> : null}
                    </PersonLink>
                    <span className={styles.cell}>{role(person)}</span>
                    <span className={styles.cell}>{person.schools.join(", ") || "—"}</span>
                    <span className={styles.works}>
                      {person.credits.length === 0 ? <span className={styles.cellFaint}>—</span> : null}
                      {person.credits.slice(0, 2).map((credit) => (
                        <Link key={`${credit.work.key}:${credit.role}`} href={workHref(credit.work)}>{credit.work.title}</Link>
                      ))}
                      {person.credits.length > 2 ? <span className={styles.cellFaint}>+{person.credits.length - 2}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
