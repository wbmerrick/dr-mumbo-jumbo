-- Dr Mumbo Jumbo — funnel counter for dr-mumbo-jumbo.com.
-- Run once in the Supabase SQL Editor for project jodcpflzbmhnnivtwghw.
-- Additive only: creates one table, two indexes and one function. Drops nothing,
-- alters nothing that already exists. Safe to re-run.
--
-- Why a function instead of an insert policy: this project also holds the patient
-- tables, so the site is never given a key that can do more than add a count. RLS is
-- on with NO policies, which makes dmj_events unreachable through the REST API
-- entirely; dmj_count() is the only way in and it can do nothing but insert.
-- (Same choice as supabase/waitlist.sql, for the same reason.)
--
-- WHAT GOES IN HERE: counts and flags only — which action happened, which part of a
-- kit, a severity label, a random per-build tag. Never submitted text, never an email
-- address, never an IP. privacy.html says exactly this and qa/tests/test-count.js
-- asserts it. Please keep it that way.

create table if not exists public.dmj_events (
  id         bigint generated always as identity primary key,
  evt        text not null,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.dmj_events is
  'Funnel counts from dr-mumbo-jumbo.com (kit_part, translate, appeal, kit_emailed, lead). Counts and flags only - never submitted text, email addresses or IPs. Kits built = distinct data->>''kid'' covering all 6 parts.';

create index if not exists dmj_events_evt_created_idx
  on public.dmj_events (evt, created_at desc);

create index if not exists dmj_events_kid_idx
  on public.dmj_events ((data->>'kid')) where evt = 'kit_part';

alter table public.dmj_events enable row level security;

create or replace function public.dmj_count(p_evt text, p_data jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.dmj_events (evt, data)
  values (left(p_evt, 64), coalesce(p_data, '{}'::jsonb));
$$;

comment on function public.dmj_count(text, jsonb) is
  'Insert-only funnel counter for dr-mumbo-jumbo.com. The only write path into dmj_events; cannot read or modify anything.';

revoke all on function public.dmj_count(text, jsonb) from public;
grant execute on function public.dmj_count(text, jsonb) to anon;


-- ---------------------------------------------------------------------------
-- Reading it afterwards.
-- A kit is six calls, so NEVER count rows. Count distinct tags.
-- ---------------------------------------------------------------------------

-- Kits actually built, by day
--   select date_trunc('day', created_at)::date as day, count(*) as kits_built
--   from (
--     select data->>'kid' as kid, min(created_at) as created_at
--     from public.dmj_events
--     where evt = 'kit_part'
--     group by 1
--     having count(distinct (data->>'part')) = 6
--   ) k
--   group by 1 order by 1 desc;

-- The whole funnel, last 30 days
--   select
--     (select count(distinct data->>'kid') from public.dmj_events
--        where evt = 'kit_part' and created_at > now() - interval '30 days')      as kits_started,
--     (select count(*) from (
--        select data->>'kid' from public.dmj_events
--        where evt = 'kit_part' and created_at > now() - interval '30 days'
--        group by 1 having count(distinct (data->>'part')) = 6) q)               as kits_built,
--     (select count(*) from public.dmj_events
--        where evt = 'kit_emailed' and created_at > now() - interval '30 days')  as kits_emailed,
--     (select count(*) from public.dmj_events
--        where evt = 'lead' and created_at > now() - interval '30 days')         as leads,
--     (select count(*) from public.dmj_events
--        where evt = 'translate' and created_at > now() - interval '30 days')    as translations,
--     (select count(*) from public.dmj_events
--        where evt = 'appeal' and created_at > now() - interval '30 days')       as appeal_letters;

-- Where kits fall over: how far they got before stopping
--   select parts_done, count(*) as kits
--   from (
--     select data->>'kid' as kid, count(distinct (data->>'part')) as parts_done
--     from public.dmj_events where evt = 'kit_part' group by 1
--   ) k
--   group by 1 order by 1;
