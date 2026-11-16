-- live_games / live_players / live_answers — backend for SpinDecks Live, the
-- whole-class Kahoot-style quiz. All access is mediated by the `live-game` Edge
-- Function (service role); RLS is ON with no anon policies, so the tables are
-- unreachable with the public anon key. Applied as migration `live_games_schema`.

create table if not exists public.live_games (
  id uuid primary key default gen_random_uuid(),
  pin text not null unique,
  host_token text not null,
  set_name text not null default 'Quiz',
  questions jsonb not null,                 -- [{ q, options:[...], correct:int }]
  state text not null default 'lobby',      -- lobby | question | reveal | ended
  current_q int not null default -1,
  q_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists live_games_pin_idx on public.live_games (pin);
create index if not exists live_games_created_idx on public.live_games (created_at);

create table if not exists public.live_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.live_games(id) on delete cascade,
  name text not null,
  player_token text not null,
  score int not null default 0,
  streak int not null default 0,
  joined_at timestamptz not null default now()
);
create index if not exists live_players_game_idx on public.live_players (game_id);

create table if not exists public.live_answers (
  game_id uuid not null references public.live_games(id) on delete cascade,
  player_id uuid not null references public.live_players(id) on delete cascade,
  q_index int not null,
  choice int not null,
  correct bool not null,
  ms int not null default 0,
  primary key (game_id, player_id, q_index)
);

alter table public.live_games enable row level security;
alter table public.live_players enable row level security;
alter table public.live_answers enable row level security;
-- No anon policies by design: the live-game Edge Function (service role) is the
-- only interface. The function validates host/player tokens and caps game size.
