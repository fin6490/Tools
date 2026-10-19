-- Quiz Dash global leaderboard.
-- Applied to the SpinDecks Supabase project (ref alysrhsucjhsrfhdkyco) via the
-- Supabase dashboard / MCP. Kept here as the source-of-truth record.
--
-- Public read; anyone may post a run (no account needed), but Row-Level
-- Security keeps each insert within sane bounds — the anon key can only write
-- rows that satisfy the check below, matching the existing daily_scores board.

create table if not exists public.dash_scores (
  id         bigint generated always as identity primary key,
  name       text not null,
  topic      text not null default '',
  score      integer not null,
  level      smallint not null default 1,
  device_id  text not null default '',
  created_at timestamptz not null default now()
);

alter table public.dash_scores enable row level security;

drop policy if exists "read the dash board" on public.dash_scores;
create policy "read the dash board" on public.dash_scores
  for select using (true);

drop policy if exists "post a dash score" on public.dash_scores;
create policy "post a dash score" on public.dash_scores
  for insert with check (
    char_length(name) between 1 and 24
    and char_length(coalesce(topic, '')) <= 60
    and score >= 0 and score <= 100000
    and level >= 1 and level <= 999
  );

grant select, insert on public.dash_scores to anon, authenticated;

create index if not exists dash_scores_score_idx
  on public.dash_scores (score desc, created_at desc);
