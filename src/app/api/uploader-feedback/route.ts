import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/server/api-auth";
import { getDbOrNull } from "@/lib/server/works";

const CATEGORIES = new Set(["usability", "display", "feature", "other"]);

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("invalid_json", "The request could not be read.", 400);
  }
  const category = clean(body.category, 40);
  const message = clean(body.message, 4_000);
  if (!CATEGORIES.has(category)) return jsonError("invalid_category", "Choose a feedback category.", 400);
  if (message.length < 5) return jsonError("feedback_too_short", "Please add a little more detail.", 400);

  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "Feedback service is temporarily unavailable.", 503);
  const ref = await db.collection("uploaderFeedback").add({
    reporterUid: auth.session.uid,
    reporterEmail: auth.session.email ?? null,
    category,
    message,
    area: clean(body.area, 100) || null,
    pagePath: clean(body.pagePath, 500),
    locale: body.locale === "ja" ? "ja" : body.locale === "ko" ? "ko" : "en",
    userAgent: clean(body.userAgent, 600) || null,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true, feedbackId: ref.id });
}
