import { NextResponse } from "next/server";
import { fetchCreditsRoll } from "@/lib/server/credits-roll";
import { FEED_CACHE_HEADERS } from "@/lib/server/home-feeds";
import { getDbOrNull } from "@/lib/server/works";

/** Published works with their confirmed credits, for the credits home (/credits). */
export async function GET() {
  const db = await getDbOrNull();
  if (!db) return NextResponse.json({ works: [] });
  try {
    const works = await fetchCreditsRoll(db);
    return NextResponse.json({ works }, { headers: FEED_CACHE_HEADERS });
  } catch (error) {
    // Not cached: an outage must not look like "no credits yet".
    console.warn("Credits roll is temporarily unavailable.", error);
    return NextResponse.json({ works: [], error: "unavailable" }, { status: 503 });
  }
}
