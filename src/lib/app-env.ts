/**
 * Which copy of OONA this is. The demo site (NEXT_PUBLIC_APP_ENV=demo) is
 * the same site, page for page, on its own Firebase project filled with the
 * made-up world (scripts/demo-seed.mjs, docs/demo-site.md). Nobody sees the
 * difference: it asks search engines not to index it, and it tags the
 * videos it uploads (xiio_env) so the Cloudflare account it shares with the
 * real site sends their webhooks nowhere they don't belong.
 */
export const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV?.trim() || "production";
export const IS_DEMO_SITE = APP_ENV === "demo";
