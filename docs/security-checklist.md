# Security checklist

## Secrets

- [ ] `.env.local` and Vercel secrets contain only the required Supabase, Cloudinary, and admin server credentials.
- [ ] No server secret uses a `NEXT_PUBLIC_` prefix or appears in browser bundles/logs.
- [ ] `SUPABASE_ACCESS_TOKEN` is removed after migration deployment.

## Supabase

- [ ] All public tables have RLS enabled with no permissive browser policies.
- [ ] Privileged reads/writes use the server-only service role client.
- [ ] Foreign keys, status checks, unique upload IDs/public IDs, slug, nickname, caption, and namespace constraints are applied.

## Cloudinary and uploads

- [ ] Uploads are signed on demand after event/guest validation.
- [ ] Public IDs remain in `weddings/{eventId}/originals/{uuid}`.
- [ ] JPEG/PNG/WebP only, 20 MB per image, maximum 10 per browser batch.
- [ ] Signed Cloudinary preset `wedding_signed_uploads` remains configured with a 20 MB maximum, allowed raster formats, and overwrite disabled.
- [ ] Metadata API verifies the asset with Cloudinary before persistence.
- [ ] Feed/fullscreen URLs use transformed assets; originals are not publicly rendered.
- [ ] Cloudinary transformations strip embedded metadata from public delivery variants by default; originals retain quality and EXIF for future private export.

## Admin and CSRF

- [ ] Admin password comparison and session signing happen server-side.
- [ ] Cookie is HttpOnly, SameSite=Lax, Secure in production, event-bound, and expires after eight hours.
- [ ] Every admin endpoint verifies the cookie; mutations also require an exact same-origin `Origin` header.
- [ ] Logout expires the cookie.

## Browser and API

- [ ] CSP, frame denial, MIME sniffing, referrer, and permissions headers are present in production.
- [ ] Sensitive/admin/signature responses use `Cache-Control: private, no-store`.
- [ ] No permissive CORS headers are configured.
- [ ] JSON endpoints reject oversized, malformed, and unknown fields.

## Logging and privacy

- [ ] Structured logs contain action/error context but no passwords, tokens, signatures, secrets, or full headers.
- [ ] Captions and nicknames render as React text and reject dangerous control/tag patterns.
- [ ] Public transformed images do not expose unnecessary GPS/EXIF metadata.

## Future distributed rate limiting

No external Redis or rate-limit provider is currently used. The application relies on strict request validation, event controls, guest/event ownership checks, upload idempotency, Cloudinary constraints, and audit-friendly failed-login logging. Distributed rate limiting may be added later only if load testing or observed abuse demonstrates a concrete need; it must not be represented by an unreliable process-local counter on Vercel.
