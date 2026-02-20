export const TIER_UNLOCK_THRESHOLDS = {
  1: 0,
  2: 10,
  3: 25,
  4: 45,
  5: 70,
  6: 100,
}

export const MIX_WEIGHTS = {
  1: { 1: 100 },
  2: { 1: 85, 2: 15 },
  3: { 1: 70, 2: 20, 3: 10 },
  4: { 1: 58, 2: 22, 3: 13, 4: 7 },
  5: { 1: 46, 2: 22, 3: 16, 4: 10, 5: 6 },
  6: { 1: 38, 2: 21, 3: 16, 4: 12, 5: 8, 6: 5 },
}

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
