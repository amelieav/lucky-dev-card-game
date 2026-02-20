import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyUpgrade,
  computeCardReward,
  getBaseTierWeightsForBoostLevel,
  getEffectiveTierWeights,
  getHighestUnlockedTier,
  getMutationWeights,
  getProgressToNextTier,
  getRarityWeightsForTier,
  getUpgradeCost,
  getUpgradePreview,
} from '../src/lib/packLogic.mjs'

function sum(values) {
  return values.reduce((acc, value) => acc + Number(value || 0), 0)
}

function assertApproxHundred(value) {
  assert.ok(Math.abs(value - 100) < 0.0005, `Expected ~100, got ${value}`)
}

test('highest unlocked tier requires both packs opened and tier boost', () => {
  assert.equal(getHighestUnlockedTier({ packs_opened: 500, tier_boost_level: 0 }), 1)
  assert.equal(getHighestUnlockedTier({ packs_opened: 40, tier_boost_level: 1 }), 2)
  assert.equal(getHighestUnlockedTier({ packs_opened: 200, tier_boost_level: 4 }), 3)
  assert.equal(getHighestUnlockedTier({ packs_opened: 1900, tier_boost_level: 13 }), 6)
})

test('effective tier weights sum to 100 and respect unlocks', () => {
  const early = getEffectiveTierWeights({ packs_opened: 0, tier_boost_level: 10 })
  assertApproxHundred(sum(Object.values(early)))
  assert.equal(early[1], 100)

  const late = getEffectiveTierWeights({ packs_opened: 2500, tier_boost_level: 20 })
  assertApproxHundred(sum(Object.values(late)))
  assert.ok(late[6] > 5)
})

test('base tier profile applies extra T1->T6 shift at level 14+', () => {
  const lvl13 = getBaseTierWeightsForBoostLevel(13)
  const lvl20 = getBaseTierWeightsForBoostLevel(20)

  assertApproxHundred(sum(Object.values(lvl13)))
  assertApproxHundred(sum(Object.values(lvl20)))
  assert.ok(lvl20[1] < lvl13[1])
  assert.ok(lvl20[6] > lvl13[6])
})

test('rarity weights stay normalized and common floor holds', () => {
  const lowLuck = getRarityWeightsForTier(6, 0)
  const highLuck = getRarityWeightsForTier(6, 999)

  assertApproxHundred(sum(Object.values(lowLuck)))
  assertApproxHundred(sum(Object.values(highLuck)))
  assert.ok(highLuck.common >= 5)
  assert.ok(highLuck.legendary > lowLuck.legendary)
})

test('mutation weights stay normalized and improve with mutation level', () => {
  const base = getMutationWeights(0)
  const upgraded = getMutationWeights(25)

  assertApproxHundred(sum(Object.values(base)))
  assertApproxHundred(sum(Object.values(upgraded)))
  assert.ok(upgraded.prismatic > base.prismatic)
  assert.ok(upgraded.glitched > base.glitched)
})

test('reward formula combines rarity, mutation, and value engine', () => {
  const baseline = computeCardReward({
    baseBp: 100,
    rarity: 'common',
    mutation: 'none',
    valueLevel: 0,
  })

  const boosted = computeCardReward({
    baseBp: 100,
    rarity: 'legendary',
    mutation: 'prismatic',
    valueLevel: 10,
  })

  assert.equal(baseline, 6)
  assert.ok(boosted > baseline)
})

test('upgrade cost curve increases and preview reports current/next effect', () => {
  const state = {
    coins: 1_000_000,
    auto_unlocked: true,
    auto_speed_level: 0,
    tier_boost_level: 0,
    luck_level: 0,
    mutation_level: 0,
    value_level: 0,
    packs_opened: 0,
  }

  const cost0 = getUpgradeCost(state, 'auto_speed')
  state.auto_speed_level = 1
  const cost1 = getUpgradeCost(state, 'auto_speed')

  assert.ok(cost1 > cost0)

  const preview = getUpgradePreview(state, 'value_engine')
  assert.ok(preview.current.includes('x'))
  assert.ok(preview.next.includes('x'))
})

test('applyUpgrade mutates state and spends coins', () => {
  const state = {
    coins: 2000,
    auto_unlocked: false,
    auto_speed_level: 0,
    tier_boost_level: 0,
    luck_level: 0,
    mutation_level: 0,
    value_level: 0,
    packs_opened: 0,
  }

  const unlock = applyUpgrade(state, 'auto_unlock')
  assert.equal(unlock.level, 1)
  assert.equal(state.auto_unlocked, true)

  const speed = applyUpgrade(state, 'auto_speed')
  assert.equal(speed.level, 1)
  assert.equal(state.auto_speed_level, 1)
})

test('progress reports remaining packs and tier boost', () => {
  const progress = getProgressToNextTier({ packs_opened: 180, tier_boost_level: 3 })
  assert.equal(progress.highestTier, 2)
  assert.equal(progress.nextTier, 3)
  assert.equal(progress.remainingPacks, 20)
  assert.equal(progress.remainingTierBoost, 1)
})
