-- Temporary, service-role-only diagnostics. Removed by the next migration
-- after plans have been captured for the event-readiness audit.
create function public.event_readiness_query_plans()
returns table (plan_name text, plan json)
language plpgsql
security invoker
set search_path = public
as $$
begin
  plan_name := 'public_feed_first_page';
  execute $query$
    explain (analyze, buffers, format json)
    with candidates as materialized (
      select p.id, p.created_at, p.guest_id
      from photos p
      join guests g on g.id = p.guest_id and g.event_id = p.event_id
      where p.event_id = '70ad0000-0000-4000-8000-000000000001'
        and p.status = 'published'
      order by p.created_at desc, p.id desc limit 21
    )
    select c.*,
      (select count(*) from photo_likes pl where pl.photo_id = c.id) as like_count,
      exists (select 1 from photo_likes pl where pl.photo_id = c.id and pl.guest_id = 'ffbe28bc-f6b8-433e-8dcd-6813d29a3eff') as liked
    from candidates c order by c.created_at desc, c.id desc
  $query$ into plan;
  return next;

  plan_name := 'public_feed_deep_cursor';
  execute $query$
    explain (analyze, buffers, format json)
    select p.id, p.created_at, p.guest_id
    from photos p
    where p.event_id = '70ad0000-0000-4000-8000-000000000001'
      and p.status = 'published'
      and (p.created_at, p.id) < ('2026-06-01T12:08:00Z', 'ffffffff-ffff-4fff-8fff-ffffffffffff')
    order by p.created_at desc, p.id desc limit 21
  $query$ into plan;
  return next;

  plan_name := 'public_feed_guest_filter';
  execute $query$
    explain (analyze, buffers, format json)
    select p.id, p.created_at, p.guest_id
    from photos p
    where p.event_id = '70ad0000-0000-4000-8000-000000000001'
      and p.guest_id = 'ffbe28bc-f6b8-433e-8dcd-6813d29a3eff'
      and p.status = 'published'
    order by p.created_at desc, p.id desc limit 21
  $query$ into plan;
  return next;

  plan_name := 'likes_for_page';
  execute $query$
    explain (analyze, buffers, format json)
    select photo_id, count(*) from photo_likes
    where photo_id in (
      select id from photos
      where event_id = '70ad0000-0000-4000-8000-000000000001'
      order by created_at desc, id desc limit 20
    ) group by photo_id
  $query$ into plan;
  return next;

  plan_name := 'admin_most_liked';
  execute $query$
    explain (analyze, buffers, format json)
    select p.id, p.created_at, count(pl.id)::bigint as like_count
    from photos p
    join guests g on g.id = p.guest_id and g.event_id = p.event_id
    left join photo_likes pl on pl.photo_id = p.id
    where p.event_id = '70ad0000-0000-4000-8000-000000000001'
      and p.status in ('published', 'hidden')
    group by p.id, g.id, g.nickname
    order by count(pl.id) desc, p.created_at desc, p.id desc limit 31
  $query$ into plan;
  return next;
end;
$$;

revoke all on function public.event_readiness_query_plans() from public, anon, authenticated;
grant execute on function public.event_readiness_query_plans() to service_role;
