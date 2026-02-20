import { PACK_NAMES_BY_TIER } from '../lib/packLogic.mjs'

export const PACK_TIERS = [1, 2, 3, 4, 5, 6].map((tier) => ({
  tier,
  name: PACK_NAMES_BY_TIER[tier],
}))

// Backward-compatible alias.
export const EGG_TIERS = PACK_TIERS
