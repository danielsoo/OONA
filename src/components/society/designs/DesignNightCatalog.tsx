"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import type { DirGroup, DirPerson, Directory } from "@/lib/society-directory";
import { matchesQuery, PersonLink, Portrait, usePersonMeta } from "./shared";
import styles from "./DesignNightCatalog.module.css";

type Filter = "all" | DirGroup | "available";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "director", label: "Directors" },
  { id: "cast", label: "Actors" },
  { id: "crew", label: "Creative crew" },
  { id: "available", label: "Available now" },
];

const ROWS: { id: Exclude<Filter, "all">; label: string }[] = [
  { id: "available", label: "Available now" },
  { id: "director", label: "Directors" },
  { id: "cast", label: "Actors & performers" },
  { id: "crew", label: "Creative crew" },
];

function inFilter(person: DirPerson, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "available") return person.available;
  return person.groups.includes(filter);
}

/** A · Night catalog: the home's look — a still up top, then rows of portraits by role. */
export default function DesignNightCatalog({ people }: Directory) {
  const copy = useUiCopy();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const browsing = filter === "all" && !query.trim();

  const rows = useMemo(() => {
    if (browsing) {
      return ROWS.map((row) => ({ ...row, people: people.filter((person) => inFilter(person, row.id)) })).filter((row) => row.people.length > 0);
    }
    const label = FILTERS.find((item) => item.id === filter)?.label ?? "All";
    return [{ id: filter, label, people: people.filter((person) => inFilter(person, filter) && matchesQuery(person, query)) }];
  }, [browsing, filter, people, query]);

  return (
    <>
      <section className={styles.hero}>
        <Image src="/images/home/home_main_wave6.png" alt="" fill priority sizes="100vw" className={styles.heroImage} />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><UiText text="OONA SOCIETY" /></p>
            <h1><UiText text="The people behind" /><br /><UiText text="the work." /></h1>
            <p><UiText text="Meet student filmmakers, artists, and collaborators." /><br /><UiText text="Build the team for what comes next." /></p>
          </div>
          <div className={styles.finder}>
            <label className={styles.search}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy("Search creators, schools, or disciplines")} aria-label={copy("Search creators, schools, or disciplines")} />
            </label>
            <div className={styles.chips}>
              {FILTERS.map((item) => (
                <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
                  {item.id === "available" ? <span className={styles.dot} aria-hidden="true" /> : null}
                  {copy(item.label)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {rows.every((row) => row.people.length === 0) ? (
        <div className={styles.empty}>
          <h2><UiText text="No matches yet" /></h2>
          <p><UiText text="Try a broader search or remove one of the filters." /></p>
        </div>
      ) : (
        rows.map((row) => (
          <section key={row.id} className={styles.row}>
            <div className={styles.rowHead}>
              <h2>{copy(row.label)}</h2>
              <span>{copy(row.people.length === 1 ? "{count} creator" : "{count} creators", { count: row.people.length })}</span>
            </div>
            <div className={browsing ? styles.rail : styles.grid}>
              {row.people.map((person, index) => <CatalogCard key={person.uid} person={person} eager={index < 6} />)}
            </div>
          </section>
        ))
      )}
    </>
  );
}

function CatalogCard({ person, eager }: { person: DirPerson; eager: boolean }) {
  const meta = usePersonMeta();
  return (
    <PersonLink person={person} className={styles.card}>
      <Portrait person={person} className={styles.cardPortrait} sizes={eager ? "240px" : "200px"} />
      <span className={styles.cardShade} aria-hidden="true" />
      <span className={styles.cardText}>
        {person.available ? <span className={styles.available}><span className={styles.dot} aria-hidden="true" /><UiText text="Available" /></span> : null}
        <strong>{person.name}</strong>
        <span>{meta(person)}</span>
      </span>
    </PersonLink>
  );
}
