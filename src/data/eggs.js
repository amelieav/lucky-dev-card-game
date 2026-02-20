export const EGG_TIERS = [
  {
    tier: 1,
    name: 'Starter Egg',
    price: 25,
    unlockAtEggsOpened: 0,
    description: 'Core coding basics',
    rarityFocus: 'Common / Rare',
  },
  {
    tier: 2,
    name: 'Builder Egg',
    price: 120,
    unlockAtEggsOpened: 8,
    description: 'Architecture and async patterns',
    rarityFocus: 'Rare / Epic',
  },
  {
    tier: 3,
    name: 'Pipeline Egg',
    price: 450,
    unlockAtEggsOpened: 25,
    description: 'Delivery and operations',
    rarityFocus: 'Rare / Epic',
  },
  {
    tier: 4,
    name: 'Model Egg',
    price: 1800,
    unlockAtEggsOpened: 55,
    description: 'ML lifecycle concepts',
    rarityFocus: 'Epic / Legendary',
  },
  {
    tier: 5,
    name: 'Agentic Egg',
    price: 6200,
    unlockAtEggsOpened: 95,
    description: 'AI agents and deep learning',
    rarityFocus: 'Epic / Legendary',
  },
]

export function luckUpgradeCost(level) {
  return Math.floor(80 + (level * 30) + (Math.pow(level, 2) * 18))
}
