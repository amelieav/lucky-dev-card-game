export const BALANCE_CONFIG = {
  initialCoins: 100,
  idleIncomeCapSeconds: 12 * 60 * 60,
  baseBpMultiplier: 100,
  luckPassiveBpBonus: 3500,
  luckRarityShiftCap: 25,
  eggCosts: {
    1: 25,
    2: 120,
    3: 450,
    4: 1800,
    5: 6200,
    6: 22000,
  },
  tierUnlockThresholds: {
    1: 0,
    2: 10,
    3: 25,
    4: 45,
    5: 70,
    6: 100,
  },
  mixedTierWeights: {
    1: { 1: 100 },
    2: { 1: 95, 2: 5 },
    3: { 1: 82, 2: 8, 3: 10 },
    4: { 1: 72, 2: 8, 3: 14, 4: 6 },
    5: { 1: 60, 2: 7, 3: 16, 4: 11, 5: 6 },
    6: { 1: 50, 2: 6, 3: 18, 4: 13, 5: 8, 6: 5 },
  },
  rarityWeightsByTier: {
    1: { common: 76, rare: 20, epic: 4, legendary: 0 },
    2: { common: 58, rare: 30, epic: 11, legendary: 1 },
    3: { common: 46, rare: 33, epic: 16, legendary: 5 },
    4: { common: 24, rare: 42, epic: 24, legendary: 10 },
    5: { common: 8, rare: 30, epic: 42, legendary: 20 },
    6: { common: 0, rare: 8, epic: 42, legendary: 50 },
  },
}

export function luckUpgradeCost(level) {
  const currentLevel = Math.max(0, Number(level || 0))
  return Math.floor(80 + (currentLevel * 30) + (Math.pow(currentLevel, 2) * 18))
}
