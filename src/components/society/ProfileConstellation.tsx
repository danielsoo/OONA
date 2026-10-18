"use client";

import Link from "next/link";
import { useState } from "react";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { hashString } from "@/lib/society-sky";
import styles from "./EditorialProfile.module.css";

export type ConstellationWork = { key: string; title: string; role: string; watchPath: string };

export const CONSTELLATION_MAX = 7;

/**
 * Someone's own corner of the Society sky: their star in the middle (their
 * picture, or just the star), and what they made around it, each work a
 * smaller star on a branch out from them. Works link to where they play.
 */
export default function ProfileConstellation({ name, seed, avatarUrl, works }: { name: string; seed: string; avatarUrl?: string | null; works: ConstellationWork[] }) {
  const [lit, setLit] = useState<number | null>(null);
  const shown = works.slice(0, CONSTELLATION_MAX);
  // Spread evenly round the star, turned a little differently for each person,
  // alternately nearer and farther so it reads as a figure, not a clock face.
  const turn = (hashString(seed) % 360) * (Math.PI / 180);
  const spots = shown.map((_, i) => {
    const a = turn + (i / Math.max(1, shown.length)) * Math.PI * 2;
    const r = i % 2 ? 28 : 35;
    return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r };
  });
  return (
    <div className={styles.constellation}>
      <svg className={styles.branches} viewBox="0 0 100 100" aria-hidden="true">
        <circle className={styles.orbit} cx="50" cy="50" r="17" />
        {spots.map((p, i) => {
          // A branch bows a little to one side, like the Society sky's neurons.
          const mx = (50 + p.x) / 2 + (p.y - 50) * 0.16;
          const my = (50 + p.y) / 2 - (p.x - 50) * 0.16;
          return <path key={shown[i]!.key} className={lit === i ? styles.branchLit : undefined} d={`M50,50 Q${mx},${my} ${p.x},${p.y}`} />;
        })}
      </svg>
      <div className={styles.core} aria-hidden="true">
        {avatarUrl ? <ProfileAvatar displayName={name} avatarUrl={avatarUrl} className={styles.coreAvatar} /> : <span className={styles.coreStar} />}
      </div>
      {shown.map((work, i) => {
        const p = spots[i]!;
        const left = p.x < 50;
        return (
          <Link
            key={work.key}
            href={work.watchPath}
            className={`${styles.workStar} ${left ? styles.workStarLeft : ""}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onMouseEnter={() => setLit(i)}
            onMouseLeave={() => setLit((n) => (n === i ? null : n))}
            onFocus={() => setLit(i)}
            onBlur={() => setLit((n) => (n === i ? null : n))}
          >
            <span className={styles.workLabel}>
              <strong>{work.title}</strong>
              {work.role ? <small>{work.role}</small> : null}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
