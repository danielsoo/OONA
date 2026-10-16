"use client";

import { useState } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import type { DirGroup, DirPerson, Directory } from "@/lib/society-directory";
import { PersonLink, Portrait, usePersonMeta } from "./shared";
import styles from "./DesignContactSheet.module.css";

type Filter = "all" | DirGroup | "available";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "director", label: "Directors" },
  { id: "cast", label: "Actors" },
  { id: "crew", label: "Creative crew" },
  { id: "available", label: "Available now" },
];

function inFilter(person: DirPerson, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "available") return person.available;
  return person.groups.includes(filter);
}

/** D · Contact sheet: creators as frames on a strip of film; the circled ones are open to a project. */
export default function DesignContactSheet({ people }: Directory) {
  const copy = useUiCopy();
  const meta = usePersonMeta();
  const [filter, setFilter] = useState<Filter>("all");
  const shown = people.filter((person) => inFilter(person, filter));

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}><UiText text="OONA SOCIETY" /></p>
          <h1><UiText text="Pick your crew." /></h1>
          <p className={styles.sub}><UiText text="Every frame is a creator. The circled ones are open to a new project." /></p>
        </div>
        <div className={styles.tabs} role="group" aria-label={copy("Filter")}>
          {FILTERS.map((item) => (
            <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
              {copy(item.label)}
            </button>
          ))}
        </div>
      </header>

      {shown.length === 0 ? (
        <p className={styles.none}><UiText text="No matches yet" /></p>
      ) : (
        <div className={styles.sheet}>
          {shown.map((person, index) => (
            <PersonLink key={person.uid} person={person} className={styles.frame} label={person.name}>
              <span className={styles.film}>
                <span className={styles.holes} aria-hidden="true" />
                <span className={styles.picture}>
                  <Portrait person={person} className={styles.portrait} sizes="220px" />
                  {person.available ? (
                    <svg className={styles.circle} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M50 4C76 3 97 20 96 50C95 79 74 97 48 96C21 95 3 77 5 48C7 22 27 6 54 6" />
                    </svg>
                  ) : null}
                </span>
                <span className={styles.edge} aria-hidden="true">
                  <span>{String(index + 1).padStart(2, "0")}A</span>
                  <span>OONA 400</span>
                </span>
                <span className={styles.holes} aria-hidden="true" />
              </span>
              <span className={styles.caption}>
                <strong>{person.name}</strong>
                <span>{meta(person)}</span>
              </span>
            </PersonLink>
          ))}
        </div>
      )}
    </div>
  );
}
