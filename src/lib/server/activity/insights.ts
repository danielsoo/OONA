import type { Db, Document } from "mongodb";
import { ensureActivityIndexes, eventCollection, sessionsCollection, type EventKind } from "@/lib/server/activity/collections";
import type { ActivityInsights, InsightsRange, InsightsSeries, InsightsTotals } from "@/types/activity-insights";

/**
 * The numbers behind the admin console's activity charts: totals for a
 * period and the one before it, counts by UTC hour, and the most viewed,
 * searched and watched. Each is one small aggregation on one collection,
 * asking only for counts and sums (which every MongoDB-compatible store has).
 */

const HOUR_MS = 60 * 60 * 1000;
export const RANGE_MS: Record<InsightsRange, number> = {
  "24h": 24 * HOUR_MS,
  "7d": 7 * 24 * HOUR_MS,
  "30d": 30 * 24 * HOUR_MS,
  "90d": 90 * 24 * HOUR_MS,
};

type Window = { $gte: Date; $lt: Date };

async function aggregate<T extends Document>(db: Db, collection: EventKind | "sessions", pipeline: Document[]): Promise<T[]> {
  return db.collection(collection).aggregate<T>(pipeline).toArray();
}

/** How many different values of `field` the period's page views have. */
async function distinctCount(db: Db, at: Window, field: "visitorId" | "uid"): Promise<number> {
  const match = field === "uid" ? { at, uid: { $ne: null } } : { at };
  const [row] = await aggregate<{ n: number }>(db, "page_views", [{ $match: match }, { $group: { _id: `$${field}` } }, { $count: "n" }]);
  return row?.n ?? 0;
}

async function totalsFor(db: Db, at: Window): Promise<InsightsTotals> {
  const count = (kind: EventKind, extra: Document = {}) => eventCollection(db, kind).countDocuments({ at, ...extra });
  const [visitors, members, visits, pageViews, searches, plays, completes, watched, signUps, signIns] = await Promise.all([
    distinctCount(db, at, "visitorId"),
    distinctCount(db, at, "uid"),
    sessionsCollection(db).countDocuments({ startedAt: at }),
    count("page_views"),
    count("searches"),
    count("video_events", { action: "play" }),
    count("video_events", { action: "complete" }),
    aggregate<{ s: number }>(db, "video_events", [
      { $match: { at, action: { $in: ["pause", "complete"] } } },
      { $group: { _id: null, s: { $sum: "$watched" } } },
    ]),
    count("auth_events", { action: "sign_up" }),
    count("auth_events", { action: { $in: ["sign_in", "sign_up"] } }),
  ]);
  return { visitors, members, visits, pageViews, searches, plays, completes, watchedSeconds: watched[0]?.s ?? 0, signUps, signIns };
}

/** Counts by UTC hour bucket. */
async function byHour(db: Db, collection: EventKind | "sessions", match: Document, hourField = "hour"): Promise<Record<string, number>> {
  const rows = await aggregate<{ _id: string | null; n: number }>(db, collection, [
    { $match: match },
    { $group: { _id: `$${hourField}`, n: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.filter((row) => row._id).map((row) => [row._id as string, row.n]));
}

async function hourly(db: Db, at: Window): Promise<Record<InsightsSeries, Record<string, number>>> {
  const [pageViews, visits, searches, plays, signIns] = await Promise.all([
    byHour(db, "page_views", { at }),
    byHour(db, "sessions", { startedAt: at }, "startHour"),
    byHour(db, "searches", { at }),
    byHour(db, "video_events", { at, action: "play" }),
    byHour(db, "auth_events", { at, action: { $in: ["sign_in", "sign_up"] } }),
  ]);
  return { pageViews, visits, searches, plays, signIns };
}

async function videos(db: Db, at: Window) {
  // How many of each step per title, and (separately, by title alone) the time watched.
  const [rows, watchedRows] = await Promise.all([
    aggregate<{ _id: { title?: string; action?: string; percent?: number }; n: number }>(db, "video_events", [
      { $match: { at } },
      { $group: { _id: { title: "$title", action: "$action", percent: "$percent" }, n: { $sum: 1 } } },
    ]),
    aggregate<{ _id: string | null; watched: number }>(db, "video_events", [
      { $match: { at, action: { $in: ["pause", "complete"] } } },
      { $group: { _id: "$title", watched: { $sum: "$watched" } } },
    ]),
  ]);
  const watchedBy = new Map(watchedRows.map((row) => [row._id || "Untitled", row.watched ?? 0]));
  const byTitle = new Map<string, ActivityInsights["videos"][number]>();
  const funnel = { plays: 0, p25: 0, p50: 0, p75: 0, completes: 0 };
  for (const { _id, n } of rows) {
    const title = _id.title || "Untitled";
    const video = byTitle.get(title) ?? { title, plays: 0, p25: 0, p50: 0, p75: 0, completes: 0, watchedSeconds: watchedBy.get(title) ?? 0 };
    if (_id.action === "play") video.plays += n;
    else if (_id.action === "complete") video.completes += n;
    else if (_id.action === "progress" && (_id.percent === 25 || _id.percent === 50 || _id.percent === 75)) video[`p${_id.percent}`] += n;
    byTitle.set(title, video);
  }
  for (const video of byTitle.values()) {
    funnel.plays += video.plays;
    funnel.p25 += video.p25;
    funnel.p50 += video.p50;
    funnel.p75 += video.p75;
    funnel.completes += video.completes;
  }
  const list = [...byTitle.values()].sort((a, b) => b.plays - a.plays || b.watchedSeconds - a.watchedSeconds).slice(0, 10);
  return { list, funnel };
}

/** The most common values of `field`, most first. */
async function top(db: Db, collection: EventKind | "sessions", match: Document, field: string, limit: number) {
  return aggregate<{ _id: string | null; n: number }>(db, collection, [
    { $match: match },
    { $group: { _id: `$${field}`, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: limit },
  ]);
}

/**
 * The most common values of `field`, each with the `label` it most often has
 * (a page's heading, a search's usual casing). Counted per pair and merged
 * here, so only counting is asked of the database.
 */
async function topLabelled(db: Db, collection: EventKind, match: Document, field: string, label: string, limit: number) {
  const pairs = await aggregate<{ _id: { key?: string | null; label?: string | null }; n: number }>(db, collection, [
    { $match: match },
    { $group: { _id: { key: `$${field}`, label: `$${label}` }, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: limit * 5 },
  ]);
  const merged = new Map<string, { key: string; label: string | null; n: number; best: number }>();
  for (const { _id, n } of pairs) {
    if (!_id.key) continue;
    const row = merged.get(_id.key) ?? { key: _id.key, label: null, n: 0, best: 0 };
    row.n += n;
    if (_id.label && n > row.best) {
      row.label = _id.label;
      row.best = n;
    }
    merged.set(_id.key, row);
  }
  return [...merged.values()].sort((a, b) => b.n - a.n).slice(0, limit);
}

export async function activityInsights(db: Db, range: InsightsRange): Promise<ActivityInsights> {
  await ensureActivityIndexes(db);
  const to = new Date();
  const from = new Date(to.getTime() - RANGE_MS[range]);
  const at: Window = { $gte: from, $lt: to };
  const before: Window = { $gte: new Date(from.getTime() - RANGE_MS[range]), $lt: from };

  const [totals, previous, series, pages, searchRows, video, deviceRows, countryRows, areaRows] = await Promise.all([
    totalsFor(db, at),
    totalsFor(db, before),
    hourly(db, at),
    topLabelled(db, "page_views", { at }, "path", "heading", 10),
    topLabelled(db, "searches", { at }, "queryKey", "query", 10),
    videos(db, at),
    top(db, "sessions", { startedAt: at }, "device", 6),
    top(db, "sessions", { startedAt: at }, "country", 8),
    top(db, "page_views", { at }, "area", 10),
  ]);

  return {
    range,
    from: from.toISOString(),
    to: to.toISOString(),
    totals,
    previous,
    hourly: series,
    topPages: pages.map((row) => ({ path: row.key, heading: row.label, views: row.n })),
    topSearches: searchRows.map((row) => ({ query: row.label ?? row.key, count: row.n })),
    videos: video.list,
    funnel: video.funnel,
    devices: deviceRows.map((row) => ({ name: row._id ?? "unknown", visits: row.n })),
    countries: countryRows.map((row) => ({ name: row._id ?? "unknown", visits: row.n })),
    areas: areaRows.map((row) => ({ name: row._id ?? "other", views: row.n })),
  };
}
