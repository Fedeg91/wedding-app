-- Run in Supabase SQL Editor after `npm run load:seed`. Read-only diagnostics.
explain (analyze, buffers, format text)
select id, guest_id, created_at from public.photos
where event_id = '70ad0000-0000-4000-8000-000000000001' and status = 'published'
order by created_at desc, id desc limit 21;

explain (analyze, buffers, format text)
select id, guest_id, created_at from public.photos
where event_id = '70ad0000-0000-4000-8000-000000000001'
  and guest_id = (select id from public.guests where event_id = '70ad0000-0000-4000-8000-000000000001' limit 1)
  and status = 'published'
order by created_at desc, id desc limit 21;

explain (analyze, buffers, format text)
select id, nickname from public.guests
where event_id = '70ad0000-0000-4000-8000-000000000001' order by nickname;

explain (analyze, buffers, format text)
select count(*) from public.photos
where event_id = '70ad0000-0000-4000-8000-000000000001' and status = 'published';

-- Consolidated public feed: first page, deep cursor and guest filter.
explain (analyze, buffers, format text)
select * from public.list_public_photos_with_likes(
  '70ad0000-0000-4000-8000-000000000001', null,
  'ffbe28bc-f6b8-433e-8dcd-6813d29a3eff', 'newest', 21, null, null
);

explain (analyze, buffers, format text)
select * from public.list_public_photos_with_likes(
  '70ad0000-0000-4000-8000-000000000001', null,
  'ffbe28bc-f6b8-433e-8dcd-6813d29a3eff', 'newest', 21,
  '2026-06-01T12:08:00Z', 'ffffffff-ffff-4fff-8fff-ffffffffffff'
);

explain (analyze, buffers, format text)
select * from public.list_public_photos_with_likes(
  '70ad0000-0000-4000-8000-000000000001',
  'ffbe28bc-f6b8-433e-8dcd-6813d29a3eff',
  'ffbe28bc-f6b8-433e-8dcd-6813d29a3eff', 'newest', 21, null, null
);

-- Like aggregation and admin most-liked ordering.
explain (analyze, buffers, format text)
select photo_id, count(*) from public.photo_likes
where photo_id in (
  select id from public.photos
  where event_id = '70ad0000-0000-4000-8000-000000000001'
  order by created_at desc, id desc limit 20
) group by photo_id;

explain (analyze, buffers, format text)
select * from public.list_admin_photos_with_likes(
  '70ad0000-0000-4000-8000-000000000001', 'all', 'most_liked', 31,
  null, null, null
);
