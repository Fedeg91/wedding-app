# Milestone 7 load-test report

Test date: 2026-08-16 (Europe/Rome). Environment: optimized Next.js production build on Windows/Node 24 at `127.0.0.1:3100`, using the configured remote Supabase project. k6 1.8.0 ran locally. Target data was the isolated `load-test-event` with 20 seed guests and 3,000 synthetic photo metadata rows. No production event received write load.

The numbers below are measured end-to-end HTTP latency. Threshold failures make k6 exit non-zero by design. All measured scenarios returned zero 5xx and zero 429 responses.

## QR burst

Each iteration requested event, first feed page and guest list in a batch. Ramp-up was 15 seconds, including the requested 0→150 VU ramp. The measured run then held the level for 3 seconds and ramped down for 5 seconds.

| VUs | Requests | req/s | p50 | p95 | p99 | HTTP failures | 5xx | 429 | Result |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|:---|
| 20 | 480 | 20.14 | 424 ms | 1,280 ms | 1,518 ms | 0% | 0 | 0 | FAIL latency |
| 50 | 639 | 27.33 | 1,226 ms | 4,034 ms | 7,130 ms | 0% | 0 | 0 | FAIL latency |
| 100 | 732 | 28.43 | 2,765 ms | 13,191 ms | 14,607 ms | 0% | 0 | 0 | FAIL latency |
| 150 | 882 | 28.04 | 6,941 ms | 16,241 ms | 17,463 ms | 0% | 0 | 0 | FAIL latency |
| 200 | 915 | 28.44 | 6,449 ms | 18,116 ms | 19,948 ms | 0% | 0 | 0 | FAIL latency |

The plateau around 28 requests/second and rising queueing latency indicate that the local server-to-remote-Supabase path was saturated. Reliability remained intact, but none of the tested levels met the target latency.

## Feed scroll after cursor fix

Each VU requested the event and three 20-item pages, using the real cursor and a random 1–3 second reading delay between pages. The configured active duration was 3 seconds; k6 allowed in-flight realistic iterations to finish.

| VUs | Requests | req/s | p50 | p95 | p99 | HTTP failures | 5xx | 429 | Result |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|:---|
| 20 | 80 | 7.24 | 568 ms | 852 ms | 873 ms | 0% | 0 | 0 | FAIL p95 |
| 50 | 200 | 14.48 | 1,077 ms | 2,408 ms | 2,748 ms | 0% | 0 | 0 | FAIL latency |
| 100 | 400 | 19.88 | 2,394 ms | 4,660 ms | 5,272 ms | 0% | 0 | 0 | FAIL latency |
| 150 | 600 | 20.67 | 3,405 ms | 9,887 ms | 16,159 ms | 0% | 0 | 0 | FAIL latency |
| 200 | 800 | 24.24 | 6,004 ms | 9,733 ms | 10,227 ms | 0% | 0 | 0 | FAIL latency |

The first run exposed a real defect: PostgreSQL returned timestamps ending in `+00:00`, while cursor validation only accepted `Z`. Page 2 returned HTTP 400. The cursor now accepts ISO offsets; after rebuilding, every scrolling check passed. A full traversal verified newest and oldest ordering across 60 pages: 3,000 rows, 3,000 unique IDs. The guest filter returned 150/150 unique rows over three pages. No duplicate or skipped ID was observed, including tied timestamps.

## Guest creation and upload signature

Guest onboarding at 20 VUs (event → unique guest POST → feed) measured 60 requests: p50 655 ms, p95 933 ms, p99 1,004 ms, 14.61 req/s, 0% failures, zero 5xx/429. It failed the 500 ms p95 target. Created test guests are removed by event cleanup.

| Signature VUs | Requests | req/s | p50 | p95 | p99 | failures / 5xx / 429 |
|---:|---:|---:|---:|---:|---:|:---|
| 20 | 40 | 9.54 | 938 ms | 1,170 ms | 1,180 ms | 0% / 0 / 0 |
| 50 | 88 | 18.25 | 1,240 ms | 2,100 ms | 2,160 ms | 0% / 0 / 0 |
| 100 | 108 | 16.73 | 4,190 ms | 5,410 ms | 5,420 ms | 0% / 0 / 0 |

All responses contained a valid signature and upload URL. Signature generation itself is local cryptography, but each request intentionally validates event and guest in Supabase; those database round trips dominate under contention.

## Database review

The query shapes align with existing indexes:

- public feed: `photos_event_created_at_idx (event_id, created_at DESC, id DESC)`;
- guest-filtered feed: `photos_event_guest_created_at_idx (event_id, guest_id, created_at DESC, id DESC)`;
- guest list: `guests_event_nickname_idx (event_id, nickname)`;
- idempotency: unique constraints on `client_upload_id` and `cloudinary_public_id` from the upload migration.

The feed also filters `status = 'published'`, so the current indexes are not perfectly covering. No index migration was added without an actual PostgreSQL plan. Read-only `EXPLAIN (ANALYZE, BUFFERS)` statements are provided in `supabase/diagnostics/load-test-explain.sql`; they were not executed because this environment has service-role REST access but no direct SQL/SQL Editor connection and PostgREST query-plan output is not enabled. This is a remaining production check, not a fabricated finding.

The server reuses a module-level Supabase client, creates no client in a photo loop, and exposes no service-role client to the browser. On Vercel, Supabase's HTTP API remains serverless-friendly; monitor Supabase API/database saturation and use its built-in pooling settings where applicable.

## Photo metadata and Cloudinary

`photo-metadata-idempotency.js` is deliberately gated by `PHOTO_METADATA_JSON`. The API verifies ownership against Cloudinary, so arbitrary synthetic public IDs would be invalid. No metadata concurrency result is claimed because no dedicated Cloudinary fixture asset was available. Likewise, the current gallery contained legacy Unsplash mock URLs, not a measurable Cloudinary sample; therefore no Cloudinary byte sizes or bandwidth estimate are reported. This avoids presenting mock delivery as production CDN evidence.

No bulk binary upload was performed. Code inspection confirms the browser sends files directly to Cloudinary's upload URL; Next.js only signs and persists metadata. The queue unit tests cover a maximum of three concurrent uploads, retry and partial completion. Preview object URLs are revoked on item removal, reset, and component unmount. Upload, profile and lightbox code are now dynamically loaded from the guest page.

## Mobile frontend audit

Lighthouse mobile against the local production event page completed and wrote its report despite a Windows temporary-directory cleanup warning:

- performance score: 94;
- FCP: 775 ms;
- LCP: 2,592 ms;
- CLS: 0;
- total blocking time: 185 ms;
- transferred bytes: 201,788 bytes;
- initial requests: 15.

The first API feed request is limited to 20 items; additional pages are cursor-driven. Admin code lives on a separate route. Heavy guest overlays are dynamically imported. The largest emitted shared chunk is about 229 KB before transfer compression; route-level ownership should be confirmed in a deployed Vercel bundle analysis if it grows.

## Capacity assessment

Against this exact local-to-remote test environment:

- 20 concurrent guests: **FAIL** (p95 above target, zero errors)
- 50: **FAIL**
- 100: **FAIL**
- 150: **FAIL**
- 200: **FAIL**

Largest tested concurrency meeting every latency target: **none**. Largest tested concurrency completing without HTTP errors: **200**. Primary bottleneck: remote database request throughput/queueing during concurrent uncached API requests. A safe wedding size cannot be stated from these failing latency results. Before production, run the same k6 scripts against a Vercel preview in the same region as Supabase, execute the supplied query plans, then set capacity from that representative run.

## Commands and safety

`BASE_URL` is mandatory. Non-local URLs also require `ALLOW_PRODUCTION_LOAD_TEST=true`. Seed with `npm run load:seed`, verify with `BASE_URL=http://127.0.0.1:3100 npm run load:verify-pagination` (PowerShell uses `$env:BASE_URL=...`), and remove all isolated rows with `npm run load:cleanup`.
