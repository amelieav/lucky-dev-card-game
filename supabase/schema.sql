-- Lucky Agent Supabase schema + RPCs (Card Pack Economy)
-- Run in Supabase SQL editor after creating a new project.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.player_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins bigint not null default 100,
  luck_level int not null default 0,
  passive_rate_bp int not null default 0,
  highest_tier_unlocked int not null default 1,
  eggs_opened int not null default 0,
  packs_opened int not null default 0,
  manual_opens int not null default 0,
  auto_opens int not null default 0,
  tier_boost_level int not null default 0,
  mutation_level int not null default 0,
  value_level int not null default 0,
  auto_unlocked boolean not null default false,
  auto_speed_level int not null default 0,
  auto_open_progress numeric not null default 0,
  last_tick_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.player_state add column if not exists packs_opened int not null default 0;
alter table public.player_state add column if not exists manual_opens int not null default 0;
alter table public.player_state add column if not exists auto_opens int not null default 0;
alter table public.player_state add column if not exists tier_boost_level int not null default 0;
alter table public.player_state add column if not exists mutation_level int not null default 0;
alter table public.player_state add column if not exists value_level int not null default 0;
alter table public.player_state add column if not exists auto_unlocked boolean not null default false;
alter table public.player_state add column if not exists auto_speed_level int not null default 0;
alter table public.player_state add column if not exists auto_open_progress numeric not null default 0;

update public.player_state
set packs_opened = eggs_opened
where packs_opened = 0 and eggs_opened > 0;

update public.player_state
set eggs_opened = packs_opened
where eggs_opened <> packs_opened;

create table if not exists public.player_terms (
  user_id uuid not null references auth.users(id) on delete cascade,
  term_key text not null,
  copies int not null default 0,
  level int not null default 1,
  best_mutation text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, term_key)
);

alter table public.player_terms add column if not exists best_mutation text not null default 'none';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'player_terms_best_mutation_check'
  ) then
    alter table public.player_terms
      add constraint player_terms_best_mutation_check
      check (best_mutation in ('none', 'foil', 'holo'));
  end if;
end;
$$;

create table if not exists public.player_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nick_part_a text not null,
  nick_part_b text not null,
  nick_part_c text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debug_allowlist (
  email text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.player_debug_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  next_reward jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.term_catalog (
  term_key text primary key,
  display_name text not null,
  tier int not null check (tier between 1 and 6),
  rarity text not null check (rarity in ('common', 'rare', 'legendary')),
  base_bp int not null check (base_bp >= 0)
);

-- GENERATED: term_catalog:start
insert into public.term_catalog (term_key, display_name, tier, rarity, base_bp)
values
  ('hello_world', 'Hello World', 1, 'common', 60),
  ('stack_overflow', 'Stack Overflow', 1, 'common', 69),
  ('console_log', 'Console Log', 1, 'common', 78),
  ('todo_comment', 'TODO Comment', 1, 'common', 87),
  ('off_by_one_error', 'Off-by-One Error', 1, 'common', 96),
  ('infinite_loop', 'Infinite Loop', 1, 'rare', 105),
  ('rubber_duck', 'Rubber Duck', 1, 'rare', 114),
  ('missing_semicolon', 'Missing Semicolon', 1, 'rare', 123),
  ('copy_paste_dev', 'Copy-Paste Dev', 1, 'rare', 132),
  ('git_commit', 'Git Commit', 1, 'legendary', 141),
  ('merge_conflict', 'Merge Conflict', 2, 'common', 110),
  ('npm_install', 'npm Install', 2, 'common', 119),
  ('404_not_found', '404 Not Found', 2, 'common', 128),
  ('debugger_breakpoint', 'Debugger Breakpoint', 2, 'common', 137),
  ('json_parse_error', 'JSON Parse Error', 2, 'common', 146),
  ('api_timeout', 'API Timeout', 2, 'rare', 155),
  ('version_mismatch', 'Version Mismatch', 2, 'rare', 164),
  ('environment_variable', 'Environment Variable', 2, 'rare', 173),
  ('hotfix_friday', 'Hotfix Friday', 2, 'rare', 182),
  ('regex_attempt', 'Regex Attempt', 2, 'legendary', 191),
  ('async_await', 'Async Await', 3, 'common', 170),
  ('rest_api', 'REST API', 3, 'common', 179),
  ('unit_test', 'Unit Test', 3, 'common', 188),
  ('docker_container', 'Docker Container', 3, 'common', 197),
  ('ci_pipeline', 'CI Pipeline', 3, 'common', 206),
  ('code_review', 'Code Review', 3, 'rare', 215),
  ('refactor', 'Refactor', 3, 'rare', 224),
  ('memory_leak', 'Memory Leak', 3, 'rare', 233),
  ('sql_injection', 'SQL Injection', 3, 'rare', 242),
  ('cache_miss', 'Cache Miss', 3, 'legendary', 251),
  ('microservices', 'Microservices', 4, 'common', 240),
  ('distributed_system', 'Distributed System', 4, 'common', 249),
  ('event_loop', 'Event Loop', 4, 'common', 258),
  ('race_condition', 'Race Condition', 4, 'common', 267),
  ('load_balancer', 'Load Balancer', 4, 'common', 276),
  ('tech_debt', 'Tech Debt', 4, 'rare', 285),
  ('deadlock', 'Deadlock', 4, 'rare', 294),
  ('observability', 'Observability', 4, 'rare', 303),
  ('feature_flag', 'Feature Flag', 4, 'rare', 312),
  ('blue_green_deploy', 'Blue-Green Deploy', 4, 'legendary', 321),
  ('compiler', 'Compiler', 5, 'common', 320),
  ('kernel', 'Kernel', 5, 'common', 329),
  ('zero_day', 'Zero-Day', 5, 'common', 338),
  ('concurrency_wizard', 'Concurrency Wizard', 5, 'common', 347),
  ('performance_tuning', 'Performance Tuning', 5, 'common', 356),
  ('ai_model', 'AI Model', 5, 'rare', 365),
  ('bare_metal', 'Bare Metal', 5, 'rare', 374),
  ('scalability', 'Scalability', 5, 'rare', 383),
  ('production_hotfix', 'Production Hotfix', 5, 'rare', 392),
  ('immutable_infrastructure', 'Immutable Infrastructure', 5, 'legendary', 401),
  ('the_clean_code', 'The Clean Code', 6, 'common', 410),
  ('infinite_uptime', 'Infinite Uptime', 6, 'common', 419),
  ('no_merge_conflicts', 'No Merge Conflicts', 6, 'common', 428),
  ('self_healing_system', 'Self-Healing System', 6, 'common', 437),
  ('the_senior_who_knows_everything', 'The Senior Who Knows Everything', 6, 'common', 446),
  ('the_one_who_uses_vim', 'The One Who Uses Vim', 6, 'rare', 455),
  ('linus_mode', 'Linus Mode', 6, 'rare', 464),
  ('the_bug_that_was_documentation', 'The Bug That Was Documentation', 6, 'rare', 473),
  ('100_test_coverage', '100% Test Coverage', 6, 'rare', 482),
  ('it_works_on_first_try', 'It Works On First Try', 6, 'legendary', 491)
on conflict (term_key) do update
set
  display_name = excluded.display_name,
  tier = excluded.tier,
  rarity = excluded.rarity,
  base_bp = excluded.base_bp;
-- GENERATED: term_catalog:end

drop trigger if exists player_state_updated_at on public.player_state;
create trigger player_state_updated_at
before update on public.player_state
for each row execute function public.set_updated_at();

drop trigger if exists player_terms_updated_at on public.player_terms;
create trigger player_terms_updated_at
before update on public.player_terms
for each row execute function public.set_updated_at();

drop trigger if exists player_profile_updated_at on public.player_profile;
create trigger player_profile_updated_at
before update on public.player_profile
for each row execute function public.set_updated_at();

drop trigger if exists player_debug_state_updated_at on public.player_debug_state;
create trigger player_debug_state_updated_at
before update on public.player_debug_state
for each row execute function public.set_updated_at();

alter table public.player_state enable row level security;
alter table public.player_terms enable row level security;
alter table public.player_profile enable row level security;
alter table public.player_debug_state enable row level security;
alter table public.debug_allowlist enable row level security;

drop policy if exists player_state_self_all on public.player_state;
create policy player_state_self_all on public.player_state
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists player_terms_self_all on public.player_terms;
create policy player_terms_self_all on public.player_terms
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists player_profile_self_all on public.player_profile;
create policy player_profile_self_all on public.player_profile
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists player_debug_state_self_all on public.player_debug_state;
create policy player_debug_state_self_all on public.player_debug_state
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- GENERATED: nickname_words:start
create or replace function public.allowed_nick_words()
returns text[]
language sql
stable
as $$
  select array[
    'Amber', 'Aqua', 'Azure', 'Beige', 'Black', 'Blue', 'Bronze', 'Coral', 'Crimson', 'Cyan', 'Emerald', 'Gold', 'Gray', 'Green',
    'Indigo', 'Ivory', 'Jade', 'Lavender', 'Lime', 'Magenta', 'Maroon', 'Mint', 'Navy', 'Neon', 'Olive', 'Orange', 'Peach', 'Pink',
    'Plum', 'Purple', 'Red', 'Rose', 'Ruby', 'Saffron', 'Scarlet', 'Silver', 'Teal', 'Turquoise', 'Violet', 'White', 'Yellow', 'Agile',
    'Alert', 'Bold', 'Bright', 'Calm', 'Clever', 'Crisp', 'Daring', 'Eager', 'Fancy', 'Fast', 'Fierce', 'Focused', 'Gentle', 'Grand',
    'Happy', 'Icy', 'Jolly', 'Keen', 'Kind', 'Lucky', 'Mighty', 'Nimble', 'Noble', 'Patient', 'Playful', 'Proud', 'Quick', 'Rapid',
    'Ready', 'Sharp', 'Silent', 'Smart', 'Smooth', 'Solid', 'Steady', 'Steel', 'Sunny', 'Swift', 'Tidy', 'Vivid', 'Wise', 'Zesty',
    'Ant', 'Bear', 'Beaver', 'Bee', 'Bison', 'Cat', 'Cheetah', 'Cobra', 'Crane', 'Crow', 'Deer', 'Dolphin', 'Dragon', 'Eagle',
    'Falcon', 'Finch', 'Fox', 'Frog', 'Gecko', 'Hawk', 'Horse', 'Hound', 'Koala', 'Lion', 'Lynx', 'Mantis', 'Moose', 'Otter',
    'Owl', 'Panda', 'Panther', 'Penguin', 'Pigeon', 'Puma', 'Rabbit', 'Raven', 'Seal', 'Shark', 'Sparrow', 'Tiger', 'Turtle', 'Whale',
    'Wolf', 'Wren', 'Yak', 'Zebra', 'Anchor', 'Arrow', 'Beacon', 'Blade', 'Bolt', 'Book', 'Bridge', 'Cannon', 'Clock', 'Compass',
    'Crystal', 'Cube', 'Disk', 'Drone', 'Engine', 'Feather', 'Flame', 'Gadget', 'Gear', 'Globe', 'Hammer', 'Helmet', 'Jet', 'Key',
    'Lantern', 'Laser', 'Lens', 'Magnet', 'Mirror', 'Needle', 'Nova', 'Orb', 'Pixel', 'Planet', 'Prism', 'Radar', 'Rocket', 'Shield',
    'Signal', 'Socket', 'Spark', 'Sphere', 'Star', 'Stone', 'Switch', 'Tablet', 'Tower', 'Wheel', 'Wing', 'Agent', 'Algorithm', 'Array',
    'Binary', 'Branch', 'Buffer', 'Cache', 'Class', 'Cloud', 'Code', 'Commit', 'Compiler', 'Cookie', 'Cursor', 'Data', 'Debug', 'Deploy',
    'Docker', 'Field', 'Flux', 'Frame', 'Function', 'Gateway', 'Git', 'Graph', 'Hash', 'Hook', 'Index', 'Kernel', 'Lambda', 'Library',
    'Linker', 'Logic', 'Loop', 'Matrix', 'Method', 'Module', 'Object', 'Packet', 'Parser', 'Patch', 'Pilot', 'Pipeline', 'Pointer', 'Process',
    'Protocol', 'Query', 'Queue', 'Script', 'Server', 'Stack', 'Stream', 'Syntax', 'Tensor', 'Thread', 'Token', 'Variable', 'Vector'
  ];
$$;

create or replace function public.allowed_nick_part_a()
returns text[]
language sql
stable
as $$
  select array[
    'Agile', 'Alert', 'Bold', 'Bright', 'Calm', 'Clever', 'Crisp', 'Daring', 'Eager', 'Fancy', 'Fast', 'Fierce', 'Focused', 'Gentle',
    'Grand', 'Happy', 'Icy', 'Jolly', 'Keen', 'Kind', 'Lucky', 'Mighty', 'Nimble', 'Noble', 'Patient', 'Playful', 'Proud', 'Quick',
    'Rapid', 'Ready', 'Sharp', 'Silent', 'Smart', 'Smooth', 'Solid', 'Steady', 'Steel', 'Sunny', 'Swift', 'Tidy', 'Vivid', 'Wise',
    'Zesty'
  ];
$$;

create or replace function public.allowed_nick_part_b()
returns text[]
language sql
stable
as $$
  select array[
    'Ant', 'Bear', 'Beaver', 'Bee', 'Bison', 'Cat', 'Cheetah', 'Cobra', 'Crane', 'Crow', 'Deer', 'Dolphin', 'Dragon', 'Eagle',
    'Falcon', 'Finch', 'Fox', 'Frog', 'Gecko', 'Hawk', 'Horse', 'Hound', 'Koala', 'Lion', 'Lynx', 'Mantis', 'Moose', 'Otter',
    'Owl', 'Panda', 'Panther', 'Penguin', 'Pigeon', 'Puma', 'Rabbit', 'Raven', 'Seal', 'Shark', 'Sparrow', 'Tiger', 'Turtle', 'Whale',
    'Wolf', 'Wren', 'Yak', 'Zebra'
  ];
$$;

create or replace function public.allowed_nick_part_c()
returns text[]
language sql
stable
as $$
  select array[
    'Anchor', 'Arrow', 'Beacon', 'Blade', 'Bolt', 'Book', 'Bridge', 'Cannon', 'Clock', 'Compass', 'Crystal', 'Cube', 'Disk', 'Drone',
    'Engine', 'Feather', 'Flame', 'Gadget', 'Gear', 'Globe', 'Hammer', 'Helmet', 'Jet', 'Key', 'Lantern', 'Laser', 'Lens', 'Magnet',
    'Mirror', 'Needle', 'Nova', 'Orb', 'Pixel', 'Planet', 'Prism', 'Radar', 'Rocket', 'Shield', 'Signal', 'Socket', 'Spark', 'Sphere',
    'Star', 'Stone', 'Switch', 'Tablet', 'Tower', 'Wheel', 'Wing'
  ];
$$;
-- GENERATED: nickname_words:end

create or replace function public.random_array_item(p_values text[])
returns text
language sql
volatile
as $$
  select p_values[1 + floor(random() * array_length(p_values, 1))::int];
$$;

create or replace function public.allowed_term_keys()
returns text[]
language sql
stable
as $$
  select coalesce(array_agg(tc.term_key order by tc.tier asc, tc.term_key asc), '{}')
  from public.term_catalog tc;
$$;

create or replace function public.term_rarity(term_key text)
returns text
language sql
stable
as $$
  select coalesce(
    (select tc.rarity from public.term_catalog tc where tc.term_key = $1),
    'common'
  );
$$;

create or replace function public.term_display_name(term_key text)
returns text
language sql
stable
as $$
  select coalesce(
    (select tc.display_name from public.term_catalog tc where tc.term_key = $1),
    $1
  );
$$;

create or replace function public.term_base_bp(term_key text)
returns int
language sql
stable
as $$
  select coalesce(
    (select tc.base_bp * 100 from public.term_catalog tc where tc.term_key = $1),
    0
  );
$$;

create or replace function public.calc_level(copies int)
returns int
language sql
immutable
as $$
  select greatest(1, floor(sqrt(greatest(copies, 1)::numeric))::int);
$$;

create or replace function public.normalize_mutation(p_mutation text)
returns text
language sql
immutable
as $$
  select case lower(coalesce($1, 'none'))
    when 'foil' then 'foil'
    when 'holo' then 'holo'
    when 'glitched' then 'holo'
    when 'prismatic' then 'holo'
    else 'none'
  end;
$$;

create or replace function public.mutation_rank(p_mutation text)
returns int
language sql
immutable
as $$
  select case public.normalize_mutation($1)
    when 'none' then 0
    when 'foil' then 1
    when 'holo' then 2
    else 0
  end;
$$;

create or replace function public.rarity_multiplier(p_rarity text)
returns numeric
language sql
immutable
as $$
  select case lower(coalesce($1, 'common'))
    when 'common' then 1.0
    when 'rare' then 1.8
    when 'legendary' then 3.2
    else 1.0
  end;
$$;

create or replace function public.mutation_multiplier(p_mutation text)
returns numeric
language sql
immutable
as $$
  select case public.normalize_mutation($1)
    when 'none' then 1.0
    when 'foil' then 1.0
    when 'holo' then 1.0
    else 1.0
  end;
$$;

create or replace function public.value_multiplier(p_value_level int)
returns numeric
language sql
immutable
as $$
  select 1.0;
$$;

create or replace function public.card_reward(
  p_term_key text,
  p_rarity text,
  p_mutation text,
  p_value_level int
)
returns bigint
language sql
stable
as $$
  with term_row as (
    select coalesce((select base_bp from public.term_catalog where term_key = p_term_key), 0)::numeric as base_bp
  )
  select floor(greatest(
    1,
    floor((select base_bp from term_row) * 0.06)
      * public.rarity_multiplier(p_rarity)
      * public.mutation_multiplier(p_mutation)
      * public.value_multiplier(p_value_level)
  ))::bigint;
$$;

create or replace function public.tier_unlock_required_packs(p_tier int)
returns int
language sql
immutable
as $$
  select case $1
    when 1 then 0
    when 2 then 40
    when 3 then 200
    when 4 then 550
    when 5 then 1100
    when 6 then 1900
    else 2147483647
  end;
$$;

create or replace function public.tier_unlock_required_boost(p_tier int)
returns int
language sql
immutable
as $$
  select case $1
    when 1 then 0
    when 2 then 1
    when 3 then 4
    when 4 then 7
    when 5 then 10
    when 6 then 13
    else 2147483647
  end;
$$;

create or replace function public.max_unlocked_tier(total_packs_opened int, tier_boost_level int)
returns int
language plpgsql
immutable
as $$
declare
  packs int;
  boost int;
begin
  packs := greatest(0, coalesce(total_packs_opened, 0));
  boost := greatest(0, coalesce(tier_boost_level, 0));

  if boost >= 13 and packs >= 1900 then return 6; end if;
  if boost >= 10 and packs >= 1100 then return 5; end if;
  if boost >= 7 and packs >= 550 then return 4; end if;
  if boost >= 4 and packs >= 200 then return 3; end if;
  if boost >= 1 and packs >= 40 then return 2; end if;
  return 1;
end;
$$;

-- Backward-compatible overload.
create or replace function public.max_unlocked_tier(total_eggs_opened int)
returns int
language sql
immutable
as $$
  select case
    when total_eggs_opened >= 100 then 6
    when total_eggs_opened >= 70 then 5
    when total_eggs_opened >= 45 then 4
    when total_eggs_opened >= 25 then 3
    when total_eggs_opened >= 10 then 2
    else 1
  end;
$$;

create or replace function public.base_tier_weights(p_tier_boost_level int)
returns table (t1 numeric, t2 numeric, t3 numeric, t4 numeric, t5 numeric, t6 numeric)
language plpgsql
immutable
as $$
declare
  lvl int;
  shifted_levels int;
  shift numeric;
begin
  lvl := greatest(0, least(20, coalesce(p_tier_boost_level, 0)));

  if lvl >= 13 then
    t1 := 41; t2 := 17; t3 := 16; t4 := 13; t5 := 8; t6 := 5;
  elsif lvl >= 10 then
    t1 := 53; t2 := 18; t3 := 14; t4 := 10; t5 := 5; t6 := 0;
  elsif lvl >= 7 then
    t1 := 66; t2 := 16; t3 := 11; t4 := 7; t5 := 0; t6 := 0;
  elsif lvl >= 4 then
    t1 := 78; t2 := 14; t3 := 8; t4 := 0; t5 := 0; t6 := 0;
  elsif lvl >= 1 then
    t1 := 90; t2 := 10; t3 := 0; t4 := 0; t5 := 0; t6 := 0;
  else
    t1 := 100; t2 := 0; t3 := 0; t4 := 0; t5 := 0; t6 := 0;
  end if;

  if lvl >= 14 then
    shifted_levels := lvl - 13;
    shift := shifted_levels * 0.6;
    t1 := greatest(0, t1 - shift);
    t6 := t6 + shift;
  end if;

  return next;
end;
$$;

create or replace function public.effective_tier_weights(
  p_total_packs_opened int,
  p_tier_boost_level int
)
returns table (t1 numeric, t2 numeric, t3 numeric, t4 numeric, t5 numeric, t6 numeric)
language plpgsql
immutable
as $$
declare
  highest int;
  base_t1 numeric;
  base_t2 numeric;
  base_t3 numeric;
  base_t4 numeric;
  base_t5 numeric;
  base_t6 numeric;
  unlocked_total numeric;
  locked_total numeric;
  norm_total numeric;
begin
  highest := public.max_unlocked_tier(p_total_packs_opened, p_tier_boost_level);

  select bw.t1, bw.t2, bw.t3, bw.t4, bw.t5, bw.t6
  into base_t1, base_t2, base_t3, base_t4, base_t5, base_t6
  from public.base_tier_weights(p_tier_boost_level) bw;

  unlocked_total :=
    (case when highest >= 1 then base_t1 else 0 end) +
    (case when highest >= 2 then base_t2 else 0 end) +
    (case when highest >= 3 then base_t3 else 0 end) +
    (case when highest >= 4 then base_t4 else 0 end) +
    (case when highest >= 5 then base_t5 else 0 end) +
    (case when highest >= 6 then base_t6 else 0 end);

  locked_total := 100 - unlocked_total;

  if unlocked_total <= 0 then
    t1 := case when highest = 1 then 100 else 0 end;
    t2 := case when highest = 2 then 100 else 0 end;
    t3 := case when highest = 3 then 100 else 0 end;
    t4 := case when highest = 4 then 100 else 0 end;
    t5 := case when highest = 5 then 100 else 0 end;
    t6 := case when highest = 6 then 100 else 0 end;
    return next;
  end if;

  t1 := case when highest >= 1 then base_t1 + (locked_total * (base_t1 / unlocked_total)) else 0 end;
  t2 := case when highest >= 2 then base_t2 + (locked_total * (base_t2 / unlocked_total)) else 0 end;
  t3 := case when highest >= 3 then base_t3 + (locked_total * (base_t3 / unlocked_total)) else 0 end;
  t4 := case when highest >= 4 then base_t4 + (locked_total * (base_t4 / unlocked_total)) else 0 end;
  t5 := case when highest >= 5 then base_t5 + (locked_total * (base_t5 / unlocked_total)) else 0 end;
  t6 := case when highest >= 6 then base_t6 + (locked_total * (base_t6 / unlocked_total)) else 0 end;

  norm_total := t1 + t2 + t3 + t4 + t5 + t6;
  if norm_total > 0 then
    t1 := (t1 / norm_total) * 100;
    t2 := (t2 / norm_total) * 100;
    t3 := (t3 / norm_total) * 100;
    t4 := (t4 / norm_total) * 100;
    t5 := (t5 / norm_total) * 100;
    t6 := (t6 / norm_total) * 100;
  end if;

  return next;
end;
$$;

create or replace function public.pick_effective_tier(
  p_total_packs_opened int,
  p_tier_boost_level int
)
returns int
language plpgsql
volatile
as $$
declare
  w1 numeric;
  w2 numeric;
  w3 numeric;
  w4 numeric;
  w5 numeric;
  w6 numeric;
  roll numeric;
begin
  select ew.t1, ew.t2, ew.t3, ew.t4, ew.t5, ew.t6
  into w1, w2, w3, w4, w5, w6
  from public.effective_tier_weights(p_total_packs_opened, p_tier_boost_level) ew;

  roll := random() * 100;

  if roll < w1 then return 1; end if;
  if roll < (w1 + w2) then return 2; end if;
  if roll < (w1 + w2 + w3) then return 3; end if;
  if roll < (w1 + w2 + w3 + w4) then return 4; end if;
  if roll < (w1 + w2 + w3 + w4 + w5) then return 5; end if;
  return 6;
end;
$$;

create or replace function public.rarity_weights(
  p_draw_tier int,
  p_value_level int
)
returns table (common_w numeric, rare_w numeric, legendary_w numeric)
language plpgsql
immutable
as $$
declare
  base_common numeric;
  base_rare numeric;
  base_legendary numeric;
  x numeric;
  common_fixed numeric;
  rest_total numeric;
  scale numeric;
  sum_total numeric;
begin
  case greatest(1, least(6, coalesce(p_draw_tier, 1)))
    when 1 then
      base_common := 77; base_rare := 20; base_legendary := 3;
    when 2 then
      base_common := 77; base_rare := 20; base_legendary := 3;
    when 3 then
      base_common := 77; base_rare := 20; base_legendary := 3;
    when 4 then
      base_common := 77; base_rare := 20; base_legendary := 3;
    when 5 then
      base_common := 77; base_rare := 20; base_legendary := 3;
    else
      base_common := 77; base_rare := 20; base_legendary := 3;
  end case;

  x := least(25, greatest(0, coalesce(p_value_level, 0)));

  common_fixed := greatest(25, base_common - (1.2 * x));
  rare_w := greatest(0, base_rare + (0.8 * x));
  legendary_w := greatest(0, base_legendary + (0.4 * x));

  if common_fixed >= 100 then
    common_w := 100; rare_w := 0; legendary_w := 0;
    return next;
  end if;

  rest_total := rare_w + legendary_w;
  if rest_total <= 0 then
    common_w := 100; rare_w := 0; legendary_w := 0;
    return next;
  end if;

  scale := (100 - common_fixed) / rest_total;

  common_w := common_fixed;
  rare_w := rare_w * scale;
  legendary_w := legendary_w * scale;

  sum_total := common_w + rare_w + legendary_w;
  if sum_total <> 100 then
    legendary_w := legendary_w + (100 - sum_total);
  end if;

  return next;
end;
$$;

create or replace function public.roll_rarity(p_egg_tier int, p_value_level int)
returns text
language plpgsql
volatile
as $$
declare
  common_w numeric;
  rare_w numeric;
  legendary_w numeric;
  roll numeric;
begin
  select rw.common_w, rw.rare_w, rw.legendary_w
  into common_w, rare_w, legendary_w
  from public.rarity_weights(p_egg_tier, p_value_level) rw;

  roll := random() * 100;

  if roll < common_w then return 'common'; end if;
  if roll < (common_w + rare_w) then return 'rare'; end if;
  return 'legendary';
end;
$$;

create or replace function public.mutation_weights(p_mutation_level int)
returns table (none_w numeric, foil_w numeric, holo_w numeric)
language plpgsql
immutable
as $$
declare
  m numeric;
  sum_total numeric;
begin
  m := least(25, greatest(0, coalesce(p_mutation_level, 0)));

  none_w := greatest(0, 90 - (1.4 * m));
  foil_w := greatest(0, 8 + (0.9 * m));
  holo_w := greatest(0, 2 + (0.5 * m));

  sum_total := none_w + foil_w + holo_w;
  if sum_total <= 0 then
    none_w := 100; foil_w := 0; holo_w := 0;
    return next;
  end if;

  none_w := (none_w / sum_total) * 100;
  foil_w := (foil_w / sum_total) * 100;
  holo_w := (holo_w / sum_total) * 100;

  return next;
end;
$$;

create or replace function public.roll_mutation(p_mutation_level int)
returns text
language plpgsql
volatile
as $$
declare
  none_w numeric;
  foil_w numeric;
  holo_w numeric;
  roll numeric;
begin
  select mw.none_w, mw.foil_w, mw.holo_w
  into none_w, foil_w, holo_w
  from public.mutation_weights(p_mutation_level) mw;

  roll := random() * 100;

  if roll < none_w then return 'none'; end if;
  if roll < (none_w + foil_w) then return 'foil'; end if;
  if roll < (none_w + foil_w + holo_w) then return 'holo'; end if;
  return 'holo';
end;
$$;

create or replace function public.random_term_by_pool(p_egg_tier int, p_rarity text)
returns text
language plpgsql
volatile
as $$
declare
  chosen_term text;
begin
  select tc.term_key
  into chosen_term
  from public.term_catalog tc
  where tc.tier = p_egg_tier
    and tc.rarity = lower(coalesce(p_rarity, 'common'))
  order by random()
  limit 1;

  if chosen_term is null then
    select tc.term_key
    into chosen_term
    from public.term_catalog tc
    where tc.tier = p_egg_tier
    order by random()
    limit 1;
  end if;

  return chosen_term;
end;
$$;

create or replace function public.upgrade_cap(p_upgrade_key text)
returns int
language sql
immutable
as $$
  select case lower(coalesce($1, ''))
    when 'auto_unlock' then 1
    when 'auto_speed' then 4
    when 'tier_boost' then 20
    when 'mutation_upgrade' then 25
    when 'value_upgrade' then 25
    when 'luck_engine' then 25
    when 'mutation_lab' then 25
    when 'value_engine' then 25
    else 0
  end;
$$;

create or replace function public.upgrade_cost(p_upgrade_key text, p_level int, p_auto_unlocked boolean default false)
returns bigint
language sql
immutable
as $$
  select case lower(coalesce(p_upgrade_key, ''))
    when 'auto_unlock' then case when p_auto_unlocked then null else 225::bigint end
    when 'auto_speed' then floor(120 * power(1.45, greatest(0, coalesce(p_level, 0))))::bigint
    when 'tier_boost' then floor(25 * power(1.42, greatest(0, coalesce(p_level, 0))))::bigint
    when 'mutation_upgrade' then floor(35 * power(1.38, greatest(0, coalesce(p_level, 0))))::bigint
    when 'value_upgrade' then floor(40 * power(1.40, greatest(0, coalesce(p_level, 0))))::bigint
    when 'luck_engine' then floor(40 * power(1.40, greatest(0, coalesce(p_level, 0))))::bigint
    when 'mutation_lab' then floor(35 * power(1.38, greatest(0, coalesce(p_level, 0))))::bigint
    when 'value_engine' then floor(40 * power(1.40, greatest(0, coalesce(p_level, 0))))::bigint
    else null
  end;
$$;

create or replace function public.is_debug_allowed()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.debug_allowlist
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.ensure_player_initialized(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  part_a text;
  part_b text;
  part_c text;
begin
  insert into public.player_state (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  update public.player_state
  set packs_opened = eggs_opened
  where user_id = p_user_id
    and packs_opened = 0
    and eggs_opened > 0;

  update public.player_state
  set eggs_opened = packs_opened
  where user_id = p_user_id
    and eggs_opened <> packs_opened;

  update public.player_state
  set highest_tier_unlocked = public.max_unlocked_tier(packs_opened, tier_boost_level)
  where user_id = p_user_id;

  if not exists (select 1 from public.player_profile where user_id = p_user_id) then
    part_a := public.random_array_item(public.allowed_nick_part_a());
    part_b := public.random_array_item(public.allowed_nick_part_b());
    part_c := public.random_array_item(public.allowed_nick_part_c());

    insert into public.player_profile (user_id, nick_part_a, nick_part_b, nick_part_c, display_name)
    values (p_user_id, part_a, part_b, part_c, concat(part_a, ' ', part_b, ' ', part_c));
  end if;

  insert into public.player_debug_state (user_id, next_reward)
  values (p_user_id, null)
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.recompute_passive_rate_bp(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  foil_cards int := 0;
  holo_cards int := 0;
  passive_rate_cps int := 0;
begin
  select
    count(*) filter (where public.normalize_mutation(best_mutation) = 'foil')::int,
    count(*) filter (where public.normalize_mutation(best_mutation) = 'holo')::int
  into foil_cards, holo_cards
  from public.player_terms
  where user_id = p_user_id;

  passive_rate_cps := (foil_cards * 1) + (holo_cards * 3);

  update public.player_state
  set passive_rate_bp = (passive_rate_cps * 100),
      updated_at = now()
  where user_id = p_user_id;

  return passive_rate_cps;
end;
$$;

create or replace function public.apply_auto_progress(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  state_row public.player_state;
  term_row public.player_terms;
  elapsed_seconds int;
  capped_seconds int;
  passive_rate_cps int := 0;
  openings numeric;
  whole_opens int;
  remainder numeric;
  draw_tier int;
  draw_rarity text;
  draw_mutation text;
  draw_term_key text;
  draw_reward bigint;
  max_tier int := 0;
  last_draw jsonb := null;
  i int;
begin
  select * into state_row
  from public.player_state
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('draws_applied', 0, 'draw', null, 'draw_max_tier', 0);
  end if;

  elapsed_seconds := greatest(0, extract(epoch from now() - state_row.last_tick_at)::int);
  capped_seconds := least(43200, elapsed_seconds);
  passive_rate_cps := public.recompute_passive_rate_bp(p_user_id);

  if capped_seconds > 0 and passive_rate_cps > 0 then
    update public.player_state
    set coins = coins + (passive_rate_cps * capped_seconds),
        updated_at = now()
    where user_id = p_user_id
    returning * into state_row;
  end if;

  if not state_row.auto_unlocked or capped_seconds <= 0 then
    update public.player_state
    set last_tick_at = now(),
        updated_at = now()
    where user_id = p_user_id;

    return jsonb_build_object('draws_applied', 0, 'draw', null, 'draw_max_tier', 0);
  end if;

  openings := coalesce(state_row.auto_open_progress, 0)
    + (
      capped_seconds
      * (1.0 / greatest(0.5, 2.5 - (0.5 * greatest(0, state_row.auto_speed_level))))
    );
  whole_opens := floor(openings)::int;
  remainder := openings - whole_opens;

  for i in 1..whole_opens loop
    draw_tier := public.pick_effective_tier(state_row.packs_opened, state_row.tier_boost_level);
    draw_rarity := public.roll_rarity(draw_tier, state_row.value_level);
    draw_mutation := public.roll_mutation(state_row.mutation_level);
    draw_term_key := public.random_term_by_pool(draw_tier, draw_rarity);

    if draw_term_key is null then
      raise exception 'Unable to resolve draw term';
    end if;

    draw_reward := public.card_reward(draw_term_key, draw_rarity, draw_mutation, state_row.value_level);

    update public.player_state
    set coins = coins + draw_reward,
        packs_opened = packs_opened + 1,
        eggs_opened = eggs_opened + 1,
        auto_opens = auto_opens + 1,
        highest_tier_unlocked = greatest(highest_tier_unlocked, public.max_unlocked_tier(packs_opened + 1, tier_boost_level)),
        updated_at = now()
    where user_id = p_user_id
    returning * into state_row;

    insert into public.player_terms (user_id, term_key, copies, level, best_mutation)
    values (p_user_id, draw_term_key, 1, 1, public.normalize_mutation(draw_mutation))
    on conflict (user_id, term_key)
    do update
      set copies = public.player_terms.copies + 1,
          level = public.calc_level(public.player_terms.copies + 1),
          best_mutation = case
            when public.mutation_rank(excluded.best_mutation) > public.mutation_rank(public.player_terms.best_mutation)
              then excluded.best_mutation
            else public.player_terms.best_mutation
          end,
          updated_at = now();

    select * into term_row
    from public.player_terms
    where user_id = p_user_id and term_key = draw_term_key;

    max_tier := greatest(max_tier, draw_tier);
    last_draw := jsonb_build_object(
      'term_key', draw_term_key,
      'term_name', public.term_display_name(draw_term_key),
      'rarity', draw_rarity,
      'mutation', draw_mutation,
      'tier', draw_tier,
      'reward', draw_reward,
      'copies', term_row.copies,
      'level', term_row.level,
      'best_mutation', term_row.best_mutation,
      'source', 'auto',
      'debug_applied', false
    );
  end loop;

  update public.player_state
  set auto_open_progress = remainder,
      last_tick_at = now(),
      updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object(
    'draws_applied', whole_opens,
    'draw', last_draw,
    'draw_max_tier', max_tier
  );
end;
$$;

-- Backward-compatible idle function.
create or replace function public.apply_idle_income(p_user_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.apply_auto_progress(p_user_id);
  return 0;
end;
$$;

create or replace function public.player_snapshot(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with state_row as (
    select
      coins,
      passive_rate_bp,
      highest_tier_unlocked,
      eggs_opened,
      packs_opened,
      manual_opens,
      auto_opens,
      tier_boost_level,
      mutation_level,
      value_level,
      value_level as luck_level,
      auto_unlocked,
      auto_speed_level,
      auto_open_progress,
      last_tick_at,
      updated_at
    from public.player_state
    where user_id = p_user_id
  ), profile_row as (
    select
      display_name,
      nick_part_a,
      nick_part_b,
      nick_part_c,
      updated_at
    from public.player_profile
    where user_id = p_user_id
  ), terms_row as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'term_key', term_key,
          'copies', copies,
          'level', level,
          'best_mutation', best_mutation,
          'updated_at', updated_at
        )
        order by level desc, copies desc, term_key asc
      ),
      '[]'::jsonb
    ) as terms
    from public.player_terms
    where user_id = p_user_id
  )
  select jsonb_build_object(
    'state', (select row_to_json(state_row) from state_row),
    'profile', (select row_to_json(profile_row) from profile_row),
    'terms', (select terms from terms_row),
    'meta', jsonb_build_object(
      'server_now', now(),
      'debug_allowed', public.is_debug_allowed()
    )
  );
$$;

create or replace function public.bootstrap_player()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Authentication required';
  end if;

  perform public.ensure_player_initialized(uid);
  perform public.apply_auto_progress(uid);

  return public.player_snapshot(uid);
end;
$$;

create or replace function public.open_pack(p_source text default 'manual', p_debug_override jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  state_row public.player_state;
  term_row public.player_terms;
  draw_tier int;
  draw_rarity text;
  draw_mutation text;
  chosen_term text;
  draw_reward bigint;
  debug_override_allowed boolean;
  debug_applied boolean := false;
  debug_next_reward jsonb;
  source_kind text;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Authentication required';
  end if;

  source_kind := lower(coalesce(p_source, 'manual'));
  if source_kind not in ('manual', 'auto') then
    raise exception 'Invalid source: %', source_kind;
  end if;

  perform public.ensure_player_initialized(uid);
  perform public.apply_auto_progress(uid);

  select * into state_row
  from public.player_state
  where user_id = uid
  for update;

  debug_override_allowed := public.is_debug_allowed();

  if p_debug_override is not null then
    if not debug_override_allowed then
      raise exception 'Debug override not allowed for this account';
    end if;

    chosen_term := nullif(trim(coalesce(p_debug_override ->> 'term_key', '')), '');
    draw_rarity := nullif(trim(lower(coalesce(p_debug_override ->> 'rarity', ''))), '');
    draw_mutation := nullif(trim(lower(coalesce(p_debug_override ->> 'mutation', ''))), '');
    draw_tier := nullif((p_debug_override ->> 'tier'), '')::int;
    debug_applied := true;
  else
    select pds.next_reward into debug_next_reward
    from public.player_debug_state pds
    where user_id = uid
    for update;

    if debug_next_reward is not null and debug_override_allowed then
      chosen_term := nullif(trim(coalesce(debug_next_reward ->> 'term_key', '')), '');
      draw_rarity := nullif(trim(lower(coalesce(debug_next_reward ->> 'rarity', ''))), '');
      draw_mutation := nullif(trim(lower(coalesce(debug_next_reward ->> 'mutation', ''))), '');
      draw_tier := nullif((debug_next_reward ->> 'tier'), '')::int;
      update public.player_debug_state set next_reward = null where user_id = uid;
      debug_applied := true;
    end if;
  end if;

  if draw_tier is not null and (draw_tier < 1 or draw_tier > 6) then
    raise exception 'Invalid draw tier';
  end if;

  if chosen_term is not null and not (chosen_term = any(public.allowed_term_keys())) then
    raise exception 'Unknown term key: %', chosen_term;
  end if;

  if chosen_term is not null and draw_tier is null then
    select tc.tier into draw_tier
    from public.term_catalog tc
    where tc.term_key = chosen_term;
  end if;

  draw_tier := coalesce(draw_tier, public.pick_effective_tier(state_row.packs_opened, state_row.tier_boost_level));

  if draw_rarity is null then
    if chosen_term is not null then
      draw_rarity := public.term_rarity(chosen_term);
    else
      draw_rarity := public.roll_rarity(draw_tier, state_row.value_level);
    end if;
  end if;

  if draw_rarity not in ('common', 'rare', 'legendary') then
    raise exception 'Invalid rarity: %', draw_rarity;
  end if;

  draw_mutation := coalesce(draw_mutation, public.roll_mutation(state_row.mutation_level));
  draw_mutation := public.normalize_mutation(draw_mutation);

  if chosen_term is null then
    chosen_term := public.random_term_by_pool(draw_tier, draw_rarity);
  end if;

  if chosen_term is null then
    raise exception 'Unable to resolve draw term';
  end if;

  draw_reward := public.card_reward(chosen_term, draw_rarity, draw_mutation, state_row.value_level);

  update public.player_state
  set coins = coins + draw_reward,
      packs_opened = packs_opened + 1,
      eggs_opened = eggs_opened + 1,
      manual_opens = manual_opens + case when source_kind = 'manual' then 1 else 0 end,
      auto_opens = auto_opens + case when source_kind = 'auto' then 1 else 0 end,
      highest_tier_unlocked = greatest(highest_tier_unlocked, public.max_unlocked_tier(packs_opened + 1, tier_boost_level)),
      updated_at = now()
  where user_id = uid;

  insert into public.player_terms (user_id, term_key, copies, level, best_mutation)
  values (uid, chosen_term, 1, 1, draw_mutation)
  on conflict (user_id, term_key)
  do update
    set copies = public.player_terms.copies + 1,
        level = public.calc_level(public.player_terms.copies + 1),
        best_mutation = case
          when public.mutation_rank(excluded.best_mutation) > public.mutation_rank(public.player_terms.best_mutation)
            then excluded.best_mutation
          else public.player_terms.best_mutation
        end,
        updated_at = now();

  select * into term_row
  from public.player_terms
  where user_id = uid and term_key = chosen_term;

  return jsonb_build_object(
    'snapshot', public.player_snapshot(uid),
    'draw', jsonb_build_object(
      'term_key', chosen_term,
      'term_name', public.term_display_name(chosen_term),
      'rarity', draw_rarity,
      'mutation', draw_mutation,
      'tier', draw_tier,
      'reward', draw_reward,
      'copies', term_row.copies,
      'level', term_row.level,
      'best_mutation', term_row.best_mutation,
      'source', source_kind,
      'debug_applied', debug_applied
    )
  );
end;
$$;

create or replace function public.buy_upgrade(p_upgrade_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  state_row public.player_state;
  key_name text;
  cap int;
  cost bigint;
  current_level int;
  next_level int;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Authentication required';
  end if;

  key_name := lower(coalesce(p_upgrade_key, ''));
  if key_name = '' then
    raise exception 'Missing upgrade key';
  end if;

  if key_name in ('luck_engine', 'value_engine') then
    key_name := 'value_upgrade';
  elsif key_name = 'mutation_lab' then
    key_name := 'mutation_upgrade';
  end if;

  perform public.ensure_player_initialized(uid);
  perform public.apply_auto_progress(uid);

  select * into state_row
  from public.player_state
  where user_id = uid
  for update;

  cap := public.upgrade_cap(key_name);
  if cap <= 0 then
    raise exception 'Unsupported upgrade key: %', key_name;
  end if;

  if key_name = 'auto_unlock' then
    if state_row.auto_unlocked then
      raise exception 'Upgrade is already maxed';
    end if;

    cost := public.upgrade_cost(key_name, 0, state_row.auto_unlocked);
    if state_row.coins < cost then
      raise exception 'Not enough coins';
    end if;

    update public.player_state
    set coins = coins - cost,
        auto_unlocked = true,
        highest_tier_unlocked = public.max_unlocked_tier(packs_opened, tier_boost_level),
        updated_at = now()
    where user_id = uid;

    next_level := 1;

  elsif key_name = 'auto_speed' then
    if not state_row.auto_unlocked then
      raise exception 'Unlock auto opener first';
    end if;

    current_level := greatest(0, coalesce(state_row.auto_speed_level, 0));
    if current_level >= cap then
      raise exception 'Upgrade is already maxed';
    end if;

    cost := public.upgrade_cost(key_name, current_level, state_row.auto_unlocked);
    if state_row.coins < cost then
      raise exception 'Not enough coins';
    end if;

    update public.player_state
    set coins = coins - cost,
        auto_speed_level = auto_speed_level + 1,
        updated_at = now()
    where user_id = uid;

    next_level := current_level + 1;

  elsif key_name = 'tier_boost' then
    current_level := greatest(0, coalesce(state_row.tier_boost_level, 0));
    if current_level >= cap then
      raise exception 'Upgrade is already maxed';
    end if;

    cost := public.upgrade_cost(key_name, current_level, state_row.auto_unlocked);
    if state_row.coins < cost then
      raise exception 'Not enough coins';
    end if;

    update public.player_state
    set coins = coins - cost,
        tier_boost_level = tier_boost_level + 1,
        highest_tier_unlocked = public.max_unlocked_tier(packs_opened, tier_boost_level + 1),
        updated_at = now()
    where user_id = uid;

    next_level := current_level + 1;

  elsif key_name = 'mutation_upgrade' then
    current_level := greatest(0, coalesce(state_row.mutation_level, 0));
    if current_level >= cap then
      raise exception 'Upgrade is already maxed';
    end if;

    cost := public.upgrade_cost(key_name, current_level, state_row.auto_unlocked);
    if state_row.coins < cost then
      raise exception 'Not enough coins';
    end if;

    update public.player_state
    set coins = coins - cost,
        mutation_level = mutation_level + 1,
        updated_at = now()
    where user_id = uid;

    next_level := current_level + 1;

  elsif key_name = 'value_upgrade' then
    current_level := greatest(0, coalesce(state_row.value_level, 0));
    if current_level >= cap then
      raise exception 'Upgrade is already maxed';
    end if;

    cost := public.upgrade_cost(key_name, current_level, state_row.auto_unlocked);
    if state_row.coins < cost then
      raise exception 'Not enough coins';
    end if;

    update public.player_state
    set coins = coins - cost,
        value_level = value_level + 1,
        updated_at = now()
    where user_id = uid;

    next_level := current_level + 1;

  else
    raise exception 'Unsupported upgrade key: %', key_name;
  end if;

  return jsonb_build_object(
    'snapshot', public.player_snapshot(uid),
    'purchase', jsonb_build_object(
      'upgrade_key', key_name,
      'spent', cost,
      'level', next_level
    )
  );
end;
$$;

-- Backward-compatible wrapper.
create or replace function public.open_egg(p_egg_tier int, p_debug_override jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  override_payload jsonb;
begin
  if p_egg_tier < 1 or p_egg_tier > 6 then
    raise exception 'Invalid egg tier';
  end if;

  override_payload := coalesce(p_debug_override, '{}'::jsonb) || jsonb_build_object('tier', p_egg_tier);
  return public.open_pack('manual', override_payload);
end;
$$;

-- Backward-compatible wrapper.
create or replace function public.upgrade_luck()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.buy_upgrade('value_upgrade');
end;
$$;

create or replace function public.update_nickname(p_a text, p_b text, p_c text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Authentication required';
  end if;

  perform public.ensure_player_initialized(uid);

  if not (p_a = any(public.allowed_nick_part_a())) then
    raise exception 'Invalid nickname part A';
  end if;

  if not (p_b = any(public.allowed_nick_part_b())) then
    raise exception 'Invalid nickname part B';
  end if;

  if not (p_c = any(public.allowed_nick_part_c())) then
    raise exception 'Invalid nickname part C';
  end if;

  update public.player_profile
  set nick_part_a = p_a,
      nick_part_b = p_b,
      nick_part_c = p_c,
      display_name = concat(p_a, ' ', p_b, ' ', p_c),
      updated_at = now()
  where user_id = uid;

  return jsonb_build_object('snapshot', public.player_snapshot(uid));
end;
$$;

create or replace function public.reset_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  part_a text;
  part_b text;
  part_c text;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Authentication required';
  end if;

  perform public.ensure_player_initialized(uid);

  delete from public.player_terms where user_id = uid;

  update public.player_state
  set coins = 100,
      luck_level = 0,
      passive_rate_bp = 0,
      highest_tier_unlocked = 1,
      eggs_opened = 0,
      packs_opened = 0,
      manual_opens = 0,
      auto_opens = 0,
      tier_boost_level = 0,
      mutation_level = 0,
      value_level = 0,
      auto_unlocked = false,
      auto_speed_level = 0,
      auto_open_progress = 0,
      last_tick_at = now(),
      updated_at = now()
  where user_id = uid;

  update public.player_debug_state
  set next_reward = null,
      updated_at = now()
  where user_id = uid;

  part_a := public.random_array_item(public.allowed_nick_part_a());
  part_b := public.random_array_item(public.allowed_nick_part_b());
  part_c := public.random_array_item(public.allowed_nick_part_c());

  update public.player_profile
  set nick_part_a = part_a,
      nick_part_b = part_b,
      nick_part_c = part_c,
      display_name = concat(part_a, ' ', part_b, ' ', part_c),
      updated_at = now()
  where user_id = uid;

  update public.player_state
  set highest_tier_unlocked = public.max_unlocked_tier(packs_opened, tier_boost_level),
      eggs_opened = packs_opened
  where user_id = uid;

  return jsonb_build_object(
    'snapshot', public.player_snapshot(uid),
    'debug_action', 'reset_account'
  );
end;
$$;

create or replace function public.debug_apply_action(p_action jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  action_type text;
  amount bigint;
  target_level int;
  term_key text;
  copies_to_add int;
  mutation_value text;
  key_name text;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_debug_allowed() then
    raise exception 'Debug actions are not allowed for this account';
  end if;

  action_type := lower(coalesce(p_action ->> 'type', ''));
  if action_type = '' then
    raise exception 'Missing debug action type';
  end if;

  perform public.ensure_player_initialized(uid);
  perform public.apply_auto_progress(uid);

  if action_type = 'add_coins' then
    amount := greatest(0, coalesce((p_action ->> 'amount')::bigint, 0));
    update public.player_state
    set coins = coins + amount,
        updated_at = now()
    where user_id = uid;

  elsif action_type = 'set_coins' then
    amount := greatest(0, coalesce((p_action ->> 'amount')::bigint, 0));
    update public.player_state
    set coins = amount,
        updated_at = now()
    where user_id = uid;

  elsif action_type = 'set_luck_level' then
    target_level := greatest(0, least(25, coalesce((p_action ->> 'level')::int, 0)));
    update public.player_state
    set value_level = target_level,
        updated_at = now()
    where user_id = uid;

  elsif action_type = 'set_mutation_level' then
    target_level := greatest(0, least(25, coalesce((p_action ->> 'level')::int, 0)));
    update public.player_state
    set mutation_level = target_level,
        updated_at = now()
    where user_id = uid;

  elsif action_type = 'set_tier_boost_level' then
    target_level := greatest(0, least(20, coalesce((p_action ->> 'level')::int, 0)));
    update public.player_state
    set tier_boost_level = target_level,
        highest_tier_unlocked = public.max_unlocked_tier(packs_opened, target_level),
        updated_at = now()
    where user_id = uid;

  elsif action_type = 'set_auto_speed_level' then
    target_level := greatest(0, least(4, coalesce((p_action ->> 'level')::int, 0)));
    update public.player_state
    set auto_speed_level = target_level,
        updated_at = now()
    where user_id = uid;

  elsif action_type = 'set_value_level' then
    target_level := greatest(0, least(25, coalesce((p_action ->> 'level')::int, 0)));
    update public.player_state
    set value_level = target_level,
        updated_at = now()
    where user_id = uid;

  elsif action_type = 'set_auto_unlocked' then
    update public.player_state
    set auto_unlocked = coalesce((p_action ->> 'enabled')::boolean, false),
        updated_at = now()
    where user_id = uid;

  elsif action_type = 'grant_term' then
    term_key := coalesce(p_action ->> 'term_key', '');
    if not (term_key = any(public.allowed_term_keys())) then
      raise exception 'Unknown term key: %', term_key;
    end if;

    copies_to_add := greatest(1, coalesce((p_action ->> 'copies')::int, 1));
    mutation_value := public.normalize_mutation(coalesce(p_action ->> 'best_mutation', p_action ->> 'mutation', 'none'));

    insert into public.player_terms (user_id, term_key, copies, level, best_mutation)
    values (uid, term_key, copies_to_add, public.calc_level(copies_to_add), mutation_value)
    on conflict (user_id, term_key)
    do update
      set copies = public.player_terms.copies + copies_to_add,
          level = public.calc_level(public.player_terms.copies + copies_to_add),
          best_mutation = case
            when public.mutation_rank(excluded.best_mutation) > public.mutation_rank(public.player_terms.best_mutation)
              then excluded.best_mutation
            else public.player_terms.best_mutation
          end,
          updated_at = now();

  elsif action_type = 'set_next_reward' then
    update public.player_debug_state
    set next_reward = p_action - 'type',
        updated_at = now()
    where user_id = uid;

  elsif action_type = 'buy_upgrade' then
    key_name := lower(coalesce(p_action ->> 'upgrade_key', ''));
    if key_name = '' then
      raise exception 'Missing upgrade_key';
    end if;
    perform public.buy_upgrade(key_name);

  elsif action_type = 'reset_account' then
    return public.reset_account();

  else
    raise exception 'Unsupported debug action type: %', action_type;
  end if;

  update public.player_state
  set highest_tier_unlocked = public.max_unlocked_tier(packs_opened, tier_boost_level),
      eggs_opened = packs_opened
  where user_id = uid;

  return jsonb_build_object(
    'snapshot', public.player_snapshot(uid),
    'debug_action', action_type
  );
end;
$$;

drop view if exists public.leaderboard_v1;
create view public.leaderboard_v1 as
with signup_order as (
  select
    pp.user_id,
    row_number() over (
      order by pp.created_at asc, pp.user_id asc
    )::int as player_number
  from public.player_profile pp
),
best_card as (
  select
    pt.user_id,
    pt.term_key as best_term_key,
    tc.display_name as best_term_name,
    tc.tier as best_term_tier,
    tc.rarity as best_term_rarity,
    public.mutation_rank(pt.best_mutation) as best_mutation_rank,
    pt.best_mutation as best_term_mutation,
    pt.copies as best_term_copies,
    row_number() over (
      partition by pt.user_id
      order by
        tc.tier desc,
        case tc.rarity
          when 'legendary' then 3
          when 'rare' then 2
          else 1
        end desc,
        public.mutation_rank(pt.best_mutation) desc,
        pt.copies desc,
        pt.term_key asc
    ) as row_num
  from public.player_terms pt
  join public.term_catalog tc on tc.term_key = pt.term_key
)
select
  row_number() over (
    order by
      coalesce(bc.best_term_tier, 0) desc,
      case coalesce(bc.best_term_rarity, 'common')
        when 'legendary' then 3
        when 'rare' then 2
        else 1
      end desc,
      coalesce(bc.best_mutation_rank, 0) desc,
      coalesce(bc.best_term_copies, 0) desc,
      ps.coins desc,
      so.player_number asc
  )::int as rank,
  count(*) over ()::int as total_players,
  ps.user_id,
  pp.display_name,
  ps.coins::bigint as score,
  ps.value_level,
  ps.highest_tier_unlocked,
  ps.updated_at,
  so.player_number,
  bc.best_term_key,
  bc.best_term_name,
  coalesce(bc.best_term_tier, 0)::int as best_term_tier,
  coalesce(bc.best_term_rarity, 'common') as best_term_rarity,
  coalesce(bc.best_term_mutation, 'none') as best_term_mutation,
  coalesce(bc.best_term_copies, 0)::int as best_term_copies
from public.player_state ps
join public.player_profile pp on pp.user_id = ps.user_id
join signup_order so on so.user_id = ps.user_id
left join best_card bc on bc.user_id = ps.user_id and bc.row_num = 1;

create or replace function public.get_leaderboard(p_limit int default 50)
returns table (
  rank int,
  total_players int,
  user_id uuid,
  display_name text,
  score bigint,
  value_level int,
  highest_tier_unlocked int,
  updated_at timestamptz,
  player_number int,
  best_term_key text,
  best_term_name text,
  best_term_tier int,
  best_term_rarity text,
  best_term_mutation text,
  best_term_copies int,
  viewer_player_number int,
  is_you boolean
)
language sql
security definer
set search_path = public
as $$
  with viewer_meta as (
    select
      so.player_number as viewer_player_number
    from (
      select
        pp.user_id,
        row_number() over (
          order by pp.created_at asc, pp.user_id asc
        )::int as player_number
      from public.player_profile pp
    ) so
    where so.user_id = auth.uid()
  )
  select
    l.rank,
    l.total_players,
    l.user_id,
    l.display_name,
    l.score,
    l.value_level,
    l.highest_tier_unlocked,
    l.updated_at,
    l.player_number,
    l.best_term_key,
    l.best_term_name,
    l.best_term_tier,
    l.best_term_rarity,
    l.best_term_mutation,
    l.best_term_copies,
    (select vm.viewer_player_number from viewer_meta vm),
    (l.user_id = auth.uid()) as is_you
  from public.leaderboard_v1 l
  order by l.rank asc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

grant execute on function public.bootstrap_player() to authenticated;
grant execute on function public.open_pack(text, jsonb) to authenticated;
grant execute on function public.buy_upgrade(text) to authenticated;
grant execute on function public.open_egg(int, jsonb) to authenticated;
grant execute on function public.upgrade_luck() to authenticated;
grant execute on function public.update_nickname(text, text, text) to authenticated;
grant execute on function public.reset_account() to authenticated;
grant execute on function public.get_leaderboard(int) to authenticated;
grant execute on function public.debug_apply_action(jsonb) to authenticated;
