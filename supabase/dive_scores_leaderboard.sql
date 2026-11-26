-- Deep Dive global leaderboard.
-- Applied to the SpinDecks Supabase project (ref alysrhsucjhsrfhdkyco) via the
-- Supabase MCP (migration dive_scores_leaderboard). Kept here as the record.
--
-- Public read; anyone may post a dive (no account needed), but Row-Level
-- Security keeps each insert within sane bounds — mirrors dash_scores.

create table if not exists public.dive_scores (
  id         bigint generated always as identity primary key,
  name       text not null,
  depth      integer not null,
  mode       text not null default 'random',
  device_id  text not null default '',
  created_at timestamptz not null default now()
);

alter table public.dive_scores enable row level security;

drop policy if exists "read the dive board" on public.dive_scores;
create policy "read the dive board" on public.dive_scores
  for select using (true);

drop policy if exists "post a dive score" on public.dive_scores;
create policy "post a dive score" on public.dive_scores
  for insert with check (
    char_length(name) between 1 and 24
    and depth >= 0 and depth <= 7000
    and mode in ('daily', 'random')
  );

grant select, insert on public.dive_scores to anon, authenticated;

create index if not exists dive_scores_depth_idx
  on public.dive_scores (depth desc, created_at desc);
