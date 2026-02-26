import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyUpgrade,
  computeCardReward,
  getBaseTierWeightsForBoostLevel,
  getAutoOpenIntervalMs,
  getAutoOpensPerSecond,
  getEffectiveTierWeights,
  getHighestUnlockedTier,
  getMutationWeights,
  getNextValueOddsChangeLevel,
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

test('highest available tier follows non-zero pack odds', () => {
  assert.equal(getHighestUnlockedTier({ packs_opened: 0, tier_boost_level: 0 }), 1)
  assert.equal(getHighestUnlockedTier({ packs_opened: 0, tier_boost_level: 1 }), 2)
  assert.equal(getHighestUnlockedTier({ packs_opened: 0, tier_boost_level: 10 }), 5)
  assert.equal(getHighestUnlockedTier({ packs_opened: 1900, tier_boost_level: 13 }), 6)
})

test('effective tier weights sum to 100 and shift with tier boost', () => {
  const start = getEffectiveTierWeights({ packs_opened: 0, tier_boost_level: 0 })
  assertApproxHundred(sum(Object.values(start)))
  assert.equal(start[1], 100)
  assert.equal(start[2], 0)

  const mid = getEffectiveTierWeights({ packs_opened: 5_000, tier_boost_level: 10 })
  assertApproxHundred(sum(Object.values(mid)))
  assert.ok(mid[5] > 0)
  assert.ok(mid[1] < start[1])

  const late = getEffectiveTierWeights({ packs_opened: 5_000, tier_boost_level: 20 })
  assertApproxHundred(sum(Object.values(late)))
  assert.ok(late[6] > mid[6])
})

test('base tier profile at max boost favors higher tiers', () => {
  const lvl13 = getBaseTierWeightsForBoostLevel(13)
  const lvl20 = getBaseTierWeightsForBoostLevel(20)

  assertApproxHundred(sum(Object.values(lvl13)))
  assertApproxHundred(sum(Object.values(lvl20)))
  assert.ok(lvl20[1] < lvl13[1])
  assert.ok(lvl20[6] > lvl13[6])
  assert.ok(lvl20[6] > lvl20[1], `Expected T6 > T1 at max boost (${lvl20[6]} vs ${lvl20[1]})`)
})

test('rarity weights stay normalized and common floor holds', () => {
  const lowLuck = getRarityWeightsForTier(6, 0)
  const highLuck = getRarityWeightsForTier(6, 999)

  assertApproxHundred(sum(Object.values(lowLuck)))
  assertApproxHundred(sum(Object.values(highLuck)))
  assert.ok(highLuck.common >= 5)
  assert.ok(highLuck.legendary > lowLuck.legendary)
})

test('base rarity defaults get stricter on higher tiers', () => {
  const tier1 = getRarityWeightsForTier(1, 0)
  const tier2 = getRarityWeightsForTier(2, 0)
  const tier6 = getRarityWeightsForTier(6, 0)

  assertApproxHundred(sum(Object.values(tier1)))
  assertApproxHundred(sum(Object.values(tier2)))
  assertApproxHundred(sum(Object.values(tier6)))

  assert.ok(tier2.rare < tier1.rare)
  assert.ok(tier2.legendary < tier1.legendary)
  assert.ok(tier6.rare < tier2.rare)
  assert.ok(tier6.legendary < tier2.legendary)
})

test('mutation weights stay normalized and improve with mutation level', () => {
  const base = getMutationWeights(0)
  const upgraded = getMutationWeights(25)

  assertApproxHundred(sum(Object.values(base)))
  assertApproxHundred(sum(Object.values(upgraded)))
  assert.ok(upgraded.holo > base.holo)
  assert.ok(upgraded.foil > base.foil)
  assert.ok(Math.abs(upgraded.foil - 40) < 0.0005, `Expected foil cap at 40%, got ${upgraded.foil}`)
  assert.ok(Math.abs(upgraded.holo - 15) < 0.0005, `Expected holo cap at 15%, got ${upgraded.holo}`)
})

test('reward formula combines rarity and card tier value', () => {
  const baseline = computeCardReward({
    baseBp: 100,
    rarity: 'common',
    mutation: 'none',
    valueLevel: 0,
  })

  const boosted = computeCardReward({
    baseBp: 100,
    rarity: 'legendary',
    mutation: 'holo',
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
    mutation_level: 0,
    value_level: 0,
    packs_opened: 0,
  }

  const cost0 = getUpgradeCost(state, 'auto_speed')
  state.auto_speed_level = 1
  const cost1 = getUpgradeCost(state, 'auto_speed')

  assert.ok(cost1 > cost0)

  const preview = getUpgradePreview(state, 'value_upgrade')
  assert.ok(preview.current.includes('C'))
  assert.ok(preview.next.includes('C'))
})

test('mutation upgrade cost floors to 8k per 2% holo above 4%', () => {
  const state = {
    coins: 1_000_000_000,
    auto_unlocked: true,
    auto_speed_level: 0,
    tier_boost_level: 0,
    mutation_level: 0,
    value_level: 0,
    packs_opened: 0,
  }

  state.mutation_level = 5
  const costNearThreshold = getUpgradeCost(state, 'mutation_upgrade')
  assert.ok(costNearThreshold >= 8000, `Expected >=8000 once holo passes 4%, got ${costNearThreshold}`)

  state.mutation_level = 9
  const costAtNextBand = getUpgradeCost(state, 'mutation_upgrade')
  assert.ok(costAtNextBand >= 16000, `Expected >=16000 around holo ~6%, got ${costAtNextBand}`)

  state.mutation_level = 12
  const costAtThirdBand = getUpgradeCost(state, 'mutation_upgrade')
  assert.ok(costAtThirdBand >= 24000, `Expected >=24000 around holo ~8%, got ${costAtThirdBand}`)
})

test('value upgrade becomes maxed when rarity odds are fully saturated', () => {
  const state = {
    coins: 1_000_000,
    auto_unlocked: true,
    auto_speed_level: 0,
    tier_boost_level: 0,
    mutation_level: 0,
    value_level: 24,
    packs_opened: 0,
  }

  assert.equal(getNextValueOddsChangeLevel(state.value_level), null)
  assert.equal(getUpgradeCost(state, 'value_upgrade'), null)

  const preview = getUpgradePreview(state, 'value_upgrade')
  assert.equal(preview.next, null)
})

test('tier and value upgrades are maxed at configured cap levels', () => {
  const state = {
    coins: 1_000_000,
    auto_unlocked: true,
    auto_speed_level: 0,
    tier_boost_level: 20,
    mutation_level: 0,
    value_level: 25,
    packs_opened: 0,
  }

  assert.equal(getUpgradeCost(state, 'tier_boost'), null)
  assert.equal(getUpgradeCost(state, 'value_upgrade'), null)
})

test('auto speed reduces wait time to a 0.5s floor', () => {
  const locked = getAutoOpenIntervalMs({ auto_unlocked: false, auto_speed_level: 0 })
  const base = getAutoOpenIntervalMs({ auto_unlocked: true, auto_speed_level: 0 })
  const level2 = getAutoOpenIntervalMs({ auto_unlocked: true, auto_speed_level: 2 })
  const level8 = getAutoOpenIntervalMs({ auto_unlocked: true, auto_speed_level: 8 })

  assert.equal(locked, null)
  assert.equal(base, 2500)
  assert.equal(level2, 1500)
  assert.equal(level8, 500)
  assert.equal(getAutoOpensPerSecond({ auto_unlocked: true, auto_speed_level: 8 }), 2)
})

test('applyUpgrade mutates state and spends coins', () => {
  const state = {
    coins: 2000,
    auto_unlocked: false,
    auto_speed_level: 0,
    tier_boost_level: 0,
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

test('progress reports no lock gates for pack tiers', () => {
  const progress = getProgressToNextTier({ packs_opened: 180, tier_boost_level: 3 })
  assert.equal(progress.highestTier, 2)
  assert.equal(progress.nextTier, null)
  assert.equal(progress.remainingPacks, 0)
  assert.equal(progress.remainingTierBoost, 0)
})
