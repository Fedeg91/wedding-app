alter table public.photos
  add column upload_group_id uuid null,
  add column upload_group_created_at timestamptz null,
  add column upload_group_position smallint null;

alter table public.photos add constraint photos_upload_group_fields_check check (
  (upload_group_id is null and upload_group_created_at is null and upload_group_position is null)
  or
  (upload_group_id is not null and upload_group_created_at is not null and upload_group_position between 0 and 3)
);

create unique index photos_event_upload_group_position_unique_idx
  on public.photos(event_id, upload_group_id, upload_group_position)
  where upload_group_id is not null;

create index photos_published_post_order_idx
  on public.photos(event_id, upload_group_created_at desc, upload_group_id desc)
  where status = 'published' and upload_group_id is not null;

drop function public.list_public_photos_with_likes(uuid, uuid, uuid, text, integer, timestamptz, uuid);

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
  like_count bigint, liked_by_current_guest boolean
)
language plpgsql stable security invoker set search_path = public
as $$
begin
  if sort_order not in ('newest', 'oldest') or page_limit not between 1 and 51 then
    raise exception 'invalid public photo feed parameters' using errcode = '22023';
  end if;
  if target_guest_id is not null and not exists (select 1 from guests g where g.id = target_guest_id and g.event_id = target_event_id) then return; end if;
  if target_current_guest_id is not null and not exists (select 1 from guests g where g.id = target_current_guest_id and g.event_id = target_event_id) then return; end if;

  if sort_order = 'newest' then
    return query
    with posts as materialized (
      select coalesce(p.upload_group_id, p.id) as post_id,
        coalesce(p.upload_group_created_at, p.created_at) as post_created_at
      from photos p
      where p.event_id = target_event_id and p.status = 'published'
        and (target_guest_id is null or p.guest_id = target_guest_id)
        and (cursor_id is null or (coalesce(p.upload_group_created_at, p.created_at), coalesce(p.upload_group_id, p.id)) < (cursor_created_at, cursor_id))
      group by 1, 2 order by 2 desc, 1 desc limit page_limit
    )
    select p.id, pc.post_id, pc.post_created_at, coalesce(p.upload_group_position, 0::smallint),
      p.mock_image_url, p.cloudinary_public_id, p.width, p.height, p.caption, p.created_at,
      g.id, g.nickname, (select count(*) from photo_likes pl where pl.photo_id = p.id)::bigint,
      case when target_current_guest_id is null then false else exists (select 1 from photo_likes pl where pl.photo_id = p.id and pl.guest_id = target_current_guest_id) end
    from posts pc join photos p on p.event_id = target_event_id and p.status = 'published' and coalesce(p.upload_group_id, p.id) = pc.post_id
    join guests g on g.id = p.guest_id and g.event_id = p.event_id
    order by pc.post_created_at desc, pc.post_id desc, coalesce(p.upload_group_position, 0), p.id;
  else
    return query
    with posts as materialized (
      select coalesce(p.upload_group_id, p.id) as post_id,
        coalesce(p.upload_group_created_at, p.created_at) as post_created_at
      from photos p
      where p.event_id = target_event_id and p.status = 'published'
        and (target_guest_id is null or p.guest_id = target_guest_id)
        and (cursor_id is null or (coalesce(p.upload_group_created_at, p.created_at), coalesce(p.upload_group_id, p.id)) > (cursor_created_at, cursor_id))
      group by 1, 2 order by 2 asc, 1 asc limit page_limit
    )
    select p.id, pc.post_id, pc.post_created_at, coalesce(p.upload_group_position, 0::smallint),
      p.mock_image_url, p.cloudinary_public_id, p.width, p.height, p.caption, p.created_at,
      g.id, g.nickname, (select count(*) from photo_likes pl where pl.photo_id = p.id)::bigint,
      case when target_current_guest_id is null then false else exists (select 1 from photo_likes pl where pl.photo_id = p.id and pl.guest_id = target_current_guest_id) end
    from posts pc join photos p on p.event_id = target_event_id and p.status = 'published' and coalesce(p.upload_group_id, p.id) = pc.post_id
    join guests g on g.id = p.guest_id and g.event_id = p.event_id
    order by pc.post_created_at asc, pc.post_id asc, coalesce(p.upload_group_position, 0), p.id;
  end if;
end;
$$;
