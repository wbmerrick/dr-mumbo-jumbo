-- Dr Mumbo Jumbo — tighten dmj_events privileges. Run once in the Supabase SQL Editor.
-- Additive/subtractive only on dmj_events; touches nothing else.
--
-- WHY THIS EXISTS (an error in supabase/dmj-events.sql worth stating plainly):
-- that file claims "RLS is on with NO policies, which makes dmj_events unreachable
-- through the REST API entirely; dmj_count() is the only way in". The RLS half is true.
-- The implication was not: Supabase grants anon and authenticated full table DML on every
-- new table in the public schema by default (ALTER DEFAULT PRIVILEGES), so anon ended up
-- holding INSERT, SELECT, UPDATE, DELETE, TRUNCATE, TRIGGER and REFERENCES on dmj_events.
-- The original migration never granted those and never revoked them either.
--
-- Is it exploitable today? Not through the published anon key: PostgREST exposes only
-- SELECT/INSERT/UPDATE/DELETE and RPC, and RLS with no policies denies all four. TRUNCATE
-- is not subject to RLS at all, but PostgREST will not issue one.
--
-- So this is defence in depth, not an incident. It matters because the guarantee was
-- resting on one mechanism (RLS) while claiming two, and a single permissive policy added
-- later - by anyone, for any reason - would hand anon the whole table. The neighbouring
-- dmj_fight_pack_waitlist already holds the stricter shape: anon has INSERT and nothing else.

revoke all on public.dmj_events from anon, authenticated;

-- The function is the write path and keeps its own grant. Re-stated here so running this
-- file alone cannot leave the counter unable to write.
grant execute on function public.dmj_count(text, jsonb) to anon;

-- Verify (expect: no anon/authenticated rows at all, and anon_can_execute = true)
--   select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema='public' and table_name='dmj_events'
--     and grantee in ('anon','authenticated');
--
--   select has_function_privilege('anon','public.dmj_count(text,jsonb)','EXECUTE');
