alter table public.photos
  add column original_filename text null,
  add column format text null,
  add column bytes bigint null check (bytes is null or bytes > 0);

create unique index photos_cloudinary_public_id_unique_idx
  on public.photos(cloudinary_public_id)
  where cloudinary_public_id is not null;
