create extension if not exists pgcrypto;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  event_date timestamptz null,
  upload_enabled boolean not null default true,
  public_gallery_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  mock_image_url text null,
  cloudinary_public_id text null,
  width integer null check (width is null or width > 0),
  height integer null check (height is null or height > 0),
  caption text null,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  constraint photos_status_check check (status in ('processing', 'published', 'hidden'))
);

create index photos_event_created_at_idx on public.photos(event_id, created_at desc, id desc);
create index photos_event_guest_created_at_idx on public.photos(event_id, guest_id, created_at desc, id desc);
create index guests_event_nickname_idx on public.guests(event_id, nickname);

alter table public.events enable row level security;
alter table public.guests enable row level security;
alter table public.photos enable row level security;

-- No public policies are created. Milestone 2 access is mediated by validated
-- Next.js route handlers using the server-only service role client.
