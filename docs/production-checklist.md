# Production checklist — Alessandro & Anna

Last local audit: 2026-08-16. Check an item only after it has been verified against the actual production deployment.

## Deployment

- [ ] Vercel production deployment successful — blocked: this machine is not logged into Vercel.
- [ ] Production URL recorded: `TBD after Vercel login/deploy`.
- [ ] Production environment variables configured in Vercel for the Production environment.
- [ ] `/e/alessandro-anna` works on the production URL.
- [ ] `/admin/alessandro-anna` works and requires login.
- [x] Local optimized production build succeeds.
- [x] Runtime code has no local filesystem dependency.

## Supabase

- [x] Exactly one event exists: `Alessandro & Anna` / `alessandro-anna`.
- [x] Event date currently stored as 20 June 2026, 18:00 Europe/Rome (16:00 UTC). Owners must confirm this is correct.
- [x] Uploads and public gallery are enabled.
- [x] Load-test event and its 3,000 rows were removed after Milestone 7.
- [x] Eighteen mock photos and five mock guests were removed; four existing non-seed guests were preserved.
- [ ] Confirm migration history and index usage from Supabase Dashboard/SQL Editor. Service-role REST access cannot inspect migration history or `pg_indexes`.
- [ ] Run `supabase/diagnostics/load-test-explain.sql` in SQL Editor and retain the plans.

## Cloudinary and uploads

- [x] `wedding_signed_uploads` exists and is signed (`unsigned: false`).
- [x] Allowed formats are JPEG/JPG, PNG and WebP; overwrite is disabled.
- [x] Public IDs are server-generated under `weddings/{eventId}/originals/{uuid}`.
- [x] The browser uploads directly to Cloudinary; Next.js receives no image binary.
- [x] Feed/fullscreen/thumbnail transformations use `f_auto,q_auto` and limited widths of 1000/1600/400.
- [x] Limits are 10 files, 20 MB each and 3 concurrent uploads.
- [ ] Confirm the 20 MB server-side account/preset limit in the Cloudinary Console. The Admin API returns formats/overwrite but does not expose `max_file_size`; the app still rejects larger selections and metadata.
- [ ] Upload one real photo in production and verify it appears in the feed.
- [ ] Select 10 photos and verify 3 uploading / 7 queued, retry and partial failure.
- [ ] Confirm the browser Network panel sends binary data only to `api.cloudinary.com`.

## Admin and event controls

- [x] Admin session cookie is HttpOnly, SameSite=Lax and Secure in production.
- [x] Password and signing secret are read only in server modules.
- [x] Upload signing and metadata endpoints enforce `upload_enabled` server-side.
- [x] Feed endpoint enforces `public_gallery_enabled` server-side.
- [x] Photo moderation is event-scoped and accepts only published/hidden.
- [ ] Verify login, logout, hide, restore and both event toggles on Vercel production.

## Devices and UX

- [ ] iPhone Safari: onboarding, returning guest, filters, scrolling, upload, fullscreen and nickname change.
- [ ] Android Chrome: same flow, if a device is available.
- [ ] Desktop production browser: public and admin flows.
- [ ] Offline/network interruption and upload retry on a real device.
- [x] Friendly states exist for event missing, feed failure, offline, gallery disabled and uploads disabled.
- [x] iPhone safe-area and mobile touch sizing are implemented.

## Performance and capacity

- [x] Initial feed is limited to 20 rows and subsequent pages use stable cursors.
- [x] Feed images lazy-load; originals are not used by the normal Cloudinary gallery.
- [x] Upload/profile/lightbox UI is dynamically loaded; admin remains a separate route.
- [x] Local Lighthouse mobile: score 94, LCP 2.59 s, CLS 0, 202 KB initial transfer.
- [ ] Repeat k6 from/against a Vercel preview in the same region as Supabase. Milestone 7 did not meet latency targets even at 20 VUs, so capacity is not yet approved.

## Usage dashboards

- Supabase Dashboard → project → Reports/Usage: database size, API requests, bandwidth and database health.
- Cloudinary Console → Programmable Media → Reports/Usage: storage, transformations, bandwidth and credits.
- Vercel Dashboard → project → Observability/Usage: function invocations, duration, errors, bandwidth and build status.

No QR functionality is included. Create the QR only after the final production URL/domain has been approved.
