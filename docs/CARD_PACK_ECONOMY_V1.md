# Lucky Agent Card-Pack Economy Spec v1 (40-Min Tier 6 Target)

## Summary
- Rebrand eggs to card packs and keep the existing coding-concept card pool.
- Use local-first authoritative simulation now, with an interface-compatible server RPC path later.
- Opening is free (no per-open coin cost), rewards come from card draws, and spending happens in shop upgrades.
- Target progression: fresh account reaches first Tier 6 eligibility and first Tier 6 hit in ~40 minutes median, with an acceptable band of 30-50 minutes.

## Success Criteria
- Tier 6 first hit timing (simulation, 500 seeded runs): p25 >= 30 min, median 35-45 min, p75 <= 50 min.
- First 20 minutes feel active-first: manual opens contribute ~60% of total opens.
- Rates are transparent in UI: player can see exact tier, rarity, and mutation probabilities at current upgrade levels.
- No deadlock states: player can always continue opening and earning.

## Pack and Card Structure
- Tier 1: CSS Pack
- Tier 2: HTML Pack
- Tier 3: Python Pack
- Tier 4: Java Pack
- Tier 5: C# Pack
- Tier 6: C++ Pack
- Keep existing `term_catalog` concept cards for now.
- Card payout formula:
  - `base_value = floor(term.base_bp * 0.06)`
  - `reward = floor(max(1, base_value * rarity_mult * mutation_mult * value_mult))`
- Rarity multipliers:
  - common: 1.00
  - rare: 1.50
  - epic: 2.30
  - legendary: 3.60
- Mutation multipliers:
  - none: 1.00
  - foil: 1.18
  - holo: 1.45
  - glitched: 1.90
  - prismatic: 2.80
- Value multiplier from shop:
  - `value_mult = 1 + (0.07 * value_level)`

## Opening Model
- Manual open is always available and free.
- Manual cadence: one open every 1.2s.
- Auto opening unlocks via shop and runs continuously.
- Auto cadence formula:
  - `auto_opens_per_sec = 0.25 + (0.06 * auto_speed_level)`
- Total opens are split into manual and auto for telemetry and balance tuning.

## Tier Unlock and Tier Chance Model
### Tier unlock gates
| Tier | Requirement |
|---|---|
| 2 | `tier_boost_level >= 1` and `packs_opened >= 40` |
| 3 | `tier_boost_level >= 4` and `packs_opened >= 200` |
| 4 | `tier_boost_level >= 7` and `packs_opened >= 550` |
| 5 | `tier_boost_level >= 10` and `packs_opened >= 1100` |
| 6 | `tier_boost_level >= 13` and `packs_opened >= 1900` |

### Base tier distribution by tier boost level (before lock redistribution)
| Boost Lvl | T1 | T2 | T3 | T4 | T5 | T6 |
|---|---:|---:|---:|---:|---:|---:|
| 0 | 100 | 0 | 0 | 0 | 0 | 0 |
| 1-3 | 90 | 10 | 0 | 0 | 0 | 0 |
| 4-6 | 78 | 14 | 8 | 0 | 0 | 0 |
| 7-9 | 66 | 16 | 11 | 7 | 0 | 0 |
| 10-12 | 53 | 18 | 14 | 10 | 5 | 0 |
| 13-20 | 41 | 17 | 16 | 13 | 8 | 5 |

- Extra at boost levels 14-20: each level shifts 0.6% from T1 to T6.
- Locked-tier probability is redistributed proportionally to currently unlocked tiers.

## Rarity and Mutation Odds
### Base rarity weights by drawn tier
| Draw Tier | Common | Rare | Epic | Legendary |
|---|---:|---:|---:|---:|
| 1 | 80 | 17 | 3 | 0 |
| 2 | 70 | 22 | 7 | 1 |
| 3 | 58 | 27 | 11 | 4 |
| 4 | 44 | 31 | 17 | 8 |
| 5 | 30 | 34 | 22 | 14 |
| 6 | 18 | 31 | 30 | 21 |

### Luck shift
- `x = min(25, luck_level)`
- `common -= 0.9x`
- `rare += 0.45x`
- `epic += 0.30x`
- `legendary += 0.15x`
- Clamp common to minimum 5, then normalize to sum 100.

### Base mutation weights
- none: 92
- foil: 6
- holo: 1.6
- glitched: 0.35
- prismatic: 0.05

### Mutation shift
- `m = min(25, mutation_level)`
- `none -= 0.55m`
- `foil += 0.32m`
- `holo += 0.15m`
- `glitched += 0.06m`
- `prismatic += 0.02m`
- Normalize to sum 100.

## Shop Upgrades (6-Core)
| Upgrade | Effect | Cost Formula | Cap |
|---|---|---|---:|
| Auto Opener Unlock | Enables auto opening at 0.25 opens/sec | One-time 900 | 1 |
| Auto Speed | +0.06 opens/sec each level | `floor(140 * 1.33^level)` | 30 |
| Tier Boost | Advances tier distribution profile | `floor(60 * 1.42^level)` | 20 |
| Luck Engine | Improves rarity odds with formula above | `floor(75 * 1.36^level)` | 25 |
| Mutation Lab | Improves mutation odds with formula above | `floor(90 * 1.38^level)` | 25 |
| Value Engine | +7% reward multiplier each level | `floor(120 * 1.40^level)` | 20 |

## UI/UX Clarity Requirements
- Replace “Hatch Rates” with “Pack Odds”.
- Show current tier probabilities.
- Show current rarity probabilities for currently drawn tier mix.
- Show current mutation probabilities.
- Add “Why these odds?” expandable breakdown with formulas and current level substitutions.
- Add “Next unlock” rail showing remaining `packs_opened` and required `tier_boost_level`.
- Result card should show: pack tier, card name, rarity, mutation, and exact coin gain.
- Shop cards should show “current -> next” effect and exact next cost.

## API and State Contract Targets
- Frontend canonical interface:
  - `bootstrapPlayer() -> snapshot`
  - `openPack({ source: 'manual' | 'auto', debugOverride? }) -> { snapshot, draw }`
  - `buyUpgrade({ upgradeKey }) -> { snapshot, purchase }`
  - `getLeaderboard(limit) -> rows`
- Vuex game state additions:
  - `packs_opened`, `manual_opens`, `auto_opens`
  - `auto_unlocked`, `auto_speed_level`, `tier_boost_level`, `mutation_level`, `value_level`
  - `last_draw` containing `tier`, `rarity`, `mutation`, `reward`, `term_key`

## Server Migration Path (Phase 2)
- Add `open_pack(...)` and `buy_upgrade(...)` in Supabase.
- Keep `open_egg(...)` as temporary alias during transition.
- Maintain a stable snapshot contract between local and server adapters.
- Keep local storage schema aligned to server snapshot schema.

## Assumptions and Defaults
- Opening packs is free and rewards-only.
- No prestige/reset loop in v1.
- Existing coding concept cards remain; only pack framing changes.
- Local economy remains balancing authority during tuning.
- Server authority flips later only when formula parity is verified.
