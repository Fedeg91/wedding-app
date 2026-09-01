-- One database call returns a cursor page with its guest, like count and the
-- current guest's liked state. Candidate rows are limited before like lookups.
create or replace function public.list_public_photos_with_likes(
  target_event_id uuid,
  target_guest_id uuid default null,
  target_current_guest_id uuid default null,
  sort_order text default 'newest',
  page_limit integer default 21,
  cursor_created_at timestamptz default null,
  cursor_id uuid default null
)
returns table (
  id uuid,
  mock_image_url text,
  cloudinary_public_id text,
  width integer,
  height integer,
  caption text,
  created_at timestamptz,
  guest_id uuid,
  guest_nickname text,
  like_count bigint,
  liked_by_current_guest boolean
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if sort_order not in ('newest', 'oldest') or page_limit not between 1 and 51 then
    raise exception 'invalid public photo feed parameters' using errcode = '22023';
  end if;

  -- Invalid event-scoped guest IDs return no rows, preserving event isolation
  -- without separate validation round trips from Next.js.
  if target_guest_id is not null and not exists (
    select 1 from guests g where g.id = target_guest_id and g.event_id = target_event_id
  ) then
    return;
  end if;
  if target_current_guest_id is not null and not exists (
    select 1 from guests g where g.id = target_current_guest_id and g.event_id = target_event_id
  ) then
    return;
  end if;

  if sort_order = 'newest' then
    return query
    with candidates as materialized (
      select p.id, p.mock_image_url, p.cloudinary_public_id, p.width, p.height,
        p.caption, p.created_at, g.id as guest_id, g.nickname as guest_nickname
      from photos p
      join guests g on g.id = p.guest_id and g.event_id = p.event_id
      where p.event_id = target_event_id
        and p.status = 'published'
        and (target_guest_id is null or p.guest_id = target_guest_id)
        and (cursor_id is null or (p.created_at, p.id) < (cursor_created_at, cursor_id))
      order by p.created_at desc, p.id desc
      limit page_limit
    )
    select c.id, c.mock_image_url, c.cloudinary_public_id, c.width, c.height,
      c.caption, c.created_at, c.guest_id, c.guest_nickname,
      (select count(*) from photo_likes pl where pl.photo_id = c.id)::bigint,
      case when target_current_guest_id is null then false else exists (
        select 1 from photo_likes pl
        where pl.photo_id = c.id and pl.guest_id = target_current_guest_id
      ) end
    from candidates c
    order by c.created_at desc, c.id desc;
  else
    return query
    with candidates as materialized (
      select p.id, p.mock_image_url, p.cloudinary_public_id, p.width, p.height,
        p.caption, p.created_at, g.id as guest_id, g.nickname as guest_nickname
      from photos p
      join guests g on g.id = p.guest_id and g.event_id = p.event_id
      where p.event_id = target_event_id
        and p.status = 'published'
        and (target_guest_id is null or p.guest_id = target_guest_id)
        and (cursor_id is null or (p.created_at, p.id) > (cursor_created_at, cursor_id))
      order by p.created_at asc, p.id asc
      limit page_limit
    )
    select c.id, c.mock_image_url, c.cloudinary_public_id, c.width, c.height,
      c.caption, c.created_at, c.guest_id, c.guest_nickname,
      (select count(*) from photo_likes pl where pl.photo_id = c.id)::bigint,
      case when target_current_guest_id is null then false else exists (
        select 1 from photo_likes pl
        where pl.photo_id = c.id and pl.guest_id = target_current_guest_id
      ) end
    from candidates c
    order by c.created_at asc, c.id asc;
  end if;
end;
$$;

comment on function public.list_public_photos_with_likes(uuid, uuid, uuid, text, integer, timestamptz, uuid) is
  'Keyset-paginated public feed with guest and like state in one database call.';
