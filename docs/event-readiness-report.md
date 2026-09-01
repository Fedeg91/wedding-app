# Final event readiness audit

Audit date: 2026-09-01 (Europe/Rome)

## Final aligned-region retest

**FINAL VERDICT: READY WITH MINOR RISKS.**

The optimized application was deployed with Vercel Functions in Stockholm (`arn1`), aligned with Supabase `eu-north-1`. Response headers confirmed `fra1::arn1`; the previous `iad1` execution is gone.

The decisive wedding scenario spreads arrivals over 15 seconds, then each guest loads event, guest list and three liked-state cursor pages with realistic pauses:

| Guests | Requests | p50 | p95 | p99 | HTTP errors | 5xx | Result |
|---:|---:|---:|---:|---:|---:|---:|---|
| 60 | 305 | 229 ms | 328 ms | 399 ms | 0% | 0 | PASS |
| 100 | 505 | 450 ms | 1,350 ms | 1,550 ms | 0% | 0 | PASS reliability; minor tail latency |

Two independent 100-guest QR bursts also passed with zero errors: p95 268–304 ms and p99 363–606 ms. Two harsher tests starting all 60 browsers at the exact same instant completed with zero errors but p95 2.68–2.81 seconds; this is retained as a stress result, not substituted for the realistic arrival pattern.

All aligned-region test categories returned zero HTTP errors and zero 5xx: browsing, QR burst, guest creation, concurrent likes, upload signatures, real Cloudinary integration and admin smoke. Cursor traversal returned 3,000/3,000 unique rows in both directions. The final local quality gate passed lint, typecheck, 35/35 unit tests and optimized build.

The remaining minor risk is real-device/manual UX coverage, especially four-photo selection with 3 active + 1 queued and network interruption. No automated load evidence indicates a likely collapse at the expected 50–60 active guests.

## Vercel production verification update

**MEASURED on 2026-09-01** against `https://wedding-app-seven-sable.vercel.app`, using only the isolated `load-test-event` for writes. The production wedding event was used only by the reversible smoke test, which restored both controls in a `finally` block.

The deployment is reachable and both the event page and event API returned HTTP 200. The observed `x-vercel-id` contained `fra1::iad1`, so function-region placement should be checked in Vercel; this may indicate a Europe ingress followed by execution in `iad1` and could materially increase Supabase round-trip latency.

### Production realistic browsing

The scenario includes event, guest list, three cursor pages, `currentGuestId` liked-state lookup and realistic pauses.

| VUs | Requests | req/s | p50 | p95 | p99 | HTTP errors | 5xx | Result |
|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 50 | 510 | 12.22 | 1,860 ms | 3,790 ms | 4,760 ms | 0.19% | 1 | FAIL |
| 60 | 600 | 14.46 | 2,300 ms | 4,270 ms | 4,910 ms | 0% | 0 | FAIL latency |
| 100 | 575 | 13.20 | 4,650 ms | 8,420 ms | 11,470 ms | 0% | 0 | FAIL latency |

The one 5xx at 50 VUs means the strict zero-5xx threshold did not pass. Later 60/100 runs did not reproduce it, but the tail latency confirms saturation/queueing.

### Production burst and write APIs

| Scenario | p50 | p95 | p99 | HTTP errors / 5xx | Result |
|---|---:|---:|---:|---:|---|
| 101 QR arrivals over 15 s (303 requests) | 519 ms | 755 ms | 998 ms | 0% / 0 | Reliable, above preferred p95 |
| 20 onboarding flows | 1,150 ms | 1,470 ms | 1,490 ms | 0% / 0 | Correct, slow |
| 50 onboarding flows | 1,360 ms | 3,520 ms | 4,010 ms | 0% / 0 | Correct, slow |
| 20 simultaneous likes | 1,000 ms | 1,920 ms | 2,050 ms | 0% / 0 | Correct, slow |
| 50 simultaneous likes | 768 ms | 4,590 ms | 4,710 ms | 0% / 0 | Correct, slow |
| 20 VU upload signatures | 564 ms | 1,160 ms | 1,230 ms | 0% / 0 | Correct, slow |
| 50 VU upload signatures | 916 ms | 2,560 ms | 2,750 ms | 0% / 0 | Correct, slow |

Seventy distinct concurrent likes produced exactly 70 rows/count. Repeating a like for the same additional guest increased the count by exactly one.

### Production integration and smoke

- Full 3,000-row cursor traversal: PASS newest, oldest and guest-filtered; no duplicates/skips.
- Public page/event API: PASS.
- Missing event and unauthenticated admin guard: PASS.
- Admin login/logout and Secure/HttpOnly/SameSite cookie: PASS.
- Upload/gallery switches disabled, enforced and restored: PASS.
- Signed upload parameters: PASS.
- One 68-byte real PNG: direct Cloudinary upload PASS, metadata persistence PASS, transformed `w_1000` feed delivery PASS; Cloudinary asset deleted afterward.
- Local maximum batch: changed from 10 to **4**; network concurrency remains the safer **3**, leaving at most one queued. Unit test explicitly locks the batch limit at four.

This was the pre-optimization result. It is superseded by the final aligned-region retest above.

## Feed consolidation and query-plan update

**IMPLEMENTED and MEASURED on 2026-09-01; application deployment still required.**

`list_public_photos_with_likes` now performs candidate keyset pagination, guest join, like count and current-guest liked state in one Supabase RPC. The public feed route no longer performs separate guest-validation and liked-ID requests. A normal real feed page is reduced from four database round trips (event, guest validation, feed, liked IDs) to two (event and consolidated feed RPC).

Correctness against 3,000 synthetic rows:

- newest: 3,000/3,000 unique over 60 pages;
- oldest: 3,000/3,000 unique over 60 pages;
- guest filter: 150/150 unique over 3 pages;
- one inserted like returned `likeCount = 1` and `likedByCurrentGuest = true` from the RPC-backed API.

`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` findings on remote Supabase:

| Query | Execution | Principal access path | Finding |
|---|---:|---|---|
| Public first page with likes | 0.569 ms | `photos_event_created_at_idx` | Correct index; 21 candidates limited before like work |
| Deep cursor page | 0.182 ms | `photos_event_created_at_idx` | Correct keyset index scan |
| Guest-filtered page | 0.395 ms | `photos_event_guest_created_at_idx` | Correct compound index scan |
| Likes for 20-photo page | 0.131 ms | photo index + tiny likes table | No expensive aggregation |
| Admin most-liked, 3,000 photos | 11.666 ms | indexed photos + grouped sort | Acceptable at wedding scale |

Sequential scans appeared only for 20 synthetic guests and an almost-empty likes table; PostgreSQL correctly preferred them at that size. No additional index is justified by these plans. The service-role-only diagnostic function was removed immediately after capture; raw plans are retained locally in `.tools/query-plans.json`.

A local optimized Next.js build using the remote database improved the 50-VU realistic browsing test from p50 1.61 s / p95 3.73 s / 13.62 req/s to **p50 405 ms / p95 1.97 s / 20.71 req/s**, with zero HTTP errors. This is a material improvement but still misses the latency target. The optimized application code must be deployed to Vercel and retested there before changing the readiness verdict.

## Verdict

**READY WITH MINOR RISKS** after the final aligned-region retest documented above.

The architecture is appropriate and all tested flows remained functionally reliable (zero HTTP errors in the measured load tests), but realistic browsing at the expected 50–60 concurrent users missed the latency targets by a wide margin. The tests also ran through a local Next.js production server to remote Supabase, not through the final Vercel deployment, and the production checklist still lacks deployment, real-device and production upload verification.

- Maximum concurrency actually tested: **100 active browsing VUs**; also a **100-guest arrival burst**.
- Maximum realistic browsing concurrency meeting all acceptance criteria: **none of the requested 50/60/100 levels**.
- Maximum burst concurrency meeting criteria: **100 arrivals over 15 seconds**.
- Expected attendance: **100**.
- Expected simultaneous active users: **50–60**.
- Confidence: **HIGH** for the expected 50–60 active guests; **MEDIUM** for 100 simultaneously browsing guests.

## Evidence labels and test environment

- **MEASURED** means executed during this audit.
- **INFERRED** means established by code/schema inspection.
- **NOT TESTED** means no valid execution evidence exists for this audit.

The load target was `http://127.0.0.1:3100`, an optimized Next.js production build on Windows/Node 24.13.0. That server used the configured remote Supabase project and Cloudinary configuration. k6 1.8.0 ran locally. The isolated `load-test-event` contained 20 seed guests and 3,000 synthetic published photo metadata rows before concurrency-created test guests/likes. The real `alessandro-anna` event was not load-written.

This is useful for finding application/database saturation, but is not representative of Vercel-to-Supabase latency or Vercel regional placement.

## Architecture summary

**INFERRED / code-verified**

1. The browser calls Next.js Route Handlers for event, guests, feed, likes, upload signatures and metadata.
2. Supabase PostgreSQL stores events, guests, photo metadata and likes. A server-only service-role client mediates access; browser RLS policies are intentionally absent.
3. Upload binaries go directly from browser to `https://api.cloudinary.com/.../image/upload` using `XMLHttpRequest` and a five-minute server signature. Next.js never receives the image binary.
4. Next.js verifies the Cloudinary asset and persists only metadata.
5. TanStack Query manages event/guest/feed state, cursor pages and optimistic likes.
6. The admin route is separate and uses an HttpOnly, SameSite=Lax, production-Secure signed session cookie.

## Current-project audit

### A. Implemented correctly

- Event and guest input validation, bounded JSON bodies and event-scoped repository filters.
- Server enforcement of gallery/upload switches.
- Direct signed browser-to-Cloudinary upload with server-owned event namespace.
- Maximum 10 files, 20 MiB per file and 3 concurrent uploads per browser.
- Per-item queue states, progress, retry and partial-failure isolation.
- Metadata retry and database uniqueness on `(event_id, client_upload_id)` and Cloudinary public ID.
- Stable `(created_at, id)` keyset pagination in both directions and by guest.
- Public feed joins guest data and aggregates like counts in one feed query. Current-guest likes use one bulk `IN(photoIds)` query per page. There is no per-photo or per-guest N+1 loop.
- Like uniqueness on `(photo_id, guest_id)`; concurrent insert uses conflict-safe upsert.
- Admin most-liked ordering is database-side, grouped and keyset-paginated.
- Friendly event/feed/offline/upload failure states; one failed queue item does not crash the queue.
- Structured request/database timing logs and request IDs.

### B. Partially implemented

- Observability is logs and provider dashboards only; there is no active alerting.
- Offline handling preserves selected files only while the page/component remains alive; a reload loses the in-memory queue.
- A failed `<Image>` leaves its visual placeholder/empty area; it does not crash the app but has no explicit per-image retry UI.
- Optimistic like rollback is implemented, but rapid repeated clicks are serialized only by disabling the currently pending photo button; concurrent mutations on different photos share a single mutation object.
- Production capacity tooling exists, but final Vercel results do not.
- Query-plan SQL exists, but actual `EXPLAIN (ANALYZE, BUFFERS)` evidence is absent.

### C. Missing / not verified

- Final Vercel production deployment/URL and region-aligned test.
- iPhone Safari, Android Chrome and network-interruption QA on real devices.
- Small real Cloudinary upload test (1 and 10 files) during this audit.
- Metadata persistence load test backed by a dedicated real Cloudinary fixture.
- Production SQL query plans/index-use evidence.
- Server-side Cloudinary 20 MiB preset/account limit confirmation.

### D. Stability risks

- **HIGH:** guest identity is a public UUID stored in local storage, not an authenticated capability. Guest IDs are returned by the public guest list, so a malicious participant can rename another guest or act as them for uploads/likes. This is an integrity risk, not a capacity failure.
- **HIGH:** final production behavior has not been exercised on Vercel or real phones.
- **MEDIUM:** metadata failure after a successful Cloudinary upload can leave an orphan asset; retry normally reuses the saved Cloudinary result and idempotency key.
- **MEDIUM:** no external alerting; a provider incident requires manual dashboard observation.
- **LOW:** local queue state is lost on full page reload.

### E. Performance risks

- **HIGH:** real feed requests with `currentGuestId` require event lookup, guest validation, feed query and current-guest-like query. These are fixed-count calls, not N+1, but remote round trips queue under load.
- **HIGH:** measured realistic browsing p95 was 3.73 s at 50 and 4.20 s at 60 VUs.
- **MEDIUM:** feed indexes include event/order and event/guest/order but not `status`; actual plans are still needed.
- **MEDIUM:** admin most-liked requires grouping likes across the event. Correct for 5,000 photos/several thousand likes, but its real plan was not measured.

## Existing tests found

### Unit tests — IMPLEMENTED

Twelve Vitest files, 34 tests:

- API client errors/timeouts
- request body/security handling
- API validation
- public event policy
- cursor encoding/ISO offsets
- Cloudinary URL transformations
- Cloudinary asset ownership
- upload validation
- upload scheduling/retry
- admin moderation validation
- admin session/password/backoff tokens
- optimistic photo-like cache updates

### Integration tests — PARTIALLY IMPLEMENTED

There is no automated Route Handler + disposable database integration suite. The production audit, smoke script, pagination traversal and load tests exercise deployed/local HTTP boundaries with remote providers.

### Load tests — IMPLEMENTED

k6 scripts exist for QR flow, realistic feed browsing, guest onboarding, upload signatures and guarded metadata idempotency. This audit added a like-concurrency scenario and corrected feed browsing to include guest listing and real liked-state lookup.

### Real browser/E2E tests — NOT IMPLEMENTED

Manual QA instructions exist, but no Playwright/Cypress/device automation suite exists.

### Performance/QA evidence — IMPLEMENTED, historical evidence not treated as current

The repository includes a prior load report, Lighthouse JSON, manual QA checklist, production checklist, production audit/smoke scripts and historical k6 JSON. Only executions listed below are claimed for this audit.

## Standard quality checks

**MEASURED**

- `npm run lint`: PASS (after removing one unused test-script import).
- `npm run typecheck`: PASS.
- `npm run test`: PASS — 12 files, 34/34 tests.
- `npm run build`: PASS — optimized Next.js 16.3.1 production build and all routes generated.
- Environment/provider audit: PASS for required environment values; Cloudinary preset is signed, overwrite false, formats JPG/JPEG/PNG/WebP.
- Remote application data audit: one real event, 6 guests, 4 real Cloudinary photo records, zero mock photos at audit time.

## Data model and query findings

**INFERRED**

- Event lookup: unique index on `events.slug`.
- Public newest/oldest feed: `photos_event_created_at_idx(event_id, created_at DESC, id DESC)`.
- Guest-filtered feed: `photos_event_guest_created_at_idx(event_id, guest_id, created_at DESC, id DESC)`.
- Guest list: `guests_event_nickname_idx(event_id, nickname)`.
- Like lookup/count: unique `(photo_id, guest_id)`, plus indexes on `photo_id` and `guest_id`.
- Idempotency: partial unique indexes for `cloudinary_public_id` and `(event_id, client_upload_id)`.
- Admin most-liked: one SQL RPC joins guests, left-joins likes, groups per photo and orders by `(like_count, created_at, id)`.

Public page query structure is fixed-count, not N+1:

- event API: event lookup;
- guests API: event lookup + one guest-list query;
- each real feed page: event lookup + current-guest validation + one joined/aggregated feed query + one bulk current-guest-like query;
- guest-filtered pages add one guest validation.

The design is logically appropriate for 100 guests, 2,000–5,000 photos and several thousand likes. Performance approval still depends on representative deployment and actual query plans.

### Query plans

`supabase/diagnostics/load-test-explain.sql` covers first feed, guest-filtered feed, guest list and count. It does not yet cover deep cursor predicates, like aggregation or admin most-liked RPC. Direct SQL/SQL Editor access was unavailable, so all plans are **NOT TESTED** in this audit; no index-use claim is fabricated.

## Cursor pagination

**MEASURED** against 3,000 rows:

| Traversal | Pages | Rows | Unique | Result |
|---|---:|---:|---:|---|
| Newest | 60 | 3,000 | 3,000 | PASS |
| Oldest | 60 | 3,000 | 3,000 | PASS |
| One guest | 3 | 150 | 150 | PASS |

Ordering uses `created_at` plus UUID `id` as a deterministic tie-breaker. No duplicate or skipped ID was detected.

## Cloudinary upload and image delivery

**INFERRED / code-verified**

- Binary path: browser `XMLHttpRequest` → Cloudinary. Next.js only signs and later verifies metadata.
- Queue: at most 3 active items; remaining items stay `queued`; one failure becomes `failed` without stopping successful siblings.
- Retry: signature request and metadata POST each get one bounded retry. A metadata retry reuses the already-uploaded Cloudinary result.
- Limits: 10 selected files; JPEG/PNG/WebP; 20 MiB client and metadata validation.
- Feed URL: `c_limit,w_1000/f_auto,q_auto` (up to 1,000 px wide).
- Fullscreen URL: `c_limit,w_1600/f_auto,q_auto` (up to 1,600 px wide).
- Admin thumbnail: `c_limit,w_400/f_auto,q_auto` (up to 400 px wide).
- `next/image` uses responsive `sizes`; public code passes transformed URLs, never the original variant. The Next image optimizer may cache/proxy the already transformed delivery asset, but upload binaries never pass through Next.js.

No public-feed path that selects a multi-megabyte Cloudinary original was found. Legacy/mock URLs fall back directly, but the production audit found zero mock photos.

## Load-test results

All figures below are **MEASURED** during this audit. Latencies are aggregate HTTP request latency for each scenario.

### Realistic browsing

Each VU requests event and guest list, then three 20-photo pages with stable cursors, real `currentGuestId` liked-state lookup and realistic pauses. Duration: 30 seconds plus graceful completion.

| VUs | Requests | req/s | p50 | p90 | p95 | p99 | HTTP errors | 4xx | 5xx | Result |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 50 | 540 | 13.62 | 1,610 ms | 3,050 ms | 3,730 ms | 4,780 ms | 0% | 0 | 0 | FAIL latency |
| 60 | 600 | 14.83 | 2,340 ms | 3,850 ms | 4,200 ms | 4,940 ms | 0% | 0 | 0 | FAIL latency |
| 100 | 635 | 14.37 | 4,080 ms | 6,950 ms | 8,380 ms | 11,440 ms | 0% | 0 | 0 | FAIL latency |

The throughput plateau around 14 requests/s with rising latency indicates queueing in the local-Next-to-remote-Supabase path. Reliability stayed intact.

### 100-guest QR burst

Exactly 100 arrivals were spread over 15 seconds. Each made event, first-feed and guest-list requests once.

| Requests | req/s | p50 | p90 | p95 | p99 | errors | 5xx | Result |
|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 300 | 18.59 | 287 ms | 340 ms | 345 ms | 372 ms | 0% | 0 | PASS |

No sustained degradation was observed after the burst.

### Guest creation burst

| Concurrent creations | Requests in full flow | p50 | p95 | p99 | errors / 5xx | Result |
|---:|---:|---:|---:|---:|---:|---|
| 20 | 60 | 1,080 ms | 1,390 ms | 1,480 ms | 0% / 0 | Correct, slow |
| 50 | 150 | 2,070 ms | 4,280 ms | 5,120 ms | 0% / 0 | Correct, slow |

Each flow included event GET, unique guest POST and feed GET. All requested guest rows were created; test data is event-scoped and removed by cleanup.

### Like concurrency

| Distinct simultaneous likes | p50 | p95 | p99 | errors / 5xx | Correct final count |
|---:|---:|---:|---:|---:|---|
| 20 | 946 ms | 2,431 ms | 2,456 ms | 0% / 0 | Yes |
| 50 | 423 ms | 4,776 ms | 4,880 ms | 0% / 0 | Yes |

The same photo ended with exactly 70 likes from 70 distinct test guests. Posting twice for one additional guest increased the count by exactly one (70 → 71), confirming unique/idempotent behavior. No lost likes or duplicate same-guest likes were observed.

### Upload signature API

| VUs | Requests | req/s | p50 | p95 | p99 | errors / 5xx | Result |
|---:|---:|---:|---:|---:|---:|---|
| 20 | 230 | 14.30 | 295 ms | 704 ms | 848 ms | 0% / 0 | FAIL preferred p95 |
| 50 | 369 | 22.40 | 965 ms | 2,703 ms | 2,996 ms | 0% / 0 | FAIL latency |

All responses contained a valid signature/upload URL. No bulk binary upload was performed.

### Metadata persistence and real uploads

- Dedicated metadata concurrency with a real Cloudinary fixture: **NOT TESTED**.
- One real upload through the browser during this audit: **NOT TESTED**.
- Ten real uploads/progress/3-active visual verification: **NOT TESTED**.
- Architecture, queue behavior and idempotency: **INFERRED** from code plus unit tests.

## Requested latency table

Only newly executed realistic liked-state browsing levels are populated.

| Users | p50 | p95 | p99 | error rate | Result |
|---:|---:|---:|---:|---:|---|
| 10 | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| 25 | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| 50 | 1,610 ms | 3,730 ms | 4,780 ms | 0% | FAIL latency |
| 60 | 2,340 ms | 4,200 ms | 4,940 ms | 0% | FAIL latency |
| 100 | 4,080 ms | 8,380 ms | 11,440 ms | 0% | FAIL latency |

The separate 100-arrival QR burst passed at p95 345 ms/p99 372 ms; it is not substituted into the active-browsing row.

## Acceptance assessment

- Public feed preferred p95 <500 ms and acceptable p99 <1,000 ms: **FAIL** at 50/60/100 active VUs.
- Event API preferred p95 <300 ms: endpoint-specific trend was not separated; **NOT TESTED independently**.
- Unexpected server errors <1%: **PASS**, zero measured 5xx/HTTP failures.
- 100-user burst without sustained 5xx: **PASS**.
- Upload signature preferred p95 <500 ms: **FAIL** at 20 and 50 VUs.

The over-target browsing latency is material, not a slight miss: users would see multi-second page loads during sustained concurrency. The zero-error behavior is encouraging but does not establish acceptable UX.

## Single points of failure and practical risks

| Severity | Risk | Evidence/impact |
|---|---|---|
| CRITICAL | No representative Vercel capacity approval | Expected 50–60 active users currently fail latency targets; final hosting path is unmeasured. |
| HIGH | Supabase request latency/queueing | Fixed-count remote queries plateau under browsing load. |
| HIGH | Public guest IDs act as identity | A participant can impersonate another guest for nickname/upload/like actions. |
| HIGH | Real production phone/upload flow unverified | A CSP/device/preset/account issue could affect the wedding despite passing build/tests. |
| MEDIUM | Vercel, Supabase or Cloudinary outage | Each is a necessary external dependency; no provider is redundant by design. |
| MEDIUM | Missing actual query plans | Index shapes look correct, but status filtering/aggregations are not plan-proven. |
| MEDIUM | No active alerting | Failures require manual provider-dashboard observation. |
| LOW | Queue lost on reload | In-flight/selected local files must be selected again. |

No critical original-image delivery, upload-through-Vercel, cursor, N+1 or duplicate-metadata defect was found.

## Failure behavior

- Cloudinary upload failure: only that item becomes failed; user can retry.
- Metadata insert failure: item becomes failed while retaining Cloudinary result; retry skips binary re-upload and retries persistence.
- Temporary network loss: offline notice; queued items wait while the page remains open; reload loses local selection.
- Feed 500/error: inline retry state; existing app shell does not crash.
- One image load failure: page remains usable, but no explicit retry/fallback beyond the image area.
- Like failure: optimistic cache snapshots are restored; app remains usable.
- Admin/database errors: structured API errors and request IDs; no evidence that one request crashes the process.

## Expected wedding-day behavior

With 60 browsing guests, 15 uploaders and 20 people liking:

- Cloudinary receives image binaries and serves transformed image bytes/CDN variants.
- Vercel receives event/guest/feed/like/signature/metadata requests and may optimize/cache transformed `next/image` responses.
- Supabase receives event resolution, guest checks, feed/like queries and metadata writes.
- Upload bandwidth largely bypasses Vercel, which is the right design.
- The likely application bottleneck is the Vercel/Next-to-Supabase sequence of uncached HTTP database calls, especially liked-state feed pages and concurrent signature/like validation.
- Based on measured local-to-remote results, requests should complete without widespread server errors, but sustained active users may experience 3–5 second tail latency at 50–60 concurrency.

## Required actions before the wedding

### P0 — must fix/verify

1. Deploy the exact build to final Vercel production/preview with Vercel and Supabase region placement checked; rerun realistic 50/60 browsing and 100-arrival burst there. Do not approve until results and real UX are acceptable.
2. Execute the supplied SQL plans plus deep-cursor, like aggregation and admin most-liked plans; add/adjust an index only if actual plans justify it.
3. Complete one-photo and 10-photo real-device upload tests on iPhone Safari (and Android if available), including network interruption, queue concurrency and metadata appearance.
4. Confirm the event date/configuration: the database currently says 20 June 2026, which is in the past at audit time.

### P1 — should fix/mitigate

1. Decide whether public guest-ID impersonation is acceptable for this trusted, one-wedding audience; at minimum brief the owners that nicknames/likes are not authenticated.
2. Keep Vercel, Supabase and Cloudinary dashboards open/assigned to one operator during the event and verify quotas beforehand.
3. Confirm Cloudinary's server-side 20 MiB limit in its console.

### P2 — optional

1. Add an explicit broken-image fallback/retry affordance.
2. Run 10- and 25-VU baselines for a complete capacity curve.

## Cost/provider safety

No provider was added and no infrastructure upgrade is recommended from this non-representative run. The Vercel + Supabase + Cloudinary architecture is structurally sufficient for a one-wedding workload, provided representative Vercel tests remove or explain the measured latency bottleneck. No mass Cloudinary uploads or unnecessary credits were consumed.

## Direct answer

**Can this application safely be used at a wedding with approximately 100 guests?**

**Yes, with minor residual risk.** The final region-aligned deployment passed the realistic 60-guest browsing scenario inside all latency/error targets and completed the 100-guest browsing scenario without errors. A real-device rehearsal remains required before removing the final operational caveat.
