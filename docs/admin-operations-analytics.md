# Admin operations analytics

The `/admin` overview uses real XIIO telemetry and provider data. It does not insert mock operational values.

## What is collected

- Browser-session visits and acquisition source (`discover`, `direct`, `search`, `schools`, or `external`).
- Work view events.
- Playback heartbeats, active sessions, watch time, completion, and delivered resolution.
- Upload and review state from Firestore work, promo, and prologue documents.
- Cloudflare Stream delivered minutes, when the analytics token is configured.

Telemetry is written by server routes to `platformAnalyticsDaily`, `platformContentAnalytics`, `platformWatchSessions`, and `platformVisitDedup`. No client can write directly to these collections.

`firestore.indexes.json` enables TTL cleanup for visit-deduplication and playback-session documents. Deploy the Firestore configuration after release so those temporary collections do not grow indefinitely.

## Environment variables

```dotenv
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_ANALYTICS_API_TOKEN=
XIIO_SOURCE_STORAGE_COST_PER_GB_MONTH=
XIIO_MONTHLY_VIDEO_BUDGET_USD=
```

`CLOUDFLARE_ANALYTICS_API_TOKEN` should be a read-only Cloudflare token with **Account Analytics: Read**. If it is absent, the server falls back to `CLOUDFLARE_STREAM_API_TOKEN`. Delivery cost remains unavailable when neither token can query Stream analytics.

The source-storage rate and monthly budget are optional. Without a source-storage rate, source-storage cost is shown as unavailable rather than estimated with an invented price.

## Cost formulas

- Stream storage: stored minutes × `$5 / 1,000 minutes`.
- Stream delivery: delivered minutes × `$1 / 1,000 minutes`.
- Source storage: source GB × configured monthly rate.

These are estimates for operational monitoring, not invoices. Taxes, provider discounts, egress outside Stream, and non-video infrastructure are not included.

## Dashboard behavior

- Supports 24-hour, 7-day, and 30-day periods with prior-period comparison.
- Auto-refreshes every 15 seconds; provider responses are cached for one minute.
- CSV export is generated locally in the browser.
- Missing provider configuration is shown explicitly as unavailable.
- Existing Firestore view totals remain visible while new watch telemetry accumulates.

## Activity log

`/admin/activity` (and the "Activity log" section of `/admin/users/{uid}`) lists what people do on the site, one event at a time, newest first:

- every page opened (path and the page's main heading),
- every button and link clicked (by its label, and the link's target),
- every video played, paused, passed 25/50/75%, and finished (position and seconds actually watched),
- every search typed into a search box (the words, and which box),
- signing in, signing up, and signing out.

Nothing else typed is kept, and the admin console's own pages are not recorded. The demo (`?demo=1`) records nothing.

Visitors who aren't signed in are followed by a per-browser id (`oona.visitorId` in localStorage). When that browser first signs in to an account, what it did before is added to that account (marked "before sign-in").

### Where it's stored: MongoDB

The log lives in MongoDB, not Firestore. Each kind of thing has its own small collection with only its own fields:

| Collection | One document per | Fields of its own |
| --- | --- | --- |
| `page_views` | page opened | `heading`, `referrer` |
| `clicks` | button or link clicked | `label`, `href`, `element`, `checked` |
| `searches` | search | `query`, `box` |
| `video_events` | play, pause, 25/50/75%, finish | `action`, `title`, `position`, `duration`, `watched`, `percent`, `reason` |
| `auth_events` | sign-in, sign-up, sign-out | `action`, `method` |
| `sessions` | browser tab's visit | `device`, `browser`, `os`, `country`, `region`, `city`, `startedAt`, `lastSeenAt`, `landingPath` |
| `visitors` | browser | `uid`, `firstSeenAt`, `lastSeenAt` |

Every event also has `at`, `uid` (null before sign-in), `signedIn`, `visitorId`, `sessionId`, `path` and `area`. Device and place are kept once per visit in `sessions`, not on every event. The IP address is never stored, and crawlers are skipped.

Indexes are created by the server on first use. Each event collection is indexed by `at`, `uid`+`at`, `visitorId`+`at` and `signedIn`+`at`. Events, sessions and visitors are deleted after a year by TTL indexes.

- **Browser:** `src/components/ActivityRecorder.tsx` and `src/lib/activity/client.ts` batch events to `POST /api/activity` every few seconds and when the page is left.
- **Server:** `src/lib/server/mongo.ts` is the connection. `src/lib/server/activity/` holds the store:
  - `collections.ts`: the collections and their indexes
  - `record.ts`: writing a batch
  - `read.ts`: the admin console's reads
  - `people.ts`: names from Firestore and Firebase Auth
- **Reading:** `GET /api/admin/activity` (admins only) filters by person (uid, @handle, email or visitor id), signed in or not, and kind.

### Setup

```dotenv
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/?retryWrites=true&w=majority
MONGODB_DB=oona   # optional; "oona" by default
```

On MongoDB Atlas:

1. Create a cluster.
2. Create a database user with read and write access to that database.
3. Allow connections from the app. Vercel's IPs change, so either allow `0.0.0.0/0` or use the Vercel–Atlas integration.
4. Set both variables in Vercel.

Without `MONGODB_URI`, the site works as before. Nothing is recorded, and the admin page says the log isn't connected.

Because this records individual behaviour, the site's privacy policy should say so before launch.
