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
