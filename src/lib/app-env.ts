/**
 * Which copy of OONA this is. The demo site (NEXT_PUBLIC_APP_ENV=demo) is
 * the same site, page for page, on its own Firebase project filled with the
 * made-up world (scripts/demo-seed.mjs, docs/demo-site.md). The one thing
 * that differs, and nobody sees: it asks search engines not to index it.
 */
export const IS_DEMO_SITE = process.env.NEXT_PUBLIC_APP_ENV === "demo";
