import { NextResponse } from "next/server";
import {
  describeUserAgent,
  isActivityType,
  isBotUserAgent,
  sanitizeActivityData,
  sanitizeActivityId,
  sanitizeActivityPath,
} from "@/lib/activity/events";
import { jsonError } from "@/lib/server/api-auth";
import { recordActivity, type ActivityToStore } from "@/lib/server/activity-log";
import { verifyBearerIdToken } from "@/lib/server/firebase-admin";
import { getDbOrNull } from "@/lib/server/works";

const MAX_BODY_BYTES = 100_000;
const MAX_EVENTS = 50;

/** Where a request came from, roughly (Vercel's edge geolocation; the IP itself isn't kept). */
function geo(headers: Headers) {
  const read = (name: string) => {
    const value = headers.get(name);
    if (!value) return null;
    try {
      return decodeURIComponent(value).slice(0, 80);
    } catch {
      return value.slice(0, 80);
    }
  };
  return { country: read("x-vercel-ip-country"), region: read("x-vercel-ip-country-region"), city: read("x-vercel-ip-city") };
}

/**
 * The activity log's intake (lib/activity/client.ts sends here): a batch of
 * what one browser did, signed in or not. A valid sign-in token ties the
 * batch, and that browser's earlier visits, to the account.
 */
export async function POST(request: Request) {
  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "The activity log is unavailable.", 503);

  const userAgent = request.headers.get("user-agent") ?? "";
  if (isBotUserAgent(userAgent)) return NextResponse.json({ ok: true, recorded: 0 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return jsonError("too_large", "Too many events at once.", 413);
  }

  let body: { visitorId?: unknown; sessionId?: unknown; sentAt?: unknown; events?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("invalid_body", "Invalid activity request.", 400);
  }
  const visitorId = sanitizeActivityId(body.visitorId);
  if (!visitorId || !Array.isArray(body.events)) {
    return jsonError("invalid_body", "A visitor and a list of events are required.", 400);
  }

  const events: ActivityToStore[] = body.events.slice(0, MAX_EVENTS).flatMap((raw) => {
    const event = raw as { type?: unknown; at?: unknown; path?: unknown; data?: unknown };
    const path = sanitizeActivityPath(event.path);
    if (!isActivityType(event.type) || !path || path === "/admin" || path.startsWith("/admin/")) return [];
    const at = typeof event.at === "number" && Number.isFinite(event.at) ? event.at : Date.now();
    return [{ type: event.type, at, path, data: sanitizeActivityData(event.data) }];
  });

  const session = await verifyBearerIdToken(request.headers.get("authorization"));
  const { device, browser, os } = describeUserAgent(userAgent);
  const recorded = await recordActivity(
    db,
    {
      uid: session?.uid ?? null,
      visitorId,
      sessionId: sanitizeActivityId(body.sessionId) ?? visitorId,
      device,
      browser,
      os,
      ...geo(request.headers),
    },
    events,
    typeof body.sentAt === "number" ? body.sentAt : Date.now()
  );
  return NextResponse.json({ ok: true, recorded });
}
