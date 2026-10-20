import type { InsightsRange } from "@/types/activity-insights";

/**
 * The activity charts' time handling: the server counts by UTC hour
 * ("2026-10-21T13"), and these regroup those counts into the viewer's own
 * hours and days, so a chart reads in local time wherever the admin is.
 * Pure (local time is the runtime's).
 */

export type Granularity = "hour" | "day";

export const granularityOf = (range: InsightsRange): Granularity => (range === "24h" ? "hour" : "day");

/** When a UTC hour key begins. */
export function hourKeyTime(key: string): number {
  return Date.parse(`${key}:00:00Z`);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The local hour ("2026-10-21T22") or day ("2026-10-21") a time falls in. */
export function localBucketKey(time: number, granularity: Granularity): string {
  const d = new Date(time);
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return granularity === "day" ? day : `${day}T${pad(d.getHours())}`;
}

export type Bucket = { key: string; start: number };

/** Every local hour or day from `from` to `to`, oldest first. */
export function localBuckets(from: string, to: string, granularity: Granularity): Bucket[] {
  const d = new Date(Date.parse(from));
  if (granularity === "day") d.setHours(0, 0, 0, 0);
  else d.setMinutes(0, 0, 0);
  const end = Date.parse(to);
  const buckets: Bucket[] = [];
  while (d.getTime() <= end && buckets.length < 2400) {
    buckets.push({ key: localBucketKey(d.getTime(), granularity), start: d.getTime() });
    if (granularity === "day") d.setDate(d.getDate() + 1);
    else d.setHours(d.getHours() + 1);
  }
  return buckets;
}

/** A series counted by UTC hour, regrouped into `buckets` (0 where nothing happened). */
export function regroup(hourly: Record<string, number>, buckets: Bucket[], granularity: Granularity): number[] {
  const index = new Map(buckets.map((bucket, i) => [bucket.key, i]));
  const values = buckets.map(() => 0);
  for (const [key, count] of Object.entries(hourly)) {
    const i = index.get(localBucketKey(hourKeyTime(key), granularity));
    if (i !== undefined) values[i]! += count;
  }
  return values;
}

/** Counts by local weekday (row 0 is Monday) and hour (column 0 is midnight). */
export function weekHourGrid(hourly: Record<string, number>): number[][] {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const [key, count] of Object.entries(hourly)) {
    const d = new Date(hourKeyTime(key));
    grid[(d.getDay() + 6) % 7]![d.getHours()]! += count;
  }
  return grid;
}

/** Whole-percent change from `before` to `now`; null when there was nothing before to compare with. */
export function percentChange(now: number, before: number): number | null {
  if (before === 0) return now === 0 ? 0 : null;
  return Math.round(((now - before) / before) * 100);
}
