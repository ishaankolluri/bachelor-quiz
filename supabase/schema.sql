-- Bachelor Party Quiz App Schema

-- Game sessions
create table games (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'lobby' check (status in ('lobby', 'active', 'grading', 'revealing', 'finished')),
  current_question int not null default 0,
  created_at timestamp with time zone default now()
);

-- Questions (pre-loaded by host)
create table questions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  text text not null,
  correct_answer text,
  order_num int not null
);

-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  name text not null,
  score int not null default 0,
  joined_at timestamp with time zone default now()
);

-- Answers
create table answers (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  answer_text text not null,
  is_correct boolean,
  submitted_at timestamp with time zone default now()
);

-- Enable realtime for all tables
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table questions;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table answers;

-- RLS policies (permissive for this app — no auth)
alter table games enable row level security;
alter table questions enable row level security;
alter table players enable row level security;
alter table answers enable row level security;

create policy "Allow all on games" on games for all using (true) with check (true);
create policy "Allow all on questions" on questions for all using (true) with check (true);
create policy "Allow all on players" on players for all using (true) with check (true);
create policy "Allow all on answers" on answers for all using (true) with check (true);
