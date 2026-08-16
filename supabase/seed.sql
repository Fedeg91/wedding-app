insert into public.events (id, slug, title, event_date, upload_enabled, public_gallery_enabled)
values ('10000000-0000-4000-8000-000000000001', 'alessandro-anna', 'Alessandro & Anna', '2026-06-20T16:00:00Z', true, true)
on conflict (slug) do update set
  title = excluded.title,
  event_date = excluded.event_date,
  upload_enabled = excluded.upload_enabled,
  public_gallery_enabled = excluded.public_gallery_enabled;

-- Production and local resets intentionally start with an empty gallery.
-- Guests and photo metadata are created only through the application.
