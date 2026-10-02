import { cookies } from "next/headers";
import { appAuthRedirect } from "@/lib/server/appAuthRedirect";
import { exchangeKakaoCode, fetchKakaoProfile } from "@/lib/server/kakaoAuth";
import {
  ADMIN_NOT_CONFIGURED,
  AccountEmailConflictError,
  findOrCreateFirebaseUser,
  getRequestOrigin,
} from "@/lib/server/socialAuth";

const STATE_COOKIE = "kakao_oauth_state";

function fail(code: string) {
  const response = appAuthRedirect({ error: code });
  response.cookies.set(STATE_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
  return response;
}

/** Finishes the app's Kakao sign-in and hands a Firebase custom token back to the app. */
export async function GET(request: Request) {
  const origin = getRequestOrigin(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (url.searchParams.get("error")) return fail("kakao_denied");
  if (!code || !state) return fail("kakao_invalid");

  const savedState = (await cookies()).get(STATE_COOKIE)?.value;
  if (!savedState || savedState !== state) return fail("kakao_state_mismatch");

  const clientId = process.env.KAKAO_REST_API_KEY?.trim();
  if (!clientId) return fail("kakao_not_configured");

  const accessToken = await exchangeKakaoCode({
    code,
    clientId,
    clientSecret: process.env.KAKAO_CLIENT_SECRET?.trim() || undefined,
    redirectUri: `${origin}/api/auth/kakao/callback`,
  });
  if (!accessToken) return fail("kakao_token_failed");

  const profile = await fetchKakaoProfile(accessToken);
  if (!profile) return fail("kakao_profile_failed");

  try {
    const { customToken } = await findOrCreateFirebaseUser({
      provider: "kakao",
      providerUserId: profile.id,
      email: profile.email,
      displayName: profile.displayName,
    });
    const response = appAuthRedirect({ token: customToken });
    response.cookies.set(STATE_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
    return response;
  } catch (e: unknown) {
    if (e instanceof AccountEmailConflictError) return fail("account_exists");
    if (e instanceof Error && e.message === ADMIN_NOT_CONFIGURED) return fail("admin_not_configured");
    console.error("[auth/kakao/callback]", e);
    return fail("auth_failed");
  }
}
