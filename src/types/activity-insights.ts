/** The admin console's activity charts (GET /api/admin/activity/insights). */

export const INSIGHTS_RANGES = ["24h", "7d", "30d", "90d"] as const;
export type InsightsRange = (typeof INSIGHTS_RANGES)[number];

export type InsightsTotals = {
  /** Browsers that opened a page. */
  visitors: number;
  /** Accounts that opened a page while signed in. */
  members: number;
  /** Visits (a browser tab's session) begun. */
  visits: number;
  pageViews: number;
  searches: number;
  plays: number;
  completes: number;
  watchedSeconds: number;
  signUps: number;
  signIns: number;
};

/** Series counted by UTC hour ("2026-10-21T13" → count); the browser regroups them in local time. */
export type InsightsSeries = "pageViews" | "visits" | "searches" | "plays" | "signIns";

export type ActivityInsights = {
  range: InsightsRange;
  from: string;
  to: string;
  totals: InsightsTotals;
  /** The same length of time just before. */
  previous: InsightsTotals;
  hourly: Record<InsightsSeries, Record<string, number>>;
  topPages: { path: string; heading: string | null; views: number }[];
  topSearches: { query: string; count: number }[];
  videos: { title: string; plays: number; p25: number; p50: number; p75: number; completes: number; watchedSeconds: number }[];
  /** All videos together: how far people got. */
  funnel: { plays: number; p25: number; p50: number; p75: number; completes: number };
  devices: { name: string; visits: number }[];
  countries: { name: string; visits: number }[];
  areas: { name: string; views: number }[];
};
