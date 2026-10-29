-- Dr Mumbo Jumbo — Fight Pack waitlist table.
-- Run once in the Supabase dashboard (SQL Editor) for the project used in api/lead.js.
-- The site inserts with the public (anon) key; row-level security below allows INSERT only,
-- so nothing can be read, changed, or deleted through the public key.

create table if not exists public.dmj_fight_pack_waitlist (
  id          bigint generated always as identity primary key,
  email       text        not null unique,
  fighting    text,                       -- 'denied-claim' | 'big-bill' | 'confusing-eob' | 'other'
  source      text,                       -- e.g. 'dr-mumbo-jumbo.com'
  created_at  timestamptz not null default now()
);

alter table public.dmj_fight_pack_waitlist enable row level security;

drop policy if exists "waitlist_insert_anon" on public.dmj_fight_pack_waitlist;
create policy "waitlist_insert_anon"
  on public.dmj_fight_pack_waitlist
  for insert
  to anon
  with check (true);

-- Intentionally no SELECT / UPDATE / DELETE policies for anon.
-- Read the list from the Supabase dashboard (Table Editor) or with the service-role key.
