create table public.photo_likes (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint photo_likes_photo_guest_key unique (photo_id, guest_id)
);

create index photo_likes_photo_id_idx on public.photo_likes(photo_id);
create index photo_likes_guest_id_idx on public.photo_likes(guest_id);

alter table public.photo_likes enable row level security;

-- Admin listing uses a single grouped query so count-based sorting remains
-- database-side and keyset-paginated even for large events.
create or replace function public.list_admin_photos_with_likes(
  target_event_id uuid,
  status_filter text,
  sort_order text,
  page_limit integer,
  cursor_created_at timestamptz default null,
  cursor_id uuid default null,
  cursor_like_count bigint default null
)
returns table (
  id uuid,
  cloudinary_public_id text,
  mock_image_url text,
  caption text,
  created_at timestamptz,
  status text,
  guest_id uuid,
  guest_nickname text,
  like_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id, p.cloudinary_public_id, p.mock_image_url, p.caption,
    p.created_at, p.status, g.id, g.nickname, count(pl.id)::bigint
  from photos p
  join guests g on g.id = p.guest_id and g.event_id = p.event_id
  left join photo_likes pl on pl.photo_id = p.id
  where p.event_id = target_event_id
    and p.status in ('published', 'hidden')
    and (status_filter = 'all' or p.status = status_filter)
  group by p.id, g.id, g.nickname
  having
    cursor_id is null
    or (sort_order = 'newest' and (p.created_at, p.id) < (cursor_created_at, cursor_id))
    or (sort_order = 'oldest' and (p.created_at, p.id) > (cursor_created_at, cursor_id))
    or (sort_order = 'most_liked' and (count(pl.id), p.created_at, p.id) < (cursor_like_count, cursor_created_at, cursor_id))
  order by
    case when sort_order = 'most_liked' then count(pl.id) end desc,
    case when sort_order = 'newest' then p.created_at end desc,
    case when sort_order = 'oldest' then p.created_at end asc,
    case when sort_order = 'most_liked' then p.created_at end desc,
    case when sort_order in ('newest', 'most_liked') then p.id end desc,
    case when sort_order = 'oldest' then p.id end asc
  limit page_limit;
$$;
