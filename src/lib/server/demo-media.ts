import { IS_DEMO_SITE } from "@/lib/app-env";

export type DemoMedia = { posterUrl: string; playbackUrl: string | null };

/**
 * A seeded work on the demo site (docs/demo-site.md) has no Cloudflare Stream
 * video of its own: it shows its poster (promoDraft.thumbnailUrl, one of the
 * demo world's stills) and plays the sample clip the seed gave it
 * (demoPlaybackUrl), if any. Everywhere a published work needs a ready video
 * to be listed or watched, the demo site takes this instead.
 *
 * Null off the demo site, and for any work with a real video — so the real
 * site, and real uploads on the demo site, go the usual way.
 */
export function demoMedia(data: Record<string, unknown> | undefined): DemoMedia | null {
  if (!IS_DEMO_SITE || !data) return null;
  if (data.streamStatus === "ready" && data.streamUid) return null;
  const draft = data.promoDraft as { thumbnailUrl?: unknown } | undefined;
  const posterUrl = typeof draft?.thumbnailUrl === "string" ? draft.thumbnailUrl.trim() : "";
  if (!posterUrl) return null;
  const playback = typeof data.demoPlaybackUrl === "string" && data.demoPlaybackUrl.startsWith("https://") ? data.demoPlaybackUrl : null;
  return { posterUrl, playbackUrl: playback };
}
