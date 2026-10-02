import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { buildKakaoAuthorizeUrl } from "@/lib/server/kakaoAuth";
import { getRequestOrigin } from "@/lib/server/socialAuth";

const STATE_COOKIE = "kakao_oauth_state";
const COOKIE_MAX_AGE = 600;

/**
 * Kakao sign-in for the mobile app (the website signs in with the Kakao JS
 * SDK). Needs KAKAO_REST_API_KEY, and `{origin}/api/auth/kakao/callback`
 * registered as a Redirect URI in Kakao Developers.
 */
export async function GET(request: Request) {
  const clientId = process.env.KAKAO_REST_API_KEY?.trim();
  if (!clientId) return NextResponse.json({ error: "kakao_not_configured" }, { status: 503 });

  const origin = getRequestOrigin(request);
  const state = randomBytes(24).toString("hex");
  const response = NextResponse.redirect(
    buildKakaoAuthorizeUrl({ clientId, redirectUri: `${origin}/api/auth/kakao/callback`, state })
  );
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}
