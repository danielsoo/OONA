import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { buildNaverAuthorizeUrl } from "@/lib/server/naverAuth";
import { APP_FLOW_COOKIE } from "@/lib/server/appAuthRedirect";
import { getRequestOrigin } from "@/lib/server/socialAuth";

const STATE_COOKIE = "naver_oauth_state";
const COOKIE_MAX_AGE = 600;

export async function GET(request: Request) {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "naver_not_configured" }, { status: 503 });
  }

  const origin = getRequestOrigin(request);
  const redirectUri = `${origin}/api/auth/naver/callback`;
  const state = randomBytes(24).toString("hex");

  const authorizeUrl = buildNaverAuthorizeUrl({
    clientId,
    redirectUri,
    state,
  });

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  // ?app=1: the mobile app started this; the callback sends the result back to it.
  if (new URL(request.url).searchParams.get("app") === "1") {
    response.cookies.set(APP_FLOW_COOKIE, "1", {
      httpOnly: true,
      secure: origin.startsWith("https"),
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }
  return response;
}
