import { NextResponse } from "next/server";

/**
 * Android App Links for the OONA app (mobile/). ANDROID_APP_SHA256 holds the
 * signing certificate fingerprints (comma-separated; include the Play App
 * Signing key from Play Console). Without it the list is empty and links keep
 * opening the website.
 */
export function GET() {
  const fingerprints = (process.env.ANDROID_APP_SHA256 ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const packageName = process.env.ANDROID_PACKAGE_NAME?.trim() || "com.xiio.oona";
  const statements = fingerprints.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: { namespace: "android_app", package_name: packageName, sha256_cert_fingerprints: fingerprints },
        },
      ]
    : [];
  return NextResponse.json(statements, { headers: { "Cache-Control": "public, max-age=3600" } });
}
