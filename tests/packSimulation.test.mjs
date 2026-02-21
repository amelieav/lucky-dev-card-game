import test from 'node:test'
import assert from 'node:assert/strict'
import { TERMS } from '../src/data/terms.mjs'
import {
  getEffectiveTierWeights,
  getMutationWeights,
  getRarityWeightsForTier,
  pickFromWeightedMap,
} from '../src/lib/packLogic.mjs'

function createSeededRng(seed) {
  let value = seed >>> 0
  return () => {
    value = (1664525 * value + 1013904223) >>> 0
    return value / 0x100000000
  }
}

const termsByTierAndRarity = TERMS.reduce((acc, term) => {
  const key = `${term.tier}:${term.rarity}`
  if (!acc[key]) acc[key] = []
  acc[key].push(term)
  return acc
}, {})

const termsByTier = TERMS.reduce((acc, term) => {
  if (!acc[term.tier]) acc[term.tier] = []
  acc[term.tier].push(term)
  return acc
}, {})

function pickTerm(tier, rarity, rng) {
  const exactPool = termsByTierAndRarity[`${tier}:${rarity}`] || []
  if (exactPool.length > 0) {
    return exactPool[Math.floor(rng() * exactPool.length)]
  }

  const fallback = termsByTier[tier] || []
  if (fallback.length > 0) {
    return fallback[Math.floor(rng() * fallback.length)]
  }

  return TERMS[Math.floor(rng() * TERMS.length)]
}

function runTierSampling({ tierBoostLevel, draws, seed }) {
  const rng = createSeededRng(seed)
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }

  for (let i = 0; i < draws; i += 1) {
    const tier = Number(pickFromWeightedMap(getEffectiveTierWeights({ tier_boost_level: tierBoostLevel }), rng) || 1)
    counts[tier] += 1
  }

  return counts
}

test('tier boost increases high-tier pack probability', () => {
  const draws = 20_000
  const low = runTierSampling({ tierBoostLevel: 0, draws, seed: 11 })
  const high = runTierSampling({ tierBoostLevel: 20, draws, seed: 11 })

  const lowHighTierShare = (low[4] + low[5] + low[6]) / draws
  const highHighTierShare = (high[4] + high[5] + high[6]) / draws

  assert.ok(low[6] < high[6], `Expected more tier-6 packs with higher boost (${low[6]} vs ${high[6]})`)
  assert.ok(highHighTierShare > lowHighTierShare, `Expected higher T4+ share (${lowHighTierShare} vs ${highHighTierShare})`)
})

test('drawn pack tier always yields a card from the same tier', () => {
  const rng = createSeededRng(777)

  for (let i = 0; i < 4_000; i += 1) {
    const tier = Number(pickFromWeightedMap(getEffectiveTierWeights({ tier_boost_level: 20 }), rng) || 1)
    const rarity = pickFromWeightedMap(getRarityWeightsForTier(tier, 8), rng) || 'common'
    const _mutation = pickFromWeightedMap(getMutationWeights(8), rng) || 'none'
    const term = pickTerm(tier, rarity, rng)

    assert.equal(term.tier, tier, `Expected tier ${tier} card, got tier ${term.tier}`)
  }
})
