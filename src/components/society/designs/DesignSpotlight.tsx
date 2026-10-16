"use client";

import Link from "next/link";
import { useState } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import type { Directory } from "@/lib/society-directory";
import { personHref, Portrait, Still, useCreditRole, usePersonMeta, workHref } from "./shared";
import styles from "./DesignSpotlight.module.css";

/** F · Spotlight: one creator at a time under the light, everyone else a click away. */
export default function DesignSpotlight({ people }: Directory) {
  const copy = useUiCopy();
  const meta = usePersonMeta();
  const creditRole = useCreditRole();
  // Open on someone with work to show (the order itself is shuffled per visit).
  const [index, setIndex] = useState(() => Math.max(0, people.findIndex((person) => person.credits.length > 0)));
  const at = Math.min(index, people.length - 1);
  const person = people[at]!;
  const href = personHref(person);
  const quote = person.headline || person.bio;
  const step = (delta: number) => setIndex((at + delta + people.length) % people.length);

  return (
    <div className={styles.wrap}>
      <section className={styles.stage} aria-live="polite">
        <div className={styles.light} aria-hidden="true" />
        <div className={styles.portraitWrap}>
          <Portrait key={person.uid} person={person} className={styles.portrait} sizes="(max-width: 900px) 80vw, 420px" />
        </div>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            <UiText text="In the spotlight" /> · {String(at + 1).padStart(2, "0")} / {String(people.length).padStart(2, "0")}
          </p>
          <h1 key={person.uid} className={styles.name}>{person.name}</h1>
          <p className={styles.meta}>
            {meta(person)}
            {person.available ? <span className={styles.open}><span className={styles.dot} aria-hidden="true" /><UiText text="Available now" /></span> : null}
          </p>
          {quote ? <blockquote className={styles.quote}>{quote}</blockquote> : null}

          {person.credits.length > 0 ? (
            <div className={styles.works}>
              {person.credits.slice(0, 3).map((credit) => (
                <Link key={`${credit.work.key}:${credit.role}`} href={workHref(credit.work)} className={styles.work}>
                  <Still work={credit.work} className={styles.workStill} sizes="220px" />
                  <span className={styles.workTitle}>{credit.work.title}</span>
                  <span className={styles.workRole}>{creditRole(credit)}</span>
                </Link>
              ))}
            </div>
          ) : null}

          <div className={styles.actions}>
            {href ? <Link href={href} className={styles.solid}><UiText text="View profile" /></Link> : null}
            {people.length > 1 ? (
              <>
                <button type="button" className={styles.round} onClick={() => step(-1)} aria-label={copy("Previous creator")}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
                </button>
                <button type="button" className={styles.round} onClick={() => step(1)} aria-label={copy("Next creator")}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {people.length > 1 ? (
        <section className={styles.others}>
          <h2><UiText text="Everyone in Society" /></h2>
          <div className={styles.faces}>
            {people.map((other, i) => (
              <button key={other.uid} type="button" className={styles.face} aria-pressed={i === at} onClick={() => setIndex(i)}>
                <Portrait person={other} className={styles.faceImage} sizes="72px" />
                <span>{other.name}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
