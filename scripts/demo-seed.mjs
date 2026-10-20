#!/usr/bin/env node
/**
 * Fills a demo Firebase project with OONA's made-up world (src/lib/demo-world.ts)
 * so a demo copy of the site — the same site, page for page, pointed at that
 * project — can be tried end to end: watching, Society, profiles, portfolios,
 * messages, notifications, uploading, the admin pages. See docs/demo-site.md.
 *
 *   node --experimental-strip-types scripts/demo-seed.mjs \
 *     --project oona-demo --database xiio [--apply] [--reset] [--password …] \
 *     [--videos-dir DIR] [--no-videos]
 *
 * The works' videos go to the demo's own Cloudflare Stream first (see
 * lib/demo-stream.mjs): one clip per still from scripts/demo-media, or from
 * --videos-dir with the same file names to use your own footage. A reset
 * reuses the ones already there. --no-videos skips Cloudflare (local tries
 * on the emulators): the works are then seeded as still processing, and the
 * site keeps them out of its lists as it would any upload that isn't ready.
 *
 * Without --apply it only says what it would do. With --apply it seeds an
 * empty database. --reset wipes a database this script seeded before (and
 * the demo sign-in accounts) and seeds it again.
 *
 * It will not touch OONA's real project, and it only ever wipes a database
 * that carries the marker it leaves (site/demoSeed): a database with users in
 * it and no marker is refused, seeded or not.
 *
 * Credentials: FIREBASE_SERVICE_ACCOUNT_JSON (the demo project's service
 * account; its project must match --project), or Application Default
 * Credentials, or the local emulators (FIRESTORE_EMULATOR_HOST and
 * FIREBASE_AUTH_EMULATOR_HOST set).
 */
import { applicationDefault, cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_STILLS } from "../src/lib/demo-world.ts";
import { buildDemoSeed, DEMO_ACCOUNT_DOMAIN } from "./lib/demo-seed-data.mjs";
import { ensureStreams, streamCredentials } from "./lib/demo-stream.mjs";

/** OONA's real project: never a target. */
const PRODUCTION_PROJECTS = new Set(["xiio-9d86b"]);
const MARKER = ["site", "demoSeed"];

function parseArgs(argv) {
  const options = { apply: false, reset: false, project: "", database: "", password: "", "videos-dir": join(dirname(fileURLToPath(import.meta.url)), "demo-media"), videos: true };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--apply") options.apply = true;
    else if (key === "--reset") options.reset = true;
    else if (key === "--no-videos") options.videos = false;
    else if (key === "--project" || key === "--database" || key === "--password" || key === "--videos-dir") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) throw Error(`${key} needs a value`);
      options[key.slice(2)] = value;
      i += 1;
    } else throw Error(`Unknown option ${key}`);
  }
  if (!options.project || !options.database) {
    throw Error('Specify --project YOUR_DEMO_PROJECT_ID --database YOUR_DATABASE_ID (use "(default)" explicitly for the default database).');
  }
  if (PRODUCTION_PROJECTS.has(options.project)) throw Error(`${options.project} is OONA's real project. The demo seed never runs there.`);
  return options;
}

function credentialFor(project) {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return applicationDefault();
  const account = JSON.parse(json);
  const accountProject = account.project_id || account.projectId;
  if (PRODUCTION_PROJECTS.has(accountProject)) throw Error("FIREBASE_SERVICE_ACCOUNT_JSON is OONA's real project's key. Use the demo project's.");
  if (accountProject !== project) throw Error(`The service account is for ${accountProject}, not --project ${project}. Check the target.`);
  return cert(account);
}

async function wipe(db, auth, accountUids) {
  // Everything: a demo database holds the seed and whatever visitors added to it.
  for (const collection of await db.listCollections()) {
    await db.recursiveDelete(collection);
  }
  // The sign-in accounts the seed made (and any left from an older seed).
  const stale = new Set(accountUids);
  let page;
  do {
    page = await auth.listUsers(1000, page?.pageToken);
    for (const user of page.users) if (user.email?.endsWith(`@${DEMO_ACCOUNT_DOMAIN}`)) stale.add(user.uid);
  } while (page.pageToken);
  const uids = [...stale];
  for (let i = 0; i < uids.length; i += 1000) await auth.deleteUsers(uids.slice(i, i + 1000));
}

async function writeAll(db, docs) {
  // Batches of up to 400 writes (Firestore allows 500).
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    for (const { path, data } of docs.slice(i, i + 400)) batch.set(db.doc(path), data);
    await batch.commit();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const emulated = !!process.env.FIRESTORE_EMULATOR_HOST;
  console.log(`Target: project=${options.project}, database=${options.database}, emulator=${emulated ? process.env.FIRESTORE_EMULATOR_HOST : "none"}, mode=${options.apply ? (options.reset ? "RESET + SEED" : "SEED") : "DRY RUN (no writes)"}`);

  const creds = streamCredentials();
  if (options.videos && !creds && options.apply) {
    throw Error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN (the demo's Cloudflare account) so the works have videos, or pass --no-videos.");
  }
  if (!options.videos) console.log("No videos: the works will be seeded as still processing, and stay out of the site's lists.");

  // What it would write (the real stream ids come after the upload).
  const preview = buildDemoSeed({ password: options.password || undefined, streams: options.videos ? Object.fromEntries(Object.values(DEMO_STILLS).map((p) => [p, "pending"])) : {}, now: new Date() });
  const counts = {};
  for (const { path } of preview.docs) {
    const top = path.split("/").filter((_, i) => i % 2 === 0).join("/");
    counts[top] = (counts[top] ?? 0) + 1;
  }
  console.log(`Seed: ${preview.docs.length} documents, ${preview.accounts.length} sign-in accounts${options.videos ? `, ${Object.keys(DEMO_STILLS).length} videos` : ""}`);
  for (const [path, n] of Object.entries(counts).sort()) console.log(`  ${path.padEnd(44)} ${n}`);

  const app = initializeApp({ projectId: options.project, ...(emulated ? {} : { credential: credentialFor(options.project) }) }, "oona-demo-seed");
  try {
    const db = getFirestore(app, options.database);
    const auth = getAuth(app);
    const marker = await db.doc(MARKER.join("/")).get();
    const anyUser = await db.collection("users").limit(1).get();
    if (!marker.exists && !anyUser.empty) {
      throw Error("This database has users and no demo marker: it isn't one this script seeded. Refusing to touch it.");
    }
    if (marker.exists && !options.reset) {
      throw Error("This database is already seeded. Use --reset to wipe it and seed it again.");
    }
    if (options.reset && !marker.exists) console.log("Nothing seeded here yet: --reset just seeds.");
    if (!options.apply) {
      console.log("Dry run: nothing written. Add --apply to write.");
      return;
    }

    let streamsByKey = {};
    if (options.videos) {
      console.log("Videos on the demo's Cloudflare Stream…");
      const result = await ensureStreams(creds, { stills: DEMO_STILLS, clipsDir: options["videos-dir"], previous: marker.data()?.streams ?? {}, log: console.log });
      streamsByKey = result.streams;
      console.log(`  ${Object.keys(streamsByKey).length - result.uploaded} reused, ${result.uploaded} uploaded`);
    }
    const streams = Object.fromEntries(Object.entries(streamsByKey).map(([key, uid]) => [DEMO_STILLS[key], uid]));
    const seed = buildDemoSeed({ password: options.password || undefined, streams, now: new Date() });

    if (marker.exists) {
      console.log("Wiping the previous seed…");
      await wipe(db, auth, seed.accounts.map((a) => a.uid));
    }
    console.log("Creating sign-in accounts…");
    for (const account of seed.accounts) {
      await auth.createUser({ uid: account.uid, email: account.email, password: account.password, displayName: account.displayName, emailVerified: true });
    }
    console.log("Writing documents…");
    await writeAll(db, seed.docs);
    await db.doc(MARKER.join("/")).set({ demo: true, seededAt: new Date(), version: seed.version, accounts: seed.accounts.map((a) => a.email), streams: streamsByKey });

    console.log("\nDone. Sign in on the demo site with:");
    for (const account of seed.accounts) console.log(`  ${account.email}  /  ${account.password}   (${account.displayName})`);
  } finally {
    await deleteApp(app);
  }
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
});
