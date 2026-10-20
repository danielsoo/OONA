import { NextResponse } from "next/server";
import { isActivityCategory, sanitizeActivityId } from "@/lib/activity/events";
import { jsonError, requireAdmin } from "@/lib/server/api-auth";
import {
  ActivityIndexPendingError,
  listActivity,
  resolveActivityActor,
  type ActivityFilter,
} from "@/lib/server/activity-log";
import { getDbOrNull } from "@/lib/server/works";

/**
 * The admin console's activity log: everything people did, newest first.
 * Narrowed by `who` (a uid, @handle, email or visitor id), `uid` or
 * `visitor`; by `people` (members | visitors); and by `category`. Paged by
 * `cursor`.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "The activity log is unavailable.", 503);

  const params = new URL(request.url).searchParams;
  const filter: ActivityFilter = {};
  let resolved: { uid?: string; visitorId?: string; name?: string } | null = null;

  const who = params.get("who")?.trim();
  if (who) {
    const actor = await resolveActivityActor(db, who);
    if (!actor) return NextResponse.json({ events: [], nextCursor: null, resolved: null, notFound: true });
    if ("uid" in actor) {
      filter.uid = actor.uid;
      resolved = { uid: actor.uid, name: actor.name };
    } else {
      filter.visitorId = actor.visitorId;
      resolved = { visitorId: actor.visitorId };
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
  try {
    const page = await listActivity(db, filter, params.get("cursor"), limit);
    return NextResponse.json({ ...page, resolved });
  } catch (error) {
    if (error instanceof ActivityIndexPendingError) {
      return NextResponse.json({ events: [], nextCursor: null, resolved, indexPending: true });
    }
    throw error;
  }
}
