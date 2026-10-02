import { NextResponse } from "next/server";

/**
 * iOS universal links for the OONA app (mobile/): links to these paths open
 * the app instead of Safari. Needs APPLE_TEAM_ID (Apple Developer > Membership);
 * without it the file is empty and links keep opening the website.
 */
const APP_LINK_PATHS = ["/watch/*", "/people/*", "/collab-invite/*", "/messages/*"];

export function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const bundleId = process.env.APPLE_BUNDLE_ID?.trim() || "com.xiio.oona";
  const details = teamId ? [{ appIDs: [`${teamId}.${bundleId}`], components: APP_LINK_PATHS.map((p) => ({ "/": p })) }] : [];
  return NextResponse.json(
    { applinks: { details } },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
