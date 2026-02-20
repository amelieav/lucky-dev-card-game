import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MIX_WEIGHTS,
  TIER_UNLOCK_THRESHOLDS,
  getHighestUnlockedTier,
  getProgressToNextTier,
  getTierWeights,
  pickMixedTier,
} from '../src/lib/hatchLogic.mjs'

test('unlock thresholds produce expected highest unlocked tier', () => {
  assert.equal(getHighestUnlockedTier(0), 1)
  assert.equal(getHighestUnlockedTier(TIER_UNLOCK_THRESHOLDS[2] - 1), 1)
  assert.equal(getHighestUnlockedTier(TIER_UNLOCK_THRESHOLDS[2]), 2)
  assert.equal(getHighestUnlockedTier(TIER_UNLOCK_THRESHOLDS[3]), 3)
  assert.equal(getHighestUnlockedTier(TIER_UNLOCK_THRESHOLDS[4]), 4)
  assert.equal(getHighestUnlockedTier(TIER_UNLOCK_THRESHOLDS[5]), 5)
  assert.equal(getHighestUnlockedTier(TIER_UNLOCK_THRESHOLDS[6]), 6)
})

test('tier weight tables always sum to 100', () => {
  for (const tier of Object.keys(MIX_WEIGHTS)) {
    const total = Object.values(MIX_WEIGHTS[tier]).reduce((sum, weight) => sum + weight, 0)
    assert.equal(total, 100)
  }
})

test('mixed tier roll uses weighted boundaries', () => {
  const tier2Opened = TIER_UNLOCK_THRESHOLDS[2]

  assert.equal(pickMixedTier(tier2Opened, () => 0.0), 1)
  assert.equal(pickMixedTier(tier2Opened, () => 0.849), 1)
  assert.equal(pickMixedTier(tier2Opened, () => 0.851), 2)

  const tier6Opened = TIER_UNLOCK_THRESHOLDS[6]
  assert.equal(pickMixedTier(tier6Opened, () => 0.99), 6)
})

test('progress to next tier reports remaining hatches', () => {
  const progress = getProgressToNextTier(12)
  assert.equal(progress.highestTier, 2)
  assert.equal(progress.nextTier, 3)
  assert.equal(progress.nextThreshold, TIER_UNLOCK_THRESHOLDS[3])
  assert.equal(progress.remaining, TIER_UNLOCK_THRESHOLDS[3] - 12)

  const maxProgress = getProgressToNextTier(999)
  assert.equal(maxProgress.highestTier, 6)
  assert.equal(maxProgress.nextTier, null)
  assert.equal(maxProgress.remaining, 0)
})

test('weight table lookup is clamped to valid tier range', () => {
  assert.deepEqual(getTierWeights(0), MIX_WEIGHTS[1])
  assert.deepEqual(getTierWeights(999), MIX_WEIGHTS[6])
})
