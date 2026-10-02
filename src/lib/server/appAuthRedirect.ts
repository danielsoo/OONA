import { NextResponse } from "next/server";

/**
 * Where the mobile app (mobile/) receives Kakao/Naver sign-in results. Fixed
 * to the app's own scheme so the redirect can never point anywhere else.
 */
const APP_AUTH_CALLBACK = "oona://auth/callback";

export const APP_FLOW_COOKIE = "social_auth_app";

export function appAuthRedirect(result: { token: string } | { error: string }): NextResponse {
  const url = new URL(APP_AUTH_CALLBACK);
  if ("token" in result) url.searchParams.set("token", result.token);
  else url.searchParams.set("error", result.error);
  const response = NextResponse.redirect(url.toString());
  response.cookies.set(APP_FLOW_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
  return response;
}
