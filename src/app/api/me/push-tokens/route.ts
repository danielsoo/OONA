import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/server/api-auth";
import { deletePushToken, isExpoPushToken, savePushToken } from "@/lib/server/push";
import { getDbOrNull } from "@/lib/server/works";

/** Registers the mobile app's Expo push token for the signed-in user. */
export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  let body: { token?: unknown; platform?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("invalid_json", "요청 형식(JSON)이 올바르지 않습니다.", 400);
  }
  if (!isExpoPushToken(body.token)) return jsonError("invalid_token", "푸시 토큰 형식이 올바르지 않습니다.", 400);

  await savePushToken(db, auth.session.uid, body.token, typeof body.platform === "string" ? body.platform : "unknown");
  return NextResponse.json({ ok: true });
}

/** Removes a token on sign-out so the device stops receiving this user's pushes. */
export async function DELETE(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);

  const token = new URL(request.url).searchParams.get("token");
  if (!isExpoPushToken(token)) return jsonError("invalid_token", "푸시 토큰 형식이 올바르지 않습니다.", 400);

  await deletePushToken(db, auth.session.uid, token);
  return NextResponse.json({ ok: true });
}
