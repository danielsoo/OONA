import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { ensureStreams } from "./demo-stream.mjs";

// A stand-in for Cloudflare's Stream API: uploads get a uid, and a video is
// ready the second time it's looked at.
const videos = new Map();
const requests = [];
let server;
before(async () => {
  server = createServer((req, res) => {
    requests.push(`${req.method} ${req.url} ${req.headers.authorization}`);
    const send = (status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
    const m = req.url.match(/^\/accounts\/acc\/stream(?:\/([^/?]+))?$/);
    if (!m) return send(404, { success: false });
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", () => {
      if (req.method === "POST" && !m[1]) {
        assert.match(req.headers["content-type"], /multipart\/form-data/);
        const uid = `vid${videos.size + 1}`;
        videos.set(uid, { looks: 0, meta: {} });
        return send(200, { success: true, result: { uid } });
      }
      const video = videos.get(m[1]);
      if (!video) return send(404, { success: false, errors: [{ message: "not found" }] });
      if (req.method === "POST") {
        const body = JSON.parse(raw);
        assert.equal(body.requireSignedURLs, false);
        video.meta = body.meta;
        return send(200, { success: true, result: { uid: m[1] } });
      }
      video.looks += 1;
      return send(200, { success: true, result: { uid: m[1], readyToStream: video.looks > 1, meta: video.meta } });
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  process.env.CLOUDFLARE_API_BASE = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

describe("demo videos on Cloudflare Stream", () => {
  const creds = { accountId: "acc", token: "tok" };
  const stills = { a: "/images/a.jpg", b: "/images/b.jpg" };

  it("uploads one public, named clip per still and waits until they play", async () => {
    const dir = await mkdtemp(join(tmpdir(), "clips-"));
    await writeFile(join(dir, "a.mp4"), "fake-a");
    await writeFile(join(dir, "b.mp4"), "fake-b");
    const { streams, uploaded } = await ensureStreams(creds, { stills, clipsDir: dir });
    assert.equal(uploaded, 2);
    assert.deepEqual(Object.keys(streams).sort(), ["a", "b"]);
    for (const uid of Object.values(streams)) {
      assert.equal(videos.get(uid).meta.name.startsWith("oona-demo "), true);
      assert.ok(videos.get(uid).looks >= 2, "waited for it to be ready");
    }
    assert.ok(requests.every((r) => r.endsWith("Bearer tok")));
  });

  it("reuses the videos still there and uploads only what's gone", async () => {
    const dir = await mkdtemp(join(tmpdir(), "clips-"));
    await writeFile(join(dir, "a.mp4"), "fake-a");
    await writeFile(join(dir, "b.mp4"), "fake-b");
    const before = videos.size;
    const { streams, uploaded } = await ensureStreams(creds, { stills, clipsDir: dir, previous: { a: "vid1", b: "deleted-on-the-dashboard" } });
    assert.equal(uploaded, 1);
    assert.equal(streams.a, "vid1");
    assert.equal(videos.size, before + 1);
  });
});
