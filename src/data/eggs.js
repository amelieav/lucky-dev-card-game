import { BALANCE_CONFIG, luckUpgradeCost as computeLuckUpgradeCost } from '../lib/balanceConfig.mjs'

export const EGG_TIERS = [
  {
    tier: 1,
    name: 'Starter Egg',
    price: BALANCE_CONFIG.eggCosts[1],
    unlockAtEggsOpened: 0,
    description: 'Core coding basics',
    rarityFocus: 'Common / Rare',
  },
  {
    tier: 2,
    name: 'Builder Egg',
    price: BALANCE_CONFIG.eggCosts[2],
    unlockAtEggsOpened: 10,
    description: 'Architecture and async patterns',
    rarityFocus: 'Rare / Epic',
  },
  {
    tier: 3,
    name: 'Pipeline Egg',
    price: BALANCE_CONFIG.eggCosts[3],
    unlockAtEggsOpened: 25,
    description: 'Delivery and operations',
    rarityFocus: 'Rare / Epic',
  },
  {
    tier: 4,
    name: 'Model Egg',
    price: BALANCE_CONFIG.eggCosts[4],
    unlockAtEggsOpened: 45,
    description: 'ML lifecycle concepts',
    rarityFocus: 'Epic / Legendary',
  },
  {
    tier: 5,
    name: 'Agentic Egg',
    price: BALANCE_CONFIG.eggCosts[5],
    unlockAtEggsOpened: 70,
    description: 'AI agents and deep learning',
    rarityFocus: 'Epic / Legendary',
  },
  {
    tier: 6,
    name: 'Autonomy Egg',
    price: BALANCE_CONFIG.eggCosts[6],
    unlockAtEggsOpened: 100,
    description: 'Advanced agentic systems',
    rarityFocus: 'Legendary',
  },
]

export function luckUpgradeCost(level) {
  return computeLuckUpgradeCost(level)
}
