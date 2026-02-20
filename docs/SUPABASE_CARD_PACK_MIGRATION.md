# Supabase Card-Pack Migration Checklist

This checklist captures the server-authority migration once local balancing is finalized.

## Goal
Add RPC parity for the local pack economy while keeping backward compatibility with existing egg-era clients.

## Required schema/state changes
1. Add new columns to `player_state`:
- `packs_opened int not null default 0`
- `manual_opens int not null default 0`
- `auto_opens int not null default 0`
- `auto_unlocked boolean not null default false`
- `auto_speed_level int not null default 0`
- `tier_boost_level int not null default 0`
- `mutation_level int not null default 0`
- `value_level int not null default 0`
- `auto_open_progress numeric not null default 0`

2. Backfill/migration:
- `packs_opened = eggs_opened`
- keep `eggs_opened` temporarily for compatibility.

## Required SQL functions
1. Add `open_pack(p_source text default 'manual', p_debug_override jsonb default null)`:
- authenticate user.
- apply idle auto-open progress.
- perform one draw when source is manual.
- return `{ snapshot, draw }`.

2. Add `buy_upgrade(p_upgrade_key text)`:
- authenticate user.
- apply idle auto-open progress.
- validate upgrade key/cap/cost.
- deduct coins and apply level/unlock.
- return `{ snapshot, purchase }`.

3. Keep compatibility wrappers:
- `open_egg(...)` calls `open_pack('manual', ...)` with tier override mapping.
- `upgrade_luck()` delegates to `buy_upgrade('luck_engine')`.

## RPC grants
- grant execute on `open_pack(...)` to `authenticated`.
- grant execute on `buy_upgrade(...)` to `authenticated`.
- keep existing grants for legacy wrappers during migration.

## Parity validation
1. Build deterministic parity fixtures from local engine.
2. Replay fixtures against SQL functions and compare:
- tier, rarity, mutation roll distribution.
- upgrade costs and cap behavior.
- snapshot shape and counters.
3. Confirm first Tier-6-hit timing remains in 30-50 minute target band.

## Rollout
1. Deploy SQL changes first.
2. Enable `VITE_LOCAL_ECONOMY=0` in staging.
3. Validate end-to-end gameplay.
4. Keep wrapper RPCs for one release cycle.
5. Remove legacy egg aliases after clients are updated.
