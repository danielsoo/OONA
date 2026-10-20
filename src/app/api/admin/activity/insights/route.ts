import { NextResponse } from "next/server";
import { activityInsights } from "@/lib/server/activity/insights";
import { requireAdmin } from "@/lib/server/api-auth";
import { getMongoDb } from "@/lib/server/mongo";
import { INSIGHTS_RANGES, type InsightsRange } from "@/types/activity-insights";

/** The admin console's activity charts for `range` (24h | 7d | 30d | 90d), from MongoDB. */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const mongo = await getMongoDb().catch(() => null);
  if (!mongo) return NextResponse.json({ notConfigured: true });
  const asked = new URL(request.url).searchParams.get("range");
  const range: InsightsRange = (INSIGHTS_RANGES as readonly string[]).includes(asked ?? "") ? (asked as InsightsRange) : "7d";
  return NextResponse.json(await activityInsights(mongo, range));
}
