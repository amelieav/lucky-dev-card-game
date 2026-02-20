import { BALANCE_CONFIG } from './balanceConfig.mjs'

export const TIERS = [1, 2, 3, 4, 5, 6]
export const RARITIES = ['common', 'rare', 'epic', 'legendary']
export const MUTATIONS = ['none', 'foil', 'holo', 'glitched', 'prismatic']
export const MUTATION_RANK = {
  none: 0,
  foil: 1,
  holo: 2,
  glitched: 3,
  prismatic: 4,
}
export const PACK_NAMES_BY_TIER = BALANCE_CONFIG.packTierNames

export const SHOP_UPGRADES = [
  {
    key: 'auto_unlock',
    label: 'Auto Opener Unlock',
    description: 'Unlock passive auto-opening at 0.25 packs/sec.',
  },
  {
    key: 'auto_speed',
    label: 'Auto Speed',
    description: 'Increase auto-opening speed by +0.06 packs/sec per level.',
  },
  {
    key: 'tier_boost',
    label: 'Tier Boost',
    description: 'Increase chance to draw higher-tier packs.',
  },
  {
    key: 'luck_engine',
    label: 'Luck Engine',
    description: 'Shift rarity chances toward epic and legendary draws.',
  },
  {
    key: 'mutation_lab',
    label: 'Mutation Lab',
    description: 'Increase chances of higher-value card mutations.',
  },
  {
    key: 'value_engine',
    label: 'Value Engine',
    description: 'Increase final card reward multiplier by +7% each level.',
  },
]

const UPGRADE_LEVEL_FIELD = {
  auto_speed: 'auto_speed_level',
  tier_boost: 'tier_boost_level',
  luck_engine: 'luck_level',
  mutation_lab: 'mutation_level',
  value_engine: 'value_level',
}

function round4(value) {
  return Math.round(Number(value) * 10_000) / 10_000
}

function normalizeWeightMap(weights) {
  const entries = Object.entries(weights).map(([key, value]) => [key, Math.max(0, Number(value || 0))])
  const total = entries.reduce((sum, [, value]) => sum + value, 0)

  if (total <= 0) {
    return Object.fromEntries(entries.map(([key]) => [key, 0]))
  }

  return Object.fromEntries(entries.map(([key, value]) => [key, round4((value / total) * 100)]))
}

function profileKeyForBoostLevel(level) {
  if (level >= 13) return 13
  if (level >= 10) return 10
  if (level >= 7) return 7
  if (level >= 4) return 4
  if (level >= 1) return 1
  return 0
}

export function getBaseTierWeightsForBoostLevel(tierBoostLevel) {
  const clamped = Math.max(0, Math.min(BALANCE_CONFIG.upgradeCaps.tier_boost, Number(tierBoostLevel || 0)))
  const key = profileKeyForBoostLevel(clamped)
  const base = { ...BALANCE_CONFIG.tierWeightProfiles[key] }

  if (clamped >= BALANCE_CONFIG.tier6ExtraShift.startLevel) {
    const capped = Math.min(clamped, BALANCE_CONFIG.tier6ExtraShift.endLevel)
    const shiftedLevels = Math.max(0, capped - (BALANCE_CONFIG.tier6ExtraShift.startLevel - 1))
    const shift = shiftedLevels * BALANCE_CONFIG.tier6ExtraShift.shiftPerLevel
    base[1] = Math.max(0, Number(base[1] || 0) - shift)
    base[6] = Number(base[6] || 0) + shift
  }

  return normalizeWeightMap(base)
}

function tierWeightsEqual(a, b) {
  for (const tier of TIERS) {
    if (Math.abs(Number(a?.[tier] || 0) - Number(b?.[tier] || 0)) > 0.0001) {
      return false
    }
  }
  return true
}

export function getHighestUnlockedTier(stateLike) {
  const packsOpened = Math.max(0, Number(stateLike?.packs_opened ?? stateLike?.eggs_opened ?? 0))
  const tierBoostLevel = Math.max(0, Number(stateLike?.tier_boost_level || 0))

  let highest = 1
  for (const tier of TIERS.slice(1)) {
    const req = BALANCE_CONFIG.tierUnlockRequirements[tier]
    if (!req) continue

    if (tierBoostLevel >= req.tierBoostLevel && packsOpened >= req.packsOpened) {
      highest = tier
    } else {
      break
    }
  }

  return highest
}

function redistributeLockedTierWeights(baseWeights, highestUnlockedTier) {
  const available = TIERS.filter((tier) => tier <= highestUnlockedTier)

  const unlockedTotal = available.reduce((sum, tier) => sum + Number(baseWeights[tier] || 0), 0)
  const lockedTotal = TIERS.filter((tier) => tier > highestUnlockedTier)
    .reduce((sum, tier) => sum + Number(baseWeights[tier] || 0), 0)

  if (available.length === 0) {
    return { 1: 100 }
  }

  if (unlockedTotal <= 0) {
    const fallback = {}
    for (const tier of available) {
      fallback[tier] = tier === available[available.length - 1] ? 100 : 0
    }
    return fallback
  }

  const redistributed = {}
  for (const tier of available) {
    const current = Number(baseWeights[tier] || 0)
    redistributed[tier] = current + (lockedTotal * (current / unlockedTotal))
  }

  return normalizeWeightMap(redistributed)
}

export function getEffectiveTierWeights(stateLike) {
  const highestUnlockedTier = getHighestUnlockedTier(stateLike)
  const base = getBaseTierWeightsForBoostLevel(stateLike?.tier_boost_level || 0)
  const redistributed = redistributeLockedTierWeights(base, highestUnlockedTier)

  const full = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  for (const [tier, weight] of Object.entries(redistributed)) {
    full[Number(tier)] = weight
  }

  return full
}

export function getNextTierOddsChangeLevel(currentTierBoostLevel) {
  const currentLevel = Math.max(0, Number(currentTierBoostLevel || 0))
  const current = getBaseTierWeightsForBoostLevel(currentLevel)

  for (let level = currentLevel + 1; level <= BALANCE_CONFIG.upgradeCaps.tier_boost; level += 1) {
    const next = getBaseTierWeightsForBoostLevel(level)
    if (!tierWeightsEqual(current, next)) {
      return level
    }
  }

  return null
}

export function getProgressToNextTier(stateLike) {
  const highestTier = getHighestUnlockedTier(stateLike)

  if (highestTier >= 6) {
    return {
      highestTier,
      nextTier: null,
      remainingPacks: 0,
      remainingTierBoost: 0,
      requirement: null,
    }
  }

  const nextTier = highestTier + 1
  const req = BALANCE_CONFIG.tierUnlockRequirements[nextTier]
  const packsOpened = Math.max(0, Number(stateLike?.packs_opened ?? stateLike?.eggs_opened ?? 0))
  const tierBoostLevel = Math.max(0, Number(stateLike?.tier_boost_level || 0))

  return {
    highestTier,
    nextTier,
    remainingPacks: Math.max(0, req.packsOpened - packsOpened),
    remainingTierBoost: Math.max(0, req.tierBoostLevel - tierBoostLevel),
    requirement: {
      packsOpened: req.packsOpened,
      tierBoostLevel: req.tierBoostLevel,
    },
  }
}

export function getRarityWeightsForTier(drawTier, luckLevel = 0) {
  const base = {
    ...(BALANCE_CONFIG.rarityWeightsByTier[drawTier] || BALANCE_CONFIG.rarityWeightsByTier[1]),
  }
  const x = Math.min(BALANCE_CONFIG.luckShift.cap, Math.max(0, Number(luckLevel || 0)))

  const common = Math.max(
    BALANCE_CONFIG.luckShift.minCommon,
    Number(base.common || 0) + (BALANCE_CONFIG.luckShift.common * x),
  )

  const rest = {
    rare: Math.max(0, Number(base.rare || 0) + (BALANCE_CONFIG.luckShift.rare * x)),
    epic: Math.max(0, Number(base.epic || 0) + (BALANCE_CONFIG.luckShift.epic * x)),
    legendary: Math.max(0, Number(base.legendary || 0) + (BALANCE_CONFIG.luckShift.legendary * x)),
  }

  if (common >= 100) {
    return {
      common: 100,
      rare: 0,
      epic: 0,
      legendary: 0,
    }
  }

  const restTotal = rest.rare + rest.epic + rest.legendary
  if (restTotal <= 0) {
    return {
      common: 100,
      rare: 0,
      epic: 0,
      legendary: 0,
    }
  }

  const scale = (100 - common) / restTotal
  const weights = {
    common: round4(common),
    rare: round4(rest.rare * scale),
    epic: round4(rest.epic * scale),
    legendary: round4(rest.legendary * scale),
  }

  const total = weights.common + weights.rare + weights.epic + weights.legendary
  weights.legendary = round4(weights.legendary + (100 - total))

  return weights
}

export function getMutationWeights(mutationLevel = 0) {
  const base = { ...BALANCE_CONFIG.mutationWeights }
  const m = Math.min(BALANCE_CONFIG.mutationShift.cap, Math.max(0, Number(mutationLevel || 0)))

  base.none = Number(base.none || 0) + (BALANCE_CONFIG.mutationShift.none * m)
  base.foil = Number(base.foil || 0) + (BALANCE_CONFIG.mutationShift.foil * m)
  base.holo = Number(base.holo || 0) + (BALANCE_CONFIG.mutationShift.holo * m)
  base.glitched = Number(base.glitched || 0) + (BALANCE_CONFIG.mutationShift.glitched * m)
  base.prismatic = Number(base.prismatic || 0) + (BALANCE_CONFIG.mutationShift.prismatic * m)

  return normalizeWeightMap(base)
}

export function pickFromWeightedMap(weights, rng = Math.random) {
  const entries = Object.entries(weights)
    .map(([key, weight]) => [key, Math.max(0, Number(weight || 0))])
    .filter(([, weight]) => weight > 0)

  if (entries.length === 0) {
    return null
  }

  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = rng() * total

  for (const [key, weight] of entries) {
    if (roll < weight) return key
    roll -= weight
  }

  return entries[entries.length - 1][0]
}

export function normalizeMutation(mutation) {
  const key = String(mutation || '').trim().toLowerCase()
  return MUTATIONS.includes(key) ? key : 'none'
}

export function mutationRank(mutation) {
  return Number(MUTATION_RANK[normalizeMutation(mutation)] || 0)
}

export function bestMutation(previousMutation, nextMutation) {
  return mutationRank(nextMutation) > mutationRank(previousMutation)
    ? normalizeMutation(nextMutation)
    : normalizeMutation(previousMutation)
}

export function getValueMultiplier(valueLevel = 0) {
  return 1 + (Math.max(0, Number(valueLevel || 0)) * BALANCE_CONFIG.valueMultiplierPerLevel)
}

export function getAutoOpensPerSecond(stateLike) {
  if (!stateLike?.auto_unlocked) return 0
  const speedLevel = Math.max(0, Number(stateLike.auto_speed_level || 0))
  return BALANCE_CONFIG.autoOpen.basePerSecond + (BALANCE_CONFIG.autoOpen.perLevelPerSecond * speedLevel)
}

export function getBaseCardValue(baseBp) {
  return Math.floor(Math.max(0, Number(baseBp || 0)) * BALANCE_CONFIG.cardBaseValueFactor)
}

export function computeCardReward({ baseBp, rarity, mutation, valueLevel }) {
  const baseValue = getBaseCardValue(baseBp)
  const rarityMult = BALANCE_CONFIG.rarityRewardMultipliers[rarity] || 1
  const mutationMult = BALANCE_CONFIG.mutationRewardMultipliers[mutation] || 1
  const valueMult = getValueMultiplier(valueLevel)

  return Math.floor(Math.max(1, baseValue * rarityMult * mutationMult * valueMult))
}

export function getUpgradeLevel(stateLike, upgradeKey) {
  if (upgradeKey === 'auto_unlock') {
    return stateLike?.auto_unlocked ? 1 : 0
  }

  const field = UPGRADE_LEVEL_FIELD[upgradeKey]
  if (!field) return 0
  return Math.max(0, Number(stateLike?.[field] || 0))
}

export function getUpgradeCap(upgradeKey) {
  return BALANCE_CONFIG.upgradeCaps[upgradeKey] || 0
}

export function getUpgradeCost(stateLike, upgradeKey) {
  if (upgradeKey === 'auto_unlock') {
    return stateLike?.auto_unlocked ? null : BALANCE_CONFIG.autoOpen.unlockCost
  }

  const cap = getUpgradeCap(upgradeKey)
  const level = getUpgradeLevel(stateLike, upgradeKey)
  if (level >= cap) return null

  const curve = BALANCE_CONFIG.upgradeCostCurves[upgradeKey]
  if (!curve) return null

  return Math.floor(curve.base * Math.pow(curve.growth, level))
}

export function canBuyUpgrade(stateLike, upgradeKey) {
  const cost = getUpgradeCost(stateLike, upgradeKey)
  if (cost == null) return false

  if (upgradeKey === 'auto_speed' && !stateLike?.auto_unlocked) {
    return false
  }

  return Number(stateLike?.coins || 0) >= cost
}

export function applyUpgrade(stateLike, upgradeKey) {
  const cost = getUpgradeCost(stateLike, upgradeKey)
  if (cost == null) {
    throw new Error('Upgrade is already maxed')
  }

  if (upgradeKey === 'auto_speed' && !stateLike?.auto_unlocked) {
    throw new Error('Unlock auto opener first')
  }

  if (Number(stateLike?.coins || 0) < cost) {
    throw new Error('Not enough coins')
  }

  stateLike.coins = Number(stateLike.coins || 0) - cost

  if (upgradeKey === 'auto_unlock') {
    stateLike.auto_unlocked = true
  } else {
    const field = UPGRADE_LEVEL_FIELD[upgradeKey]
    stateLike[field] = Math.max(0, Number(stateLike[field] || 0)) + 1
  }

  stateLike.highest_tier_unlocked = getHighestUnlockedTier(stateLike)

  return {
    upgrade_key: upgradeKey,
    spent: cost,
    level: getUpgradeLevel(stateLike, upgradeKey),
  }
}

function formatTierProfileForLevel(level) {
  const weights = getBaseTierWeightsForBoostLevel(level)
  return `T1 ${weights[1].toFixed(1)}% / T6 ${weights[6].toFixed(1)}%`
}

export function getUpgradeEffectLabel(upgradeKey, level) {
  const normalizedLevel = Math.max(0, Number(level || 0))

  switch (upgradeKey) {
    case 'auto_unlock':
      return normalizedLevel > 0 ? 'Enabled (0.25 packs/sec)' : 'Disabled'
    case 'auto_speed':
      return `${(BALANCE_CONFIG.autoOpen.basePerSecond + (BALANCE_CONFIG.autoOpen.perLevelPerSecond * normalizedLevel)).toFixed(2)} packs/sec`
    case 'tier_boost':
      return formatTierProfileForLevel(normalizedLevel)
    case 'luck_engine':
      return `Luck Lv ${normalizedLevel}`
    case 'mutation_lab':
      return `Mutation Lv ${normalizedLevel}`
    case 'value_engine':
      return `x${getValueMultiplier(normalizedLevel).toFixed(2)} card value`
    default:
      return '-'
  }
}

export function getUpgradePreview(stateLike, upgradeKey) {
  const currentLevel = getUpgradeLevel(stateLike, upgradeKey)
  const cap = getUpgradeCap(upgradeKey)
  const nextLevel = Math.min(cap, currentLevel + 1)

  return {
    current: getUpgradeEffectLabel(upgradeKey, currentLevel),
    next: currentLevel >= cap ? null : getUpgradeEffectLabel(upgradeKey, nextLevel),
  }
}
