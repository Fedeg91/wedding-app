alter table public.guest_awards
  add column claimed_at timestamptz,
  add column delivered_at timestamptz;

create index guest_awards_admin_status_idx
  on public.guest_awards(event_id, created_at desc);

alter table public.guest_awards add constraint guest_awards_status_order
  check (
    (claimed_at is null or read_at is not null)
    and (delivered_at is null or claimed_at is not null)
  );
