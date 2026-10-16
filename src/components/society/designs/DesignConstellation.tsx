"use client";

import Link from "next/link";
import { useMemo, useState, type KeyboardEvent } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import type { DirPerson, Directory } from "@/lib/society-directory";
import { personHref, Portrait, useCreditRole, usePersonMeta, workHref } from "./shared";
import styles from "./DesignConstellation.module.css";

const W = 1000;
const H = 620;
const MAX_STARS = 160;
/** With more stars than this, only the picked and the hovered star are named. */
const LABEL_ALL_UP_TO = 12;

type Star = { person: DirPerson; x: number; y: number; r: number };

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Fruchterman–Reingold on a 1.6 : 1 sky: every star pushes the others away,
 * a shared work pulls two together, and a light pull to the middle keeps
 * loners in view. Deterministic, so a person's star stays put between visits.
 */
function layout(people: DirPerson[], edges: [number, number][]): { x: number; y: number }[] {
  const n = people.length;
  const AW = W / H;
  const pos = people.map((person) => {
    const h = hash(person.uid);
    return { x: 0.15 * AW + ((h % 1000) / 1000) * 0.7 * AW, y: 0.15 + (((h >>> 10) % 1000) / 1000) * 0.7 };
  });
  const k = 0.62 * Math.sqrt(AW / Math.max(n, 1));
  const STEPS = 300;
  for (let step = 0; step < STEPS; step += 1) {
    const disp = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const dx = pos[i]!.x - pos[j]!.x;
        const dy = pos[i]!.y - pos[j]!.y;
        const d = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
        const f = (k * k) / d;
        disp[i]!.x += (dx / d) * f;
        disp[i]!.y += (dy / d) * f;
        disp[j]!.x -= (dx / d) * f;
        disp[j]!.y -= (dy / d) * f;
      }
    }
    for (const [i, j] of edges) {
      const dx = pos[i]!.x - pos[j]!.x;
      const dy = pos[i]!.y - pos[j]!.y;
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
      const f = (d * d) / k;
      disp[i]!.x -= (dx / d) * f;
      disp[i]!.y -= (dy / d) * f;
      disp[j]!.x += (dx / d) * f;
      disp[j]!.y += (dy / d) * f;
    }
    const temperature = 0.08 * AW * (1 - step / STEPS) + 0.002;
    pos.forEach((p, i) => {
      const d = disp[i]!;
      d.x += (AW / 2 - p.x) * k * 1.2;
      d.y += (0.5 - p.y) * k * 1.2;
      const len = Math.sqrt(d.x * d.x + d.y * d.y) || 1;
      const move = Math.min(len, temperature);
      p.x = Math.min(AW * 0.96, Math.max(AW * 0.04, p.x + (d.x / len) * move));
      p.y = Math.min(0.92, Math.max(0.08, p.y + (d.y / len) * move));
    });
  }
  return pos.map((p) => ({ x: (p.x / AW) * W, y: p.y * H }));
}

const SKY = Array.from({ length: 140 }, (_, i) => {
  const h = hash(`sky${i}`);
  return { x: (h % 1000) * (W / 1000), y: ((h >>> 10) % 1000) * (H / 1000), r: 0.4 + ((h >>> 20) % 10) / 12, o: 0.15 + ((h >>> 4) % 10) / 22 };
});

/** C · Constellation: each star a creator, each line a work two of them made together. */
export default function DesignConstellation({ people }: Directory) {
  const copy = useUiCopy();
  const meta = usePersonMeta();
  const creditRole = useCreditRole();

  const { stars, edges } = useMemo(() => {
    // Credited people first, so a crowded sky still shows who made what.
    const chosen = [...people].sort((a, b) => Number(b.credits.length > 0) - Number(a.credits.length > 0)).slice(0, MAX_STARS);
    const index = new Map(chosen.map((person, i) => [person.uid, i]));
    const pairs: [number, number][] = [];
    chosen.forEach((person, i) => {
      for (const uid of person.collaborators) {
        const j = index.get(uid);
        if (j !== undefined && j > i) pairs.push([i, j]);
      }
    });
    const spots = layout(chosen, pairs);
    return {
      stars: chosen.map((person, i): Star => ({ person, ...spots[i]!, r: 4 + Math.min(7, person.credits.length * 1.6) })),
      edges: pairs,
    };
  }, [people]);

  const mostConnected = stars.reduce<Star | null>((best, star) => (!best || star.person.collaborators.length > best.person.collaborators.length ? star : best), null);
  const [pickedUid, setPickedUid] = useState<string | null>(null);
  const [hoverUid, setHoverUid] = useState<string | null>(null);
  const picked = stars.find((star) => star.person.uid === pickedUid) ?? mostConnected;
  const near = new Set(picked ? [picked.person.uid, ...picked.person.collaborators] : []);
  const byUid = new Map(stars.map((star) => [star.person.uid, star.person]));
  const labelAll = stars.length <= LABEL_ALL_UP_TO;

  const onKey = (event: KeyboardEvent, uid: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setPickedUid(uid);
    }
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <p className={styles.eyebrow}><UiText text="OONA SOCIETY" /></p>
        <h1><UiText text="Who made what, together." /></h1>
        <p className={styles.sub}><UiText text="Each star is a creator; each line, a work two of them made together." /></p>
      </header>

      <div className={styles.sky}>
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="group" aria-label={copy("Creators and the works that connect them")}>
          {SKY.map((dot, i) => <circle key={i} cx={dot.x} cy={dot.y} r={dot.r} className={styles.dust} style={{ opacity: dot.o }} />)}
          {edges.map(([i, j]) => {
            const a = stars[i]!;
            const b = stars[j]!;
            const lit = picked && (a.person.uid === picked.person.uid || b.person.uid === picked.person.uid);
            return <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={lit ? styles.edgeLit : styles.edge} />;
          })}
          {stars.map((star) => {
            const on = picked?.person.uid === star.person.uid;
            const dim = picked && !near.has(star.person.uid);
            return (
              <g
                key={star.person.uid}
                transform={`translate(${star.x} ${star.y})`}
                className={`${styles.star} ${dim ? styles.dim : ""}`}
                role="button"
                tabIndex={0}
                aria-label={star.person.name}
                aria-pressed={on}
                onClick={() => setPickedUid(star.person.uid)}
                onKeyDown={(event) => onKey(event, star.person.uid)}
                onPointerEnter={() => setHoverUid(star.person.uid)}
                onPointerLeave={() => setHoverUid((uid) => (uid === star.person.uid ? null : uid))}
                onFocus={() => setHoverUid(star.person.uid)}
                onBlur={() => setHoverUid(null)}
              >
                <title>{star.person.name}</title>
                <circle r={star.r + 12} className={styles.hit} />
                {star.person.available ? <circle r={star.r + 6} className={styles.halo} /> : null}
                <circle r={on ? star.r + 2.5 : star.r} className={on ? styles.coreOn : styles.core} />
                {on ? <circle r={star.r + 8} className={styles.ring} /> : null}
                {labelAll || on || hoverUid === star.person.uid ? (
                  <text y={star.r + 18} className={on ? styles.labelOn : styles.label}>{star.person.name}</text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {picked ? (
          <aside className={styles.panel}>
            <div className={styles.panelHead}>
              <Portrait person={picked.person} className={styles.panelPortrait} sizes="64px" />
              <div>
                <strong>{picked.person.name}</strong>
                <span>{meta(picked.person)}</span>
                {picked.person.available ? <span className={styles.open}><span className={styles.dot} aria-hidden="true" /><UiText text="Available now" /></span> : null}
              </div>
            </div>
            {picked.person.credits.length > 0 ? (
              <ul className={styles.list}>
                {picked.person.credits.slice(0, 5).map((credit) => (
                  <li key={`${credit.work.key}:${credit.role}`}>
                    <Link href={workHref(credit.work)}>{credit.work.title}</Link>
                    <span>{creditRole(credit)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.quiet}><UiText text="No credits yet" /></p>
            )}
            {picked.person.collaborators.length > 0 ? (
              <div className={styles.with}>
                <span><UiText text="Worked with" /></span>
                {picked.person.collaborators.slice(0, 6).map((uid) => {
                  const other = byUid.get(uid);
                  return other ? <button key={uid} type="button" onClick={() => setPickedUid(uid)}>{other.name}</button> : null;
                })}
              </div>
            ) : null}
            {personHref(picked.person) ? (
              <Link href={personHref(picked.person)!} className={styles.profile}><UiText text="View profile" /> <span aria-hidden="true">↗</span></Link>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
