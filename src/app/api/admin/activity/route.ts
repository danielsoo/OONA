import { NextResponse } from "next/server";
import { isActivityCategory, sanitizeActivityId } from "@/lib/activity/events";
import { findAccount, actorsOf } from "@/lib/server/activity/people";
import { listActivity, visitorExists, type ActivityFilter } from "@/lib/server/activity/read";
import { requireAdmin } from "@/lib/server/api-auth";
import { getMongoDb } from "@/lib/server/mongo";
import { getDbOrNull } from "@/lib/server/works";

/**
 * The admin console's activity log: everything people did, newest first,
 * from MongoDB (lib/server/activity). Narrowed by `who` (a uid, @handle,
 * email or visitor id), `uid` or `visitor`; by `people` (members |
 * visitors); and by `category`. Paged by `cursor`.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const mongo = await getMongoDb().catch(() => null);
  if (!mongo) return NextResponse.json({ events: [], nextCursor: null, resolved: null, notConfigured: true });
  const firestore = await getDbOrNull();

  const params = new URL(request.url).searchParams;
  const filter: ActivityFilter = {};
  let resolved: { uid?: string; visitorId?: string; name?: string } | null = null;

  const who = params.get("who")?.trim();
  if (who) {
    const visitorId = sanitizeActivityId(who);
    const account = await findAccount(firestore, who);
    if (account) {
      filter.uid = account.uid;
      resolved = account;
    } else if (visitorId && (await visitorExists(mongo, visitorId))) {
      filter.visitorId = visitorId;
      resolved = { visitorId };
    } else {
      return NextResponse.json({ events: [], nextCursor: null, resolved: null, notFound: true });
    }
  } else if (params.get("uid")) {
    filter.uid = params.get("uid")!.slice(0, 128);
  } else if (sanitizeActivityId(params.get("visitor"))) {
    filter.visitorId = params.get("visitor")!;
  } else if (params.get("people") === "members" || params.get("people") === "visitors") {
    filter.signedIn = params.get("people") === "members";
  }
  const category = params.get("category");
  if (isActivityCategory(category)) filter.category = category;

  const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 50));
  const page = await listActivity(mongo, filter, params.get("cursor"), limit);
  const actors = await actorsOf(firestore, page.events.flatMap((e) => (e.uid ? [e.uid] : [])));
  const events = page.events.map((e) => ({ ...e, actor: e.uid ? actors.get(e.uid) ?? null : null }));
  return NextResponse.json({ events, nextCursor: page.nextCursor, resolved });
}
