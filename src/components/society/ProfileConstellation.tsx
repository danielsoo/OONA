"use client";

import Link from "next/link";
import { useState } from "react";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { hashString } from "@/lib/society-sky";
import styles from "./EditorialProfile.module.css";

export type ConstellationPerson = { uid: string; name: string; role: string; href: string | null };
export type ConstellationWork = { key: string; title: string; role: string; watchPath: string; people: ConstellationPerson[] };

/**
 * As many works as the profile API sends collaborators for
 * (COLLABORATOR_WORKS in /api/people/[handle]), so the sky shows everything
 * it has people for rather than the first handful.
 */
const WORKS_MAX = 12;

/**
 * Past this many branches there is no room for both the works and the people
 * they were made with: the works take the whole sky, out on two rings so
 * neighbouring titles are never side by side, and each one's "+N" says how
 * many people are on it. Up to here nothing changes.
 */
const STAGGER_FROM = 7;
/** Where a work sits: one ring, or alternating rings once it is crowded. */
const RING = 19;
const RING_NEAR = 25;
const RING_FAR = 37;
/** Where that work's people sit, while there are still people to show. */
const PEOPLE_RING = 38;
const PER_WORK = 4;

/** People per work, up to the point where there is no room for them. */
function peoplePerWork(n: number): number {
  return n < STAGGER_FROM ? PER_WORK : 0;
}

type Spot = { x: number; y: number };
const at = (angle: number, r: number): Spot => ({ x: 50 + Math.cos(angle) * r, y: 50 + Math.sin(angle) * r });
/** A branch that bows a little to one side, as in the Society sky's neurons. */
const curve = (a: Spot, b: Spot, bow = 0.14) =>
  `M${a.x},${a.y} Q${(a.x + b.x) / 2 + (b.y - a.y) * bow},${(a.y + b.y) / 2 - (b.x - a.x) * bow} ${b.x},${b.y}`;

/**
 * Someone's own corner of the Society sky: them in the middle (their picture,
 * or just a star), a branch out to each work they made, and at its tip the
 * people they made it with. Someone they worked with more than once sits on
 * the first branch, with a faint line from the others. Works link to where
 * they play; people to their profiles.
 */
export default function ProfileConstellation({ name, seed, avatarUrl, works, peopleMax = 14 }: { name: string; seed: string; avatarUrl?: string | null; works: ConstellationWork[]; peopleMax?: number }) {
  const [lit, setLit] = useState<string | null>(null);
  const shown = works.slice(0, WORKS_MAX);
  const n = shown.length;
  const turn = ((hashString(seed) % 360) * Math.PI) / 180;
  const stagger = n >= STAGGER_FROM;
  const perWork = peoplePerWork(n);

  // People, a few per work and each only once, taken in turns so every work gets some.
  const placed = new Map<string, number>();
  const tips: ConstellationPerson[][] = shown.map(() => []);
  for (let round = 0; round < perWork && placed.size < peopleMax; round += 1) {
    shown.forEach((work, wi) => {
      if (placed.size >= peopleMax) return;
      const next = work.people.find((p) => !placed.has(p.uid));
      if (next && tips[wi]!.length === round) {
        tips[wi]!.push(next);
        placed.set(next.uid, wi);
      }
    });
  }

  // Crowded, the branches alternate short and long: neighbouring titles then
  // sit at different distances instead of running into each other.
  const ringOf = (wi: number) => (!stagger ? RING : wi % 2 === 0 ? RING_NEAR : RING_FAR);
  const knots = shown.map((_, wi) => {
    const angle = turn + (wi / Math.max(1, n)) * Math.PI * 2;
    return { angle, ring: ringOf(wi), ...at(angle, ringOf(wi)) };
  });
  // Each work's people fan out round its branch, leaving its sides clear for its title.
  const span = n > 1 ? Math.min(((Math.PI * 2) / n) * 0.62, Math.PI * 0.55) : Math.PI * 1.1;
  const spots = new Map<string, Spot & { angle: number; wi: number }>();
  tips.forEach((people, wi) => {
    const step = Math.min(span / Math.max(1, people.length), 0.5);
    people.forEach((p, j) => {
      const angle = knots[wi]!.angle + (j - (people.length - 1) / 2) * step;
      spots.set(p.uid, { ...at(angle, PEOPLE_RING), angle, wi });
    });
  });
  // Someone also on another of these works: a faint line from that work too.
  const echoes = shown.flatMap((work, wi) =>
    work.people.filter((p) => spots.has(p.uid) && spots.get(p.uid)!.wi !== wi).map((p) => ({ wi, uid: p.uid }))
  ).slice(0, 4);

  const isLit = (wi: number, uid?: string) => lit === `w${wi}` || (!!uid && lit === uid);
  return (
    <div className={styles.constellation}>
      {/* It draws itself on arrival, trunk first, as the sky does: pathLength
          normalises every line to 1 so one dash offset animates them all. */}
      <svg className={styles.branches} viewBox="0 0 100 100" aria-hidden="true">
        <circle className={styles.orbit} cx="50" cy="50" r="17" />
        {echoes.map(({ wi, uid }) => (
          <path key={`echo:${wi}:${uid}`} className={styles.echo} d={curve(knots[wi]!, spots.get(uid)!, 0.2)} pathLength={1} />
        ))}
        {knots.map((k, wi) => (
          <g key={shown[wi]!.key}>
            <path className={`${styles.trunk} ${isLit(wi) ? styles.branchLit : ""}`} d={curve({ x: 50, y: 50 }, k, 0.1)} pathLength={1} />
            {tips[wi]!.map((p) => (
              <path
                key={p.uid}
                className={`${styles.branch} ${isLit(wi, p.uid) ? styles.branchLit : ""}`}
                d={curve(k, spots.get(p.uid)!)}
                pathLength={1}
              />
            ))}
          </g>
        ))}
      </svg>
      <div className={styles.core} aria-hidden="true">
        {avatarUrl ? <ProfileAvatar displayName={name} avatarUrl={avatarUrl} className={styles.coreAvatar} /> : <span className={styles.coreStar} />}
      </div>

      {shown.map((work, wi) => {
        const k = knots[wi]!;
        // The title beside its trunk, running away from it.
        const px = -Math.sin(k.angle);
        const py = Math.cos(k.angle);
        const flip = py > 0 || (py === 0 && px < 0) ? -1 : 1;
        const anchor = Math.abs(px) > Math.abs(py) ? (px * flip > 0 ? "start" : "end") : py * flip < 0 ? "above" : "below";
        const more = work.people.filter((p) => placed.get(p.uid) !== wi && !echoes.some((e) => e.wi === wi && e.uid === p.uid)).length;
        return (
          <Link
            key={work.key}
            href={work.watchPath}
            className={`${styles.workKnot} ${styles[`knot_${anchor}`]} ${stagger ? styles.knotTight : ""}`}
            style={{ left: `${k.x + px * flip * 2.5}%`, top: `${k.y + py * flip * 2.5}%`, ["--i" as string]: wi }}
            onMouseEnter={() => setLit(`w${wi}`)}
            onMouseLeave={() => setLit((v) => (v === `w${wi}` ? null : v))}
            onFocus={() => setLit(`w${wi}`)}
            onBlur={() => setLit((v) => (v === `w${wi}` ? null : v))}
          >
            <strong>{work.title}</strong>
            <small>{[work.role, more > 0 ? `+${more}` : ""].filter(Boolean).join(" · ")}</small>
          </Link>
        );
      })}
      {knots.map((k, wi) => (
        <span
          key={`dot:${shown[wi]!.key}`}
          className={styles.knotDot}
          style={{ left: `${k.x}%`, top: `${k.y}%`, ["--i" as string]: wi }}
          aria-hidden="true"
        />
      ))}

      {[...spots].map(([uid, s], si) => {
        const p = tips[s.wi]!.find((x) => x.uid === uid)!;
        const className = `${styles.personStar} ${s.x < 50 ? styles.personLeft : ""}`;
        const label = (
          <span className={styles.personLabel}>
            <strong>{p.name}</strong>
            {p.role ? <small>{p.role}</small> : null}
          </span>
        );
        const events = {
          onMouseEnter: () => setLit(uid),
          onMouseLeave: () => setLit((v) => (v === uid ? null : v)),
          onFocus: () => setLit(uid),
          onBlur: () => setLit((v) => (v === uid ? null : v)),
        };
        const place = { left: `${s.x}%`, top: `${s.y}%`, ["--i" as string]: si };
        return p.href ? (
          <Link key={uid} href={p.href} className={className} style={place} aria-label={p.name} {...events}>
            {label}
          </Link>
        ) : (
          <span key={uid} className={className} style={place} {...events}>
            {label}
          </span>
        );
      })}
    </div>
  );
}
