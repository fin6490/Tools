-- Oche (darts coach, /darts-coach/): one row per finished practice game, plus a
-- daily counter for Claude calls (board photo checks and coach plans).
-- Rows are locked to their owner by RLS; the darts-coach Edge Function also
-- checks the caller is on the owner list before it spends any API credit.

create table if not exists public.darts_sessions (
  id         text primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  game       text not null,
  played_at  timestamptz not null,
  data       jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists darts_sessions_user_played on public.darts_sessions (user_id, played_at desc);
alter table public.darts_sessions enable row level security;

drop policy if exists "darts own select" on public.darts_sessions;
drop policy if exists "darts own insert" on public.darts_sessions;
drop policy if exists "darts own update" on public.darts_sessions;
drop policy if exists "darts own delete" on public.darts_sessions;
create policy "darts own select" on public.darts_sessions for select to authenticated using (user_id = (select auth.uid()));
create policy "darts own insert" on public.darts_sessions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "darts own update" on public.darts_sessions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "darts own delete" on public.darts_sessions for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.darts_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null default current_date,
  n       int  not null default 0,
  primary key (user_id, day)
);
alter table public.darts_ai_usage enable row level security; -- service role only, no policies

-- Count one Claude call; returns the new count, or -1 when the cap is reached.
create or replace function public.darts_bump_usage(p_user uuid, p_cap int)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into darts_ai_usage (user_id, day, n) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set n = darts_ai_usage.n + 1
  where darts_ai_usage.n < p_cap
  returning n into v;
  return coalesce(v, -1);
end $$;
revoke all on function public.darts_bump_usage(uuid, int) from public, anon, authenticated;
