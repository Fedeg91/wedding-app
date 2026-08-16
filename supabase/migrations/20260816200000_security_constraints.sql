alter table public.events
  add constraint events_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

alter table public.guests
  add constraint guests_nickname_length_check check (char_length(btrim(nickname)) between 1 and 40),
  add constraint guests_id_event_unique unique (id, event_id);

alter table public.photos
  add constraint photos_caption_length_check check (caption is null or char_length(btrim(caption)) <= 300),
  add constraint photos_cloudinary_namespace_check check (
    cloudinary_public_id is null or cloudinary_public_id ~ '^weddings/[0-9a-f-]{36}/originals/[0-9a-f-]{36}$'
  );

alter table public.photos drop constraint photos_guest_id_fkey;
alter table public.photos
  add constraint photos_guest_event_fkey foreign key (guest_id, event_id)
  references public.guests(id, event_id) on delete cascade;

comment on table public.events is 'RLS enabled; accessed by server-only service role routes.';
comment on table public.guests is 'RLS enabled; no direct browser write policies.';
comment on table public.photos is 'RLS enabled; no direct browser write policies.';
