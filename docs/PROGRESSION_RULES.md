# Progression Rules (Card Pack v1)

## Tier unlock gates
- Tier 1: default
- Tier 2: `tier_boost_level >= 1` and `packs_opened >= 40`
- Tier 3: `tier_boost_level >= 4` and `packs_opened >= 200`
- Tier 4: `tier_boost_level >= 7` and `packs_opened >= 550`
- Tier 5: `tier_boost_level >= 10` and `packs_opened >= 1100`
- Tier 6: `tier_boost_level >= 13` and `packs_opened >= 1900`

## Base tier mix by Tier Boost level (before lock redistribution)
- Level 0: T1 100%
- Level 1-3: T1 90%, T2 10%
- Level 4-6: T1 78%, T2 14%, T3 8%
- Level 7-9: T1 66%, T2 16%, T3 11%, T4 7%
- Level 10-12: T1 53%, T2 18%, T3 14%, T4 10%, T5 5%
- Level 13-20: T1 41%, T2 17%, T3 16%, T4 13%, T5 8%, T6 5%

## Extra high-tier shift
- At Tier Boost levels 14-20, shift 0.6% per level from T1 to T6.

## Opening model
- Manual open is free, 1 pack per 1.2s.
- Auto open unlock starts at 0.25 packs/sec.
- Auto speed upgrades add +0.06 packs/sec per level.

## Notes
- Locked-tier probability is redistributed to unlocked tiers proportionally.
- Card collection remains tracked, but economy is now reward-on-open first.
