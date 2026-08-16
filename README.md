# Alessandro & Anna — wedding photo app

Mobile-first, one-wedding MVP. Guests open `/e/alessandro-anna`, choose a nickname and share photos without an account, email or password. Owners use `/admin/alessandro-anna`.

## Architecture

- Next.js App Router, React, TypeScript, Tailwind CSS and shadcn-style components on Vercel.
- TanStack Query for event, guest and cursor-paginated photo state.
- Next.js Route Handlers for public and admin APIs.
- Supabase PostgreSQL stores events, guests and photo metadata only. A server-only service-role client mediates database access; RLS has no browser policies.
- The browser uploads image binaries directly to Cloudinary with a short-lived signed upload. Next.js signs the request, verifies the resulting asset and persists metadata.
- Lightweight structured application logs provide request IDs and API/database timing. No external monitoring provider is used.

Cloudinary originals use `weddings/{eventId}/originals/{uuid}`. Public delivery uses `c_limit,w_400/f_auto,q_auto` for thumbnails, width 1000 for the feed and width 1600 for fullscreen. Originals are never selected by the normal gallery.

## Local setup

Requirements: a recent Node.js release, an existing Supabase project and a Cloudinary product environment.

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows, copy `.env.example` manually or with `Copy-Item`. Open `http://localhost:3000/e/alessandro-anna`.

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_UPLOAD_PRESET=wedding_signed_uploads
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

Only the two `NEXT_PUBLIC_` values may be included in the client build. The service-role key, Cloudinary API secret, admin password and admin session secret must exist only in local/Vercel server environments. `ADMIN_PASSWORD` must contain at least 8 characters and `ADMIN_SESSION_SECRET` at least 32 random characters. `.env*` local files are gitignored and `.env.example` contains no credentials.

## Supabase setup

Link the intended project and apply every checked-in SQL migration:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Use `--include-seed` only for a new empty project. The seed creates the single empty production event:

- title: `Alessandro & Anna`
- slug: `alessandro-anna`
- current date: `2026-06-20T16:00:00Z` (18:00 Europe/Rome; confirm with the owners)

Migrations create the schema, RLS, event/guest/feed indexes, Cloudinary metadata, idempotency constraints and security constraints. Regenerate types after schema changes with `npx supabase gen types typescript --linked`.

Run the read-only environment/provider audit with:

```bash
npm run production:audit
```

For query-plan verification, run `supabase/diagnostics/load-test-explain.sql` from the Supabase SQL Editor after seeding an isolated load-test event.

## Cloudinary setup

The signed preset named by `CLOUDINARY_UPLOAD_PRESET` must remain signed and permit only JPEG/JPG, PNG and WebP, with overwrite disabled. Confirm the 20 MB server-side limit in the Cloudinary Console: the Admin API response used by the audit does not expose `max_file_size`. Independently, the browser rejects files over 20 MB and the metadata API rejects a byte count over 20 MB. The server owns the public ID and signs it; never create an unsigned browser preset for this app.

Upload flow:

1. browser asks `/api/events/alessandro-anna/uploads/sign` for signed parameters;
2. browser posts the binary directly to `api.cloudinary.com`;
3. browser posts returned metadata to the Next.js photo endpoint;
4. Next.js verifies Cloudinary ownership and stores metadata in Supabase.

The client accepts at most 10 files of 20 MB and runs at most 3 uploads concurrently. Client upload IDs make metadata retries idempotent.

## Vercel deployment

1. Log in with `npx vercel login` or import the repository from the Vercel dashboard.
2. Add every variable listed above to the Vercel **Production** environment. Do not paste them into source files.
3. Select the Supabase/Vercel regions to minimize cross-region latency where available.
4. Deploy with `npx vercel --prod`, or deploy the connected main branch.
5. Verify `/e/alessandro-anna` and `/admin/alessandro-anna`, then record the URL in `docs/production-checklist.md`.

The runtime does not write to the local filesystem. Route handlers and the Supabase HTTP client are compatible with Vercel serverless execution. The admin cookie is HttpOnly, SameSite=Lax, event-bound and Secure in production.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Reusable k6 scenarios are under `load-tests/`. `BASE_URL` is mandatory and non-local targets additionally require `ALLOW_PRODUCTION_LOAD_TEST=true`. Review [the load-test report](docs/load-test-report.md) before asserting production capacity.

The complete release and real-device procedure is in [the production checklist](docs/production-checklist.md). Usage is monitored only through the built-in Supabase, Cloudinary and Vercel dashboards.

## Troubleshooting

- `EVENT_NOT_FOUND`: confirm the seed/migrations and exact slug `alessandro-anna`.
- Guest nickname does not proceed: inspect the guest POST response and ensure Vercel can reach Supabase with the service-role key.
- Upload signature fails: check the three Cloudinary credentials and signed preset name.
- Cloudinary upload succeeds but the photo is missing: inspect the metadata POST using its `x-request-id`; verify the public ID is under the event namespace.
- Admin login fails: verify production `ADMIN_PASSWORD` and a session secret of at least 32 characters, then redeploy.
- Slow feed under concurrency: compare Vercel and Supabase regions, inspect structured DB timings, execute the supplied query plans and rerun k6 from a representative location.

QR generation, redirects and print assets are intentionally outside this milestone.
