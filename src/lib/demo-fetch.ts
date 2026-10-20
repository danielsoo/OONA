import { isDemoVisit } from "@/lib/demo-flags";

let installed = false;

/**
 * In the demo, the site's own API calls (/api/*) are answered in the browser
 * from the made-up world (lib/demo-api.ts, fetched on first use) instead of
 * reaching the server: no real data shows, and nothing the visitor does is
 * saved. Anything else (images, fonts, other sites) goes out as usual.
 * Installed when the app's code first runs, before any page asks for data.
 */
export function installDemoFetch(): void {
  if (installed || typeof window === "undefined" || !isDemoVisit()) return;
  installed = true;
  const realFetch = window.fetch.bind(window);
  let api: Promise<typeof import("@/lib/demo-api")> | null = null;
  window.fetch = async (input, init) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) return realFetch(input, init);
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    api ??= import("@/lib/demo-api");
    const body = typeof init?.body === "string" ? init.body : undefined;
    const answer = (await api).answerDemoApi(url, method, body);
    return answer ?? realFetch(input, init);
  };
}

installDemoFetch();
