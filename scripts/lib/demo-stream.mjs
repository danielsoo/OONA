/**
 * The demo's videos on its own Cloudflare Stream: one clip per still of the
 * made-up world (scripts/demo-media/<still>.mp4, short slow zooms over each
 * still), uploaded once and reused by every reset, so the demo's works play,
 * list and preview exactly as real uploads do on the real site.
 *
 * CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN: the demo's
 * Cloudflare account (not the real site's). CLOUDFLARE_API_BASE only points
 * this at a stand-in API in tests.
 */
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const apiBase = () => (process.env.CLOUDFLARE_API_BASE || "https://api.cloudflare.com/client/v4").replace(/\/$/, "");

export function streamCredentials() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN?.trim();
  return accountId && token ? { accountId, token } : null;
}

async function call(creds, path, init = {}) {
  const res = await fetch(`${apiBase()}/accounts/${creds.accountId}/stream${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${creds.token}`, ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/** The video, if it's still there (a reset reuses what the last seed uploaded). */
export async function findVideo(creds, uid) {
  const { status, body } = await call(creds, `/${encodeURIComponent(uid)}`);
  return status === 200 && body.success ? body.result : null;
}

/** Uploads a clip as a public video, named so it's easy to spot in the dashboard. */
export async function uploadClip(creds, filePath, name) {
  const form = new FormData();
  form.append("file", new Blob([await readFile(filePath)], { type: "video/mp4" }), basename(filePath));
  const { status, body } = await call(creds, "", { method: "POST", body: form });
  if (status !== 200 || !body.success || !body.result?.uid) {
    throw Error(`Cloudflare Stream refused ${basename(filePath)} (${status}): ${JSON.stringify(body.errors ?? body).slice(0, 300)}`);
  }
  const uid = body.result.uid;
  // Public like every real upload (createDirectUpload: requireSignedURLs false).
  await call(creds, `/${uid}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // xiio_env: the real site's webhook (the account's only one) leaves demo videos alone.
    body: JSON.stringify({ meta: { name, xiio_env: "demo" }, requireSignedURLs: false }),
  });
  return uid;
}

/** Waits until every video can be played (Stream encodes a 10 s clip in well under a minute). */
export async function waitUntilReady(creds, uids, { timeoutMs = 10 * 60_000, everyMs = 4000 } = {}) {
  const pending = new Set(uids);
  const started = Date.now();
  while (pending.size) {
    for (const uid of [...pending]) {
      const video = await findVideo(creds, uid);
      if (video?.readyToStream) pending.delete(uid);
      else if (video?.status?.state === "error") throw Error(`Cloudflare Stream couldn't encode ${uid}: ${video.status.errorReasonText ?? "error"}`);
    }
    if (!pending.size) break;
    if (Date.now() - started > timeoutMs) throw Error(`Still encoding after ${Math.round(timeoutMs / 60000)} min: ${[...pending].join(", ")}`);
    await new Promise((r) => setTimeout(r, everyMs));
  }
}

/**
 * Each still's video uid by still key: the ones the last seed left (if
 * they're still on the account), and fresh uploads for the rest.
 */
export async function ensureStreams(creds, { stills, clipsDir, previous = {}, log = () => {} }) {
  const streams = {};
  const uploaded = [];
  for (const key of Object.keys(stills)) {
    const kept = previous[key] ? await findVideo(creds, previous[key]) : null;
    if (kept) {
      streams[key] = previous[key];
      continue;
    }
    log(`  uploading ${key}.mp4`);
    streams[key] = await uploadClip(creds, `${clipsDir}/${key}.mp4`, `oona-demo ${key}`);
    uploaded.push(streams[key]);
  }
  if (uploaded.length) {
    log(`  waiting for Cloudflare to encode ${uploaded.length} video(s)…`);
    await waitUntilReady(creds, uploaded);
  }
  return { streams, uploaded: uploaded.length };
}
