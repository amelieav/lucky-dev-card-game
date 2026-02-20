-- Lucky Agent Supabase schema + RPCs
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
  last_tick_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_terms (
  user_id uuid not null references auth.users(id) on delete cascade,
  term_key text not null,
  copies int not null default 0,
  level int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, term_key)
);

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
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  base_bp int not null check (base_bp >= 0)
);

insert into public.term_catalog (term_key, display_name, tier, rarity, base_bp)
values
  ('if_statement', 'If Statement', 1, 'common', 50),
  ('else_elif', 'Else / Elif', 1, 'common', 55),
  ('for_loop', 'For Loop', 1, 'common', 60),
  ('while_loop', 'While Loop', 1, 'common', 65),
  ('variables', 'Variables', 1, 'common', 70),
  ('constants', 'Constants', 1, 'rare', 75),
  ('data_types', 'Data Types', 1, 'rare', 80),
  ('operators', 'Operators', 1, 'rare', 85),
  ('functions', 'Functions', 1, 'epic', 90),
  ('return_values', 'Return Values', 1, 'epic', 95),

  ('arrays', 'Arrays', 2, 'common', 90),
  ('objects', 'Objects', 2, 'common', 97),
  ('maps', 'Maps', 2, 'common', 104),
  ('sets', 'Sets', 2, 'common', 111),
  ('string_methods', 'String Methods', 2, 'rare', 118),
  ('array_methods', 'Array Methods', 2, 'rare', 125),
  ('scope', 'Scope', 2, 'rare', 132),
  ('closures', 'Closures', 2, 'rare', 139),
  ('recursion', 'Recursion', 2, 'epic', 146),
  ('modules', 'Modules', 2, 'epic', 153),

  ('callbacks', 'Callbacks', 3, 'common', 140),
  ('promises', 'Promises', 3, 'common', 149),
  ('async_await', 'Async/Await', 3, 'common', 158),
  ('event_loop', 'Event Loop', 3, 'rare', 167),
  ('http_basics', 'HTTP Basics', 3, 'rare', 176),
  ('rest_apis', 'REST APIs', 3, 'rare', 185),
  ('api_contracts', 'API Contracts', 3, 'rare', 194),
  ('state_management', 'State Management', 3, 'epic', 203),
  ('caching_basics', 'Caching Basics', 3, 'epic', 212),
  ('error_handling', 'Error Handling', 3, 'legendary', 221),

  ('git_workflow', 'Git Workflow', 4, 'rare', 210),
  ('branching_strategy', 'Branching Strategy', 4, 'rare', 221),
  ('pull_requests', 'Pull Requests', 4, 'rare', 232),
  ('unit_testing', 'Unit Testing', 4, 'rare', 243),
  ('integration_testing', 'Integration Testing', 4, 'epic', 254),
  ('ci_pipelines', 'CI Pipelines', 4, 'epic', 265),
  ('cd_pipelines', 'CD Pipelines', 4, 'epic', 276),
  ('docker_basics', 'Docker Basics', 4, 'epic', 287),
  ('observability', 'Observability', 4, 'legendary', 298),
  ('performance_profiling', 'Performance Profiling', 4, 'legendary', 309),

  ('gradient_descent', 'Gradient Descent', 5, 'rare', 300),
  ('backpropagation', 'Backpropagation', 5, 'rare', 314),
  ('activation_functions', 'Activation Functions', 5, 'epic', 328),
  ('loss_functions', 'Loss Functions', 5, 'epic', 342),
  ('optimizers', 'Optimizers (SGD/Adam)', 5, 'epic', 356),
  ('regularization', 'Regularization', 5, 'epic', 370),
  ('cnns', 'CNNs', 5, 'epic', 384),
  ('rnns_lstms', 'RNNs/LSTMs', 5, 'legendary', 398),
  ('attention', 'Attention', 5, 'legendary', 412),
  ('transformers', 'Transformers', 5, 'legendary', 426),

  ('tool_calling', 'Tool Calling', 6, 'epic', 420),
  ('function_routing', 'Function Routing', 6, 'epic', 438),
  ('planner_executor_agents', 'Planner-Executor Agents', 6, 'epic', 456),
  ('multi_agent_coordination', 'Multi-Agent Coordination', 6, 'epic', 474),
  ('reflection_loops', 'Reflection Loops', 6, 'legendary', 492),
  ('agent_memory_architectures', 'Agent Memory Architectures', 6, 'legendary', 510),
  ('rag_pipelines', 'RAG Pipelines', 6, 'legendary', 528),
  ('agent_guardrails', 'Agent Guardrails', 6, 'legendary', 546),
  ('agent_evaluation_harnesses', 'Agent Evaluation Harnesses', 6, 'legendary', 564),
  ('autonomous_task_decomposition', 'Autonomous Task Decomposition', 6, 'legendary', 582)
on conflict (term_key) do update
set
  display_name = excluded.display_name,
  tier = excluded.tier,
  rarity = excluded.rarity,
  base_bp = excluded.base_bp;

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

create or replace function public.allowed_nick_part_a()
returns text[]
language sql
stable
as $$
  select array['Neon','Lucky','Calm','Rapid','Cloud','Steel','Pixel','Quiet'];
$$;

create or replace function public.allowed_nick_part_b()
returns text[]
language sql
stable
as $$
  select array['Loop','Vector','Kernel','Agent','Signal','Compiler','Tensor','Flux'];
$$;

create or replace function public.allowed_nick_part_c()
returns text[]
language sql
stable
as $$
  select array['Fox','Nova','Whale','Raven','Otter','Spark','Pilot','Orb'];
$$;

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
    (select tc.base_bp from public.term_catalog tc where tc.term_key = $1),
    0
  );
$$;

create or replace function public.luck_upgrade_cost(level int)
returns bigint
language sql
immutable
as $$
  select floor(80 + (level * 30) + (power(level, 2) * 18))::bigint;
$$;

create or replace function public.egg_cost(tier int)
returns bigint
language sql
immutable
as $$
  select case tier
    when 1 then 25
    when 2 then 120
    when 3 then 450
    when 4 then 1800
    when 5 then 6200
    when 6 then 22000
    else null
  end;
$$;

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

create or replace function public.pick_mixed_tier(total_eggs_opened int)
returns int
language plpgsql
volatile
as $$
declare
  highest int;
  roll numeric;
begin
  highest := public.max_unlocked_tier(total_eggs_opened);
  roll := random() * 100;

  if highest = 1 then
    return 1;
  elsif highest = 2 then
    if roll < 85 then return 1; end if;
    return 2;
  elsif highest = 3 then
    if roll < 70 then return 1; end if;
    if roll < 90 then return 2; end if;
    return 3;
  elsif highest = 4 then
    if roll < 58 then return 1; end if;
    if roll < 80 then return 2; end if;
    if roll < 93 then return 3; end if;
    return 4;
  elsif highest = 5 then
    if roll < 46 then return 1; end if;
    if roll < 68 then return 2; end if;
    if roll < 84 then return 3; end if;
    if roll < 94 then return 4; end if;
    return 5;
  else
    if roll < 38 then return 1; end if;
    if roll < 59 then return 2; end if;
    if roll < 75 then return 3; end if;
    if roll < 87 then return 4; end if;
    if roll < 95 then return 5; end if;
    return 6;
  end if;
end;
$$;

create or replace function public.calc_level(copies int)
returns int
language sql
immutable
as $$
  select greatest(1, floor(sqrt(greatest(copies, 1)::numeric))::int);
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
  total_bp int;
  user_luck int;
begin
  select coalesce(sum(public.term_base_bp(pt.term_key) * greatest(pt.level, 1)), 0)
  into total_bp
  from public.player_terms pt
  where pt.user_id = p_user_id;

  select luck_level into user_luck
  from public.player_state
  where user_id = p_user_id;

  total_bp := coalesce(total_bp, 0) + (coalesce(user_luck, 0) * 35);

  update public.player_state
  set passive_rate_bp = total_bp,
      updated_at = now()
  where user_id = p_user_id;

  return total_bp;
end;
$$;

create or replace function public.apply_idle_income(p_user_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  state_row public.player_state;
  elapsed_seconds int;
  gained bigint;
begin
  select * into state_row
  from public.player_state
  where user_id = p_user_id
  for update;

  elapsed_seconds := least(43200, greatest(0, extract(epoch from now() - state_row.last_tick_at)::int));
  gained := floor((elapsed_seconds * state_row.passive_rate_bp) / 10000.0)::bigint;

  update public.player_state
  set coins = coins + gained,
      last_tick_at = now(),
      updated_at = now()
  where user_id = p_user_id;

  return gained;
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
      luck_level,
      passive_rate_bp,
      highest_tier_unlocked,
      eggs_opened,
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

create or replace function public.roll_rarity(p_egg_tier int, p_luck_level int)
returns text
language plpgsql
volatile
as $$
declare
  common_w int;
  rare_w int;
  epic_w int;
  legendary_w int;
  luck_bonus int;
  roll numeric;
  total_w int;
begin
  case p_egg_tier
    when 1 then
      common_w := 76; rare_w := 20; epic_w := 4; legendary_w := 0;
    when 2 then
      common_w := 58; rare_w := 30; epic_w := 11; legendary_w := 1;
    when 3 then
      common_w := 46; rare_w := 33; epic_w := 16; legendary_w := 5;
    when 4 then
      common_w := 24; rare_w := 42; epic_w := 24; legendary_w := 10;
    when 5 then
      common_w := 8; rare_w := 30; epic_w := 42; legendary_w := 20;
    else
      common_w := 0; rare_w := 8; epic_w := 42; legendary_w := 50;
  end case;

  luck_bonus := least(25, greatest(0, p_luck_level));
  common_w := greatest(5, common_w - luck_bonus);
  rare_w := rare_w + floor(luck_bonus * 0.5);
  epic_w := epic_w + floor(luck_bonus * 0.3);
  legendary_w := legendary_w + (luck_bonus - floor(luck_bonus * 0.5) - floor(luck_bonus * 0.3));

  total_w := common_w + rare_w + epic_w + legendary_w;
  roll := random() * total_w;

  if roll < common_w then return 'common'; end if;
  if roll < (common_w + rare_w) then return 'rare'; end if;
  if roll < (common_w + rare_w + epic_w) then return 'epic'; end if;
  return 'legendary';
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
    and tc.rarity = p_rarity
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
  perform public.recompute_passive_rate_bp(uid);

  return public.player_snapshot(uid);
end;
$$;

create or replace function public.open_egg(p_egg_tier int, p_debug_override jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  state_row public.player_state;
  term_row public.player_terms;
  current_rarity text;
  chosen_term text;
  draw_tier int;
  cost bigint;
  debug_override_allowed boolean;
  debug_applied boolean := false;
  debug_next_reward jsonb;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Authentication required';
  end if;

  if p_egg_tier < 1 or p_egg_tier > 6 then
    raise exception 'Invalid egg tier';
  end if;

  perform public.ensure_player_initialized(uid);
  perform public.apply_idle_income(uid);

  select * into state_row
  from public.player_state
  where user_id = uid
  for update;

  update public.player_state
  set highest_tier_unlocked = greatest(highest_tier_unlocked, public.max_unlocked_tier(state_row.eggs_opened))
  where user_id = uid;

  select * into state_row
  from public.player_state
  where user_id = uid
  for update;

  if p_egg_tier > state_row.highest_tier_unlocked then
    raise exception 'Tier % is locked', p_egg_tier;
  end if;

  cost := public.egg_cost(p_egg_tier);
  if state_row.coins < cost then
    raise exception 'Not enough coins';
  end if;

  debug_override_allowed := public.is_debug_allowed();

  if p_debug_override is not null then
    if not debug_override_allowed then
      raise exception 'Debug override not allowed for this account';
    end if;

    chosen_term := nullif(trim(coalesce(p_debug_override ->> 'term_key', '')), '');
    current_rarity := nullif(trim(coalesce(p_debug_override ->> 'rarity', '')), '');
    draw_tier := coalesce((p_debug_override ->> 'tier')::int, p_egg_tier);
    debug_applied := true;
  else
    select pds.next_reward into debug_next_reward
    from public.player_debug_state pds
    where user_id = uid
    for update;

    if debug_next_reward is not null and debug_override_allowed then
      chosen_term := nullif(trim(coalesce(debug_next_reward ->> 'term_key', '')), '');
      current_rarity := nullif(trim(coalesce(debug_next_reward ->> 'rarity', '')), '');
      draw_tier := coalesce((debug_next_reward ->> 'tier')::int, p_egg_tier);
      update public.player_debug_state set next_reward = null where user_id = uid;
      debug_applied := true;
    elsif p_egg_tier = 1 then
      draw_tier := public.pick_mixed_tier(state_row.eggs_opened);
    end if;
  end if;

  draw_tier := coalesce(draw_tier, p_egg_tier);

  if chosen_term is not null and not (chosen_term = any(public.allowed_term_keys())) then
    raise exception 'Unknown term key: %', chosen_term;
  end if;

  if current_rarity is null then
    if chosen_term is not null then
      current_rarity := public.term_rarity(chosen_term);
    else
      current_rarity := public.roll_rarity(p_egg_tier, state_row.luck_level);
    end if;
  end if;

  if chosen_term is null then
    chosen_term := public.random_term_by_pool(draw_tier, current_rarity);
  end if;

  if chosen_term is null then
    raise exception 'Unable to resolve draw term';
  end if;

  update public.player_state
  set coins = coins - cost,
      eggs_opened = eggs_opened + 1,
      highest_tier_unlocked = greatest(highest_tier_unlocked, public.max_unlocked_tier(eggs_opened + 1)),
      updated_at = now()
  where user_id = uid;

  insert into public.player_terms (user_id, term_key, copies, level)
  values (uid, chosen_term, 1, 1)
  on conflict (user_id, term_key)
  do update
    set copies = public.player_terms.copies + 1,
        level = public.calc_level(public.player_terms.copies + 1),
        updated_at = now();

  select * into term_row
  from public.player_terms
  where user_id = uid and term_key = chosen_term;

  perform public.recompute_passive_rate_bp(uid);

  return jsonb_build_object(
    'snapshot', public.player_snapshot(uid),
    'draw', jsonb_build_object(
      'term_key', chosen_term,
      'term_name', public.term_display_name(chosen_term),
      'rarity', current_rarity,
      'tier', draw_tier,
      'copies', term_row.copies,
      'level', term_row.level,
      'debug_applied', debug_applied
    )
  );
end;
$$;

create or replace function public.upgrade_luck()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  state_row public.player_state;
  upgrade_cost bigint;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Authentication required';
  end if;

  perform public.ensure_player_initialized(uid);
  perform public.apply_idle_income(uid);

  select * into state_row
  from public.player_state
  where user_id = uid
  for update;

  upgrade_cost := public.luck_upgrade_cost(state_row.luck_level);

  if state_row.coins < upgrade_cost then
    raise exception 'Not enough coins to upgrade luck';
  end if;

  update public.player_state
  set coins = coins - upgrade_cost,
      luck_level = luck_level + 1,
      updated_at = now()
  where user_id = uid;

  perform public.recompute_passive_rate_bp(uid);

  return jsonb_build_object('snapshot', public.player_snapshot(uid));
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

create or replace function public.debug_apply_action(p_action jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  state_row public.player_state;
  action_type text;
  amount bigint;
  target_level int;
  term_key text;
  copies_to_add int;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_debug_allowed() then
    raise exception 'Debug actions are not allowed for this account';
  end if;

  action_type := coalesce(p_action ->> 'type', '');
  if action_type = '' then
    raise exception 'Missing debug action type';
  end if;

  perform public.ensure_player_initialized(uid);
  perform public.apply_idle_income(uid);

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
    target_level := greatest(0, coalesce((p_action ->> 'level')::int, 0));
    update public.player_state
    set luck_level = target_level,
        updated_at = now()
    where user_id = uid;

  elsif action_type = 'grant_term' then
    term_key := coalesce(p_action ->> 'term_key', '');
    if not (term_key = any(public.allowed_term_keys())) then
      raise exception 'Unknown term key: %', term_key;
    end if;

    copies_to_add := greatest(1, coalesce((p_action ->> 'copies')::int, 1));

    insert into public.player_terms (user_id, term_key, copies, level)
    values (uid, term_key, copies_to_add, public.calc_level(copies_to_add))
    on conflict (user_id, term_key)
    do update
      set copies = public.player_terms.copies + copies_to_add,
          level = public.calc_level(public.player_terms.copies + copies_to_add),
          updated_at = now();

  elsif action_type = 'set_next_reward' then
    update public.player_debug_state
    set next_reward = p_action - 'type',
        updated_at = now()
    where user_id = uid;

  elsif action_type = 'reset_account' then
    delete from public.player_terms where user_id = uid;

    update public.player_state
    set coins = 100,
        luck_level = 0,
        passive_rate_bp = 0,
        highest_tier_unlocked = 1,
        eggs_opened = 0,
        last_tick_at = now(),
        updated_at = now()
    where user_id = uid;

    update public.player_debug_state
    set next_reward = null,
        updated_at = now()
    where user_id = uid;
  else
    raise exception 'Unsupported debug action type: %', action_type;
  end if;

  select * into state_row from public.player_state where user_id = uid;

  if action_type in ('set_luck_level', 'grant_term', 'reset_account') then
    perform public.recompute_passive_rate_bp(uid);
  end if;

  update public.player_state
  set highest_tier_unlocked = greatest(highest_tier_unlocked, public.max_unlocked_tier(eggs_opened))
  where user_id = uid;

  return jsonb_build_object(
    'snapshot', public.player_snapshot(uid),
    'debug_action', action_type
  );
end;
$$;

drop view if exists public.leaderboard_v1;
create view public.leaderboard_v1 as
select
  row_number() over (
    order by (ps.coins + floor((ps.passive_rate_bp / 10000.0) * 3600)) desc,
             ps.updated_at asc
  )::int as rank,
  pp.display_name,
  (ps.coins + floor((ps.passive_rate_bp / 10000.0) * 3600))::bigint as score,
  ps.luck_level,
  ps.highest_tier_unlocked,
  ps.updated_at
from public.player_state ps
join public.player_profile pp on pp.user_id = ps.user_id;

create or replace function public.get_leaderboard(p_limit int default 50)
returns table (
  rank int,
  display_name text,
  score bigint,
  luck_level int,
  highest_tier_unlocked int,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    l.rank,
    l.display_name,
    l.score,
    l.luck_level,
    l.highest_tier_unlocked,
    l.updated_at
  from public.leaderboard_v1 l
  order by l.rank asc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

grant execute on function public.bootstrap_player() to authenticated;
grant execute on function public.open_egg(int, jsonb) to authenticated;
grant execute on function public.upgrade_luck() to authenticated;
grant execute on function public.update_nickname(text, text, text) to authenticated;
grant execute on function public.get_leaderboard(int) to authenticated;
grant execute on function public.debug_apply_action(jsonb) to authenticated;
