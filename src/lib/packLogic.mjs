import { BALANCE_CONFIG } from './balanceConfig.mjs'

export const TIERS = [1, 2, 3, 4, 5, 6]
export const RARITIES = ['common', 'rare', 'legendary']
export const MUTATIONS = ['none', 'foil', 'holo']
export const TIERS_PER_LAYER = TIERS.length
export const MAX_LAYERS = 2
export const MUTATION_RANK = {
  none: 0,
  foil: 1,
  holo: 2,
}
export const PACK_NAMES_BY_TIER = BALANCE_CONFIG.packTierNames
const TIER_UNLOCK_REQUIRED_BOOST = {
  1: 0,
  2: 1,
  3: 4,
  4: 7,
  5: 10,
  6: 13,
}

export function normalizeLayer(layer = 1) {
  return Math.max(1, Math.min(MAX_LAYERS, Number(layer || 1)))
}

export function getTierOffsetForLayer(layer = 1) {
  const normalizedLayer = normalizeLayer(layer)
  return (normalizedLayer - 1) * TIERS_PER_LAYER
}

export function getEffectiveTierForLayer(baseTier, layer = 1) {
  const normalizedBaseTier = Math.max(1, Math.min(TIERS_PER_LAYER, Number(baseTier || 1)))
  return normalizedBaseTier + getTierOffsetForLayer(layer)
}

export function getBaseTierFromEffectiveTier(effectiveTier) {
  const normalized = Math.max(1, Number(effectiveTier || 1))
  return ((normalized - 1) % TIERS_PER_LAYER) + 1
}

export const SHOP_UPGRADES = [
  {
    key: 'auto_unlock',
    label: 'Auto Roll',
    description: 'Unlock automatic opening.',
  },
  {
    key: 'auto_speed',
    label: 'Opening Speed',
    description: 'Reduce auto-open wait by 0.5s per level (to a 0.5s minimum).',
  },
  {
    key: 'tier_boost',
    label: 'Tier Upgrade',
    description: 'Increase the chance to draw higher-tier cards.',
  },
  {
    key: 'mutation_upgrade',
    label: 'Mutation Upgrade',
    description: 'Increase foil/holo chance (caps at Foil 40%, Holo 15%). Foil adds +1 cps, Holo adds +3 cps.',
  },
  {
    key: 'value_upgrade',
    label: 'Value Upgrade',
    description: 'Shift rarity odds away from common into rare and legendary.',
  },
]
export const MISSING_CARD_GIFT_COST = 25000

const LEGACY_UPGRADE_KEY_MAP = {
  luck_engine: 'value_upgrade',
  mutation_lab: 'mutation_upgrade',
  value_engine: 'value_upgrade',
}

const UPGRADE_LEVEL_FIELD = {
  auto_speed: 'auto_speed_level',
  tier_boost: 'tier_boost_level',
  mutation_upgrade: 'mutation_level',
  value_upgrade: 'value_level',
}

function normalizeUpgradeKey(upgradeKey) {
  const normalized = String(upgradeKey || '').trim().toLowerCase()
  return LEGACY_UPGRADE_KEY_MAP[normalized] || normalized
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

  const equalizationStart = Number(BALANCE_CONFIG.tierEqualization?.startLevel || 13)
  const equalizationEnd = Number(BALANCE_CONFIG.tierEqualization?.endLevel || BALANCE_CONFIG.upgradeCaps.tier_boost)
  const configuredTarget = BALANCE_CONFIG.tierEqualization?.targetProfile || {}
  const targetByTier = Object.fromEntries(TIERS.map((tier) => [tier, Number(configuredTarget[tier] || (100 / TIERS.length))]))
  if (clamped > equalizationStart && equalizationEnd > equalizationStart) {
    const progress = Math.max(
      0,
      Math.min(1, (clamped - equalizationStart) / (equalizationEnd - equalizationStart)),
    )
    for (const tier of TIERS) {
      const current = Number(base[tier] || 0)
      const target = Number(targetByTier[tier] || (100 / TIERS.length))
      base[tier] = current + ((target - current) * progress)
    }
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

function rarityWeightsEqual(a, b) {
  for (const rarity of RARITIES) {
    if (Math.abs(Number(a?.[rarity] || 0) - Number(b?.[rarity] || 0)) > 0.0001) {
      return false
    }
  }
  return true
}

export function getHighestUnlockedTier(stateLike) {
  const highestBaseTier = getMaxUnlockedBaseTier({
    packs_opened: stateLike?.packs_opened,
    eggs_opened: stateLike?.eggs_opened,
    tier_boost_level: stateLike?.tier_boost_level,
  })
  return getEffectiveTierForLayer(highestBaseTier, normalizeLayer(stateLike?.active_layer || 1))
}

function getMaxUnlockedBaseTier(stateLike) {
  const tierBoostLevel = Math.max(0, Number(stateLike?.tier_boost_level || 0))

  for (let tier = 6; tier >= 1; tier -= 1) {
    const requiredBoost = Math.max(0, Number(TIER_UNLOCK_REQUIRED_BOOST[tier] || 0))
    if (tierBoostLevel >= requiredBoost) {
      return tier
    }
  }

  return 1
}

export function getEffectiveTierWeights(stateLike) {
  const base = getBaseTierWeightsForBoostLevel(stateLike?.tier_boost_level || 0)
  const full = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }

  for (const [tier, weight] of Object.entries(base)) {
    full[Number(tier)] = weight
  }

  const highestUnlockedTier = getMaxUnlockedBaseTier(stateLike || {})
  const unlockedTotal = TIERS
    .filter((tier) => tier <= highestUnlockedTier)
    .reduce((sum, tier) => sum + Number(full[tier] || 0), 0)

  if (unlockedTotal <= 0) {
    const fallback = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    fallback[highestUnlockedTier] = 100
    return normalizeWeightMap(fallback)
  }

  const lockedTotal = 100 - unlockedTotal
  const effective = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  for (const tier of TIERS) {
    if (tier > highestUnlockedTier) {
      effective[tier] = 0
      continue
    }

    const baseWeight = Number(full[tier] || 0)
    effective[tier] = baseWeight + (lockedTotal * (baseWeight / unlockedTotal))
  }

  return normalizeWeightMap(effective)
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
  return {
    highestTier: getHighestUnlockedTier(stateLike),
    nextTier: null,
    remainingPacks: 0,
    remainingTierBoost: 0,
    requirement: null,
  }
}

export function getNextValueOddsChangeLevel(currentValueLevel) {
  const currentLevel = Math.max(0, Number(currentValueLevel || 0))
  const cap = BALANCE_CONFIG.upgradeCaps.value_upgrade
  const currentByTier = TIERS.map((tier) => getRarityWeightsForTier(tier, currentLevel))

  for (let level = currentLevel + 1; level <= cap; level += 1) {
    const hasChange = TIERS.some((tier, idx) => {
      const nextWeights = getRarityWeightsForTier(tier, level)
      return !rarityWeightsEqual(currentByTier[idx], nextWeights)
    })
    if (hasChange) {
      return level
    }
  }

  return null
}

export function getRarityWeightsForTier(drawTier, valueLevel = 0) {
  const base = {
    ...(BALANCE_CONFIG.rarityWeightsByTier[drawTier] || BALANCE_CONFIG.rarityWeightsByTier[1]),
  }
  const x = Math.min(BALANCE_CONFIG.valueShift.cap, Math.max(0, Number(valueLevel || 0)))
  const tierIndex = Math.max(0, Math.min(5, Number(drawTier || 1) - 1))
  const stepLevels = Math.max(1, Number(BALANCE_CONFIG.valueShift.tierStepLevels || 4))
  const target = {
    common: Number(BALANCE_CONFIG.valueShift.targetCommon || (100 / 3)),
    rare: Number(BALANCE_CONFIG.valueShift.targetRare || (100 / 3)),
    legendary: Number(BALANCE_CONFIG.valueShift.targetLegendary || (100 / 3)),
  }
  const progressLevels = Math.max(0, x - (tierIndex * stepLevels))
  const progress = Math.max(0, Math.min(1, progressLevels / stepLevels))

  const weights = {
    common: round4(Number(base.common || 0) + ((target.common - Number(base.common || 0)) * progress)),
    rare: round4(Number(base.rare || 0) + ((target.rare - Number(base.rare || 0)) * progress)),
    legendary: round4(Number(base.legendary || 0) + ((target.legendary - Number(base.legendary || 0)) * progress)),
  }

  const total = weights.common + weights.rare + weights.legendary
  weights.legendary = round4(weights.legendary + (100 - total))

  return weights
}

export function getMutationWeights(mutationLevel = 0) {
  const base = { ...BALANCE_CONFIG.mutationWeights }
  const m = Math.min(BALANCE_CONFIG.mutationShift.cap, Math.max(0, Number(mutationLevel || 0)))

  base.none = Number(base.none || 0) + (BALANCE_CONFIG.mutationShift.none * m)
  base.foil = Number(base.foil || 0) + (BALANCE_CONFIG.mutationShift.foil * m)
  base.holo = Number(base.holo || 0) + (BALANCE_CONFIG.mutationShift.holo * m)

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
  if (key === 'glitched' || key === 'prismatic') return 'holo'
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

export function getPassiveIncomeSummaryFromTerms(terms = []) {
  let foilCards = 0
  let holoCards = 0

  for (const row of terms || []) {
    const best = normalizeMutation(row?.best_mutation || row?.bestMutation || 'none')
    if (best === 'holo') holoCards += 1
    if (best === 'foil') foilCards += 1
  }

  const foilRate = foilCards * Number(BALANCE_CONFIG.mutationPassiveIncomePerSecond.foil || 0)
  const holoRate = holoCards * Number(BALANCE_CONFIG.mutationPassiveIncomePerSecond.holo || 0)

  return {
    foilCards,
    holoCards,
    foilRate,
    holoRate,
    totalRate: foilRate + holoRate,
  }
}

export function getValueMultiplier(valueLevel = 0) {
  return 1 + (Math.max(0, Number(valueLevel || 0)) * BALANCE_CONFIG.valueMultiplierPerLevel)
}

function getAutoOpenIntervalSeconds(speedLevel = 0) {
  const level = Math.max(0, Number(speedLevel || 0))
  const base = Number(BALANCE_CONFIG.autoOpen.baseIntervalSeconds || 2.5)
  const reduction = Number(BALANCE_CONFIG.autoOpen.intervalReductionPerLevelSeconds || 0)
  const minimum = Math.max(0.1, Number(BALANCE_CONFIG.autoOpen.minIntervalSeconds || 0.5))
  return Math.max(minimum, base - (reduction * level))
}

export function getAutoOpenIntervalMs(stateLike) {
  if (!stateLike?.auto_unlocked) return null
  const speedLevel = Math.max(0, Number(stateLike.auto_speed_level || 0))
  return Math.round(getAutoOpenIntervalSeconds(speedLevel) * 1000)
}

export function getAutoOpensPerSecond(stateLike) {
  if (!stateLike?.auto_unlocked) return 0
  const speedLevel = Math.max(0, Number(stateLike.auto_speed_level || 0))
  return 1 / getAutoOpenIntervalSeconds(speedLevel)
}

export function getBaseCardValue(baseBp) {
  return Math.floor(Math.max(0, Number(baseBp || 0)) * BALANCE_CONFIG.cardBaseValueFactor)
}

export function computeCardReward({ baseBp, rarity, mutation, valueLevel }) {
  const baseValue = getBaseCardValue(baseBp)
  const rarityMult = BALANCE_CONFIG.rarityRewardMultipliers[rarity] || 1
  const mutationMult = BALANCE_CONFIG.mutationRewardMultipliers[normalizeMutation(mutation)] || 1
  const valueMult = getValueMultiplier(valueLevel)

  return Math.floor(Math.max(1, baseValue * rarityMult * mutationMult * valueMult))
}

export function getUpgradeLevel(stateLike, upgradeKey) {
  const normalizedKey = normalizeUpgradeKey(upgradeKey)
  if (normalizedKey === 'auto_unlock') {
    return stateLike?.auto_unlocked ? 1 : 0
  }

  const field = UPGRADE_LEVEL_FIELD[normalizedKey]
  if (!field) return 0
  return Math.max(0, Number(stateLike?.[field] || 0))
}

export function getUpgradeCap(upgradeKey) {
  return BALANCE_CONFIG.upgradeCaps[normalizeUpgradeKey(upgradeKey)] || 0
}

export function getUpgradeCost(stateLike, upgradeKey) {
  const normalizedKey = normalizeUpgradeKey(upgradeKey)
  const rebirthCount = Math.max(0, Number(stateLike?.rebirth_count || 0))
  const rebirthMultiplier = Math.pow(
    Number(BALANCE_CONFIG.rebirthCostMultiplierPerRebirth || 1),
    rebirthCount,
  )

  if (normalizedKey === 'auto_unlock') {
    if (stateLike?.auto_unlocked) return null
    return Math.floor(Number(BALANCE_CONFIG.autoOpen.unlockCost || 0) * rebirthMultiplier)
  }

  const cap = getUpgradeCap(normalizedKey)
  const level = getUpgradeLevel(stateLike, normalizedKey)
  if (level >= cap) return null
  if (normalizedKey === 'tier_boost' && getNextTierOddsChangeLevel(level) == null) return null
  if (normalizedKey === 'value_upgrade' && getNextValueOddsChangeLevel(level) == null) return null

  const curve = BALANCE_CONFIG.upgradeCostCurves[normalizedKey]
  if (!curve) return null

  let baseCost = Math.floor(curve.base * Math.pow(curve.growth, level))

  if (normalizedKey === 'mutation_upgrade') {
    const nextMutation = getMutationWeights(level + 1)
    const floorConfig = BALANCE_CONFIG.mutationUpgradeCostFloor || {}
    const threshold = Number(floorConfig.thresholdHoloPercent || 4)
    const stepPercent = Math.max(0.0001, Number(floorConfig.stepPercent || 2))
    const minCostPerStep = Math.max(0, Number(floorConfig.minCostPerStep || 8000))
    const aboveThreshold = Math.max(0, Number(nextMutation.holo || 0) - threshold)

    if (aboveThreshold > 0) {
      const steps = Math.ceil(aboveThreshold / stepPercent)
      baseCost = Math.max(baseCost, Math.floor(steps * minCostPerStep))
    }
  }

  return Math.floor(baseCost * rebirthMultiplier)
}

export function canBuyUpgrade(stateLike, upgradeKey) {
  const normalizedKey = normalizeUpgradeKey(upgradeKey)
  const cost = getUpgradeCost(stateLike, normalizedKey)
  if (cost == null) return false

  if (normalizedKey === 'auto_speed' && !stateLike?.auto_unlocked) {
    return false
  }

  return Number(stateLike?.coins || 0) >= cost
}

export function canBuyMissingCardGift(stateLike) {
  return Number(stateLike?.coins || 0) >= MISSING_CARD_GIFT_COST
}

export function applyUpgrade(stateLike, upgradeKey) {
  const normalizedKey = normalizeUpgradeKey(upgradeKey)
  const cost = getUpgradeCost(stateLike, normalizedKey)
  if (cost == null) {
    throw new Error('Upgrade is already maxed')
  }

  if (normalizedKey === 'auto_speed' && !stateLike?.auto_unlocked) {
    throw new Error('Unlock auto opener first')
  }

  if (Number(stateLike?.coins || 0) < cost) {
    throw new Error('Not enough coins')
  }

  stateLike.coins = Number(stateLike.coins || 0) - cost

  if (normalizedKey === 'auto_unlock') {
    stateLike.auto_unlocked = true
  } else {
    const field = UPGRADE_LEVEL_FIELD[normalizedKey]
    stateLike[field] = Math.max(0, Number(stateLike[field] || 0)) + 1
  }

  stateLike.highest_tier_unlocked = getHighestUnlockedTier(stateLike)

  return {
    upgrade_key: normalizedKey,
    spent: cost,
    level: getUpgradeLevel(stateLike, normalizedKey),
  }
}

function formatTierProfileForLevel(level) {
  const weights = getBaseTierWeightsForBoostLevel(level)
  return `T1 ${weights[1].toFixed(1)}% / T6 ${weights[6].toFixed(1)}%`
}

function formatRarityProfileForLevel(level) {
  let focusTier = 6
  for (const tier of TIERS) {
    const row = getRarityWeightsForTier(tier, level)
    if (Math.abs(row.common - row.rare) > 0.05 || Math.abs(row.rare - row.legendary) > 0.05) {
      focusTier = tier
      break
    }
  }
  const rarity = getRarityWeightsForTier(focusTier, level)
  return `T${focusTier} C ${rarity.common.toFixed(1)}% · R ${rarity.rare.toFixed(1)}% · L ${rarity.legendary.toFixed(1)}%`
}

function formatMutationProfileForLevel(level) {
  const mutation = getMutationWeights(level)
  return `Foil ${mutation.foil.toFixed(1)}% · Holo ${mutation.holo.toFixed(1)}%`
}

export function getUpgradeEffectLabel(upgradeKey, level) {
  const normalizedLevel = Math.max(0, Number(level || 0))
  const normalizedKey = normalizeUpgradeKey(upgradeKey)

  switch (normalizedKey) {
    case 'auto_unlock':
      return normalizedLevel > 0 ? `Enabled (1 pack / ${Number(BALANCE_CONFIG.autoOpen.baseIntervalSeconds || 2.5).toFixed(1)}s)` : 'Disabled'
    case 'auto_speed':
      return `1 pack / ${getAutoOpenIntervalSeconds(normalizedLevel).toFixed(1)}s`
    case 'tier_boost':
      return formatTierProfileForLevel(normalizedLevel)
    case 'mutation_upgrade':
      return formatMutationProfileForLevel(normalizedLevel)
    case 'value_upgrade':
      return formatRarityProfileForLevel(normalizedLevel)
    default:
      return '-'
  }
}

export function getUpgradePreview(stateLike, upgradeKey) {
  const normalizedKey = normalizeUpgradeKey(upgradeKey)
  const currentLevel = getUpgradeLevel(stateLike, normalizedKey)
  const cap = getUpgradeCap(normalizedKey)
  const cost = getUpgradeCost(stateLike, normalizedKey)
  const nextLevel = Math.min(cap, currentLevel + 1)

  return {
    current: getUpgradeEffectLabel(normalizedKey, currentLevel),
    next: cost == null ? null : getUpgradeEffectLabel(normalizedKey, nextLevel),
  }
}
