alter table public.photos add column client_upload_id uuid null;

create unique index photos_event_client_upload_id_unique_idx
  on public.photos(event_id, client_upload_id)
  where client_upload_id is not null;
