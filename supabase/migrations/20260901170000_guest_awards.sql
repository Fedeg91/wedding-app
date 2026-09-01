create table public.guest_awards (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_id uuid not null,
  message text not null default 'Hai vinto un premio!',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint guest_awards_guest_event_fkey foreign key (guest_id, event_id)
    references public.guests(id, event_id) on delete cascade,
  constraint guest_awards_message_length check (char_length(message) between 1 and 160)
);

create index guest_awards_unread_lookup_idx
  on public.guest_awards(event_id, guest_id, created_at desc)
  where read_at is null;

alter table public.guest_awards enable row level security;
