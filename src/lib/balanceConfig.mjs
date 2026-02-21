export const BALANCE_CONFIG = {
  initialCoins: 100,
  idleIncomeCapSeconds: 12 * 60 * 60,
  manualOpenCooldownMs: 1200,

  // Legacy compatibility for existing card metadata consumers.
  baseBpMultiplier: 100,

  packTierNames: {
    1: 'CSS Pack',
    2: 'HTML Pack',
    3: 'Python Pack',
    4: 'Java Pack',
    5: 'C# Pack',
    6: 'C++ Pack',
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
    1: { common: 80, rare: 17, epic: 3, legendary: 0 },
    2: { common: 70, rare: 22, epic: 7, legendary: 1 },
    3: { common: 58, rare: 27, epic: 11, legendary: 4 },
    4: { common: 44, rare: 31, epic: 17, legendary: 8 },
    5: { common: 30, rare: 34, epic: 22, legendary: 14 },
    6: { common: 18, rare: 31, epic: 30, legendary: 21 },
  },
  luckShift: {
    cap: 25,
    common: -0.9,
    rare: 0.45,
    epic: 0.3,
    legendary: 0.15,
    minCommon: 5,
  },

  mutationWeights: {
    none: 92,
    foil: 6,
    holo: 1.6,
    glitched: 0.35,
    prismatic: 0.05,
  },
  mutationShift: {
    cap: 25,
    none: -0.55,
    foil: 0.32,
    holo: 0.15,
    glitched: 0.06,
    prismatic: 0.02,
  },

  rarityRewardMultipliers: {
    common: 1,
    rare: 1.5,
    epic: 2.3,
    legendary: 3.6,
  },
  mutationRewardMultipliers: {
    none: 1,
    foil: 1.18,
    holo: 1.45,
    glitched: 1.9,
    prismatic: 2.8,
  },
  cardBaseValueFactor: 0.06,
  valueMultiplierPerLevel: 0.07,

  autoOpen: {
    unlockCost: 225,
    basePerSecond: 0.25,
    perLevelPerSecond: 0.06,
  },

  upgradeCaps: {
    auto_unlock: 1,
    auto_speed: 30,
    tier_boost: 20,
    luck_engine: 25,
    mutation_lab: 25,
    value_engine: 20,
  },

  upgradeCostCurves: {
    auto_speed: { base: 35, growth: 1.33 },
    tier_boost: { base: 15, growth: 1.42 },
    luck_engine: { base: 18.75, growth: 1.36 },
    mutation_lab: { base: 22.5, growth: 1.38 },
    value_engine: { base: 30, growth: 1.4 },
  },
}

export function luckUpgradeCost(level) {
  const currentLevel = Math.max(0, Number(level || 0))
  const curve = BALANCE_CONFIG.upgradeCostCurves.luck_engine
  return Math.floor(curve.base * Math.pow(curve.growth, currentLevel))
}
