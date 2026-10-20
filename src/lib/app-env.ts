/**
 * Which copy of OONA this is. The demo site (NEXT_PUBLIC_APP_ENV=demo) is
 * the same app on its own Firebase project, filled with the made-up world
 * (scripts/demo-seed.ts) for advisors and visitors to try everything in;
 * it says so on every page and stays out of search engines.
 */
export const IS_DEMO_SITE = process.env.NEXT_PUBLIC_APP_ENV === "demo";
