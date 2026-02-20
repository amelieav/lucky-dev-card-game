import { BALANCE_CONFIG } from './balanceConfig.mjs'

export const TIER_UNLOCK_THRESHOLDS = BALANCE_CONFIG.tierUnlockThresholds
export const MIX_WEIGHTS = BALANCE_CONFIG.mixedTierWeights

export function getHighestUnlockedTier(eggsOpened) {
  const opened = Number(eggsOpened || 0)

  if (opened >= TIER_UNLOCK_THRESHOLDS[6]) return 6
  if (opened >= TIER_UNLOCK_THRESHOLDS[5]) return 5
  if (opened >= TIER_UNLOCK_THRESHOLDS[4]) return 4
  if (opened >= TIER_UNLOCK_THRESHOLDS[3]) return 3
  if (opened >= TIER_UNLOCK_THRESHOLDS[2]) return 2
  return 1
}

export function getTierWeights(highestUnlockedTier) {
  const tier = Math.max(1, Math.min(6, Number(highestUnlockedTier || 1)))
  return MIX_WEIGHTS[tier]
}

export function pickMixedTier(eggsOpened, rng = Math.random) {
  const highestTier = getHighestUnlockedTier(eggsOpened)
  const weights = getTierWeights(highestTier)

  let cursor = 0
  const roll = rng() * 100

  for (const [tier, weight] of Object.entries(weights)) {
    cursor += Number(weight)
    if (roll < cursor) {
      return Number(tier)
    }
  }

  return highestTier
}

export function getProgressToNextTier(eggsOpened) {
  const opened = Number(eggsOpened || 0)
  const highestTier = getHighestUnlockedTier(opened)

  if (highestTier >= 6) {
    return {
      highestTier,
      nextTier: null,
      remaining: 0,
      nextThreshold: null,
    }
  }

  const nextTier = highestTier + 1
  const nextThreshold = TIER_UNLOCK_THRESHOLDS[nextTier]

  return {
    highestTier,
    nextTier,
    nextThreshold,
    remaining: Math.max(0, nextThreshold - opened),
  }
}
