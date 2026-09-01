alter table public.guests
  add column avatar_key text not null default 'fox',
  add constraint guests_avatar_key_check check (avatar_key in ('fox','rabbit','bear','cat','dog','panda','koala','penguin','alpaca','hedgehog','otter','raccoon'));

with ranked as (
  select id, (array['fox','rabbit','bear','cat','dog','panda','koala','penguin','alpaca','hedgehog','otter','raccoon'])[1 + ((row_number() over (partition by event_id order by created_at, id) - 1) % 12)::integer] as avatar_key
  from public.guests
)
update public.guests g set avatar_key = ranked.avatar_key from ranked where ranked.id = g.id;

alter function public.list_public_photos_with_likes(uuid, uuid, uuid, text, integer, timestamptz, uuid)
  rename to list_public_photos_with_likes_without_avatar;

create function public.list_public_photos_with_likes(
  target_event_id uuid,
  target_guest_id uuid default null,
  target_current_guest_id uuid default null,
  sort_order text default 'newest',
  page_limit integer default 21,
  cursor_created_at timestamptz default null,
  cursor_id uuid default null
)
returns table (
  id uuid, post_id uuid, post_created_at timestamptz, group_position smallint,
  mock_image_url text, cloudinary_public_id text, width integer, height integer,
  caption text, created_at timestamptz, guest_id uuid, guest_nickname text,
  like_count bigint, liked_by_current_guest boolean, guest_avatar_key text
)
language sql stable security invoker set search_path = public
as $$
  select feed.*, g.avatar_key
  from public.list_public_photos_with_likes_without_avatar(
    target_event_id, target_guest_id, target_current_guest_id, sort_order,
    page_limit, cursor_created_at, cursor_id
  ) feed
  join public.guests g on g.id = feed.guest_id and g.event_id = target_event_id;
$$;

revoke all on function public.list_public_photos_with_likes_without_avatar(uuid, uuid, uuid, text, integer, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.list_public_photos_with_likes_without_avatar(uuid, uuid, uuid, text, integer, timestamptz, uuid) to service_role;
