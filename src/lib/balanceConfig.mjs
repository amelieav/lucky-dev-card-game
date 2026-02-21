export const BALANCE_CONFIG = {
  initialCoins: 100,
  idleIncomeCapSeconds: 12 * 60 * 60,
  manualOpenCooldownMs: 1500,

  // Legacy compatibility for existing card metadata consumers.
  baseBpMultiplier: 100,

  packTierNames: {
    1: 'Tier 1 Common',
    2: 'Tier 2 Uncommon',
    3: 'Tier 3 Rare',
    4: 'Tier 4 Epic',
    5: 'Tier 5 Legendary',
    6: 'Tier 6 Mythic',
  },

  tierColors: {
    1: '#8b6a4b',
    2: '#3f9f59',
    3: '#2f7ed8',
    4: '#8a49c3',
    5: '#d14f4f',
    6: '#c79a1b',
  },

  tierWeightProfiles: {
    0: { 1: 100, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    1: { 1: 90, 2: 10, 3: 0, 4: 0, 5: 0, 6: 0 },
    4: { 1: 78, 2: 14, 3: 8, 4: 0, 5: 0, 6: 0 },
    7: { 1: 66, 2: 16, 3: 11, 4: 7, 5: 0, 6: 0 },
    10: { 1: 53, 2: 18, 3: 14, 4: 10, 5: 5, 6: 0 },
    13: { 1: 41, 2: 17, 3: 16, 4: 13, 5: 8, 6: 5 },
  },
  tier6ExtraShift: {
    startLevel: 14,
    endLevel: 20,
    shiftPerLevel: 0.6,
  },

  rarityWeightsByTier: {
    1: { common: 77, rare: 20, legendary: 3 },
    2: { common: 77, rare: 20, legendary: 3 },
    3: { common: 77, rare: 20, legendary: 3 },
    4: { common: 77, rare: 20, legendary: 3 },
    5: { common: 77, rare: 20, legendary: 3 },
    6: { common: 77, rare: 20, legendary: 3 },
  },
  valueShift: {
    cap: 25,
    common: -1.2,
    rare: 0.8,
    legendary: 0.4,
    minCommon: 25,
  },

  mutationWeights: {
    none: 90,
    foil: 8,
    holo: 2,
  },
  mutationShift: {
    cap: 25,
    none: -1.4,
    foil: 0.9,
    holo: 0.5,
  },
  mutationPassiveIncomePerSecond: {
    foil: 1,
    holo: 3,
  },

  rarityRewardMultipliers: {
    common: 1,
    rare: 1.8,
    legendary: 3.2,
  },
  mutationRewardMultipliers: {
    none: 1,
    foil: 1,
    holo: 1,
  },
  cardBaseValueFactor: 0.06,
  valueMultiplierPerLevel: 0,

  autoOpen: {
    unlockCost: 225,
    baseIntervalSeconds: 2.5,
    intervalReductionPerLevelSeconds: 0.5,
    minIntervalSeconds: 0.5,
  },

  upgradeCaps: {
    auto_unlock: 1,
    auto_speed: 4,
    tier_boost: 20,
    mutation_upgrade: 25,
    value_upgrade: 25,
  },

  upgradeCostCurves: {
    auto_speed: { base: 120, growth: 1.45 },
    tier_boost: { base: 25, growth: 1.42 },
    mutation_upgrade: { base: 35, growth: 1.38 },
    value_upgrade: { base: 40, growth: 1.4 },
  },
}

export function valueUpgradeCost(level) {
  const currentLevel = Math.max(0, Number(level || 0))
  const curve = BALANCE_CONFIG.upgradeCostCurves.value_upgrade
  return Math.floor(curve.base * Math.pow(curve.growth, currentLevel))
}

// Backward-compatible alias for older imports.
export function luckUpgradeCost(level) {
  return valueUpgradeCost(level)
}
