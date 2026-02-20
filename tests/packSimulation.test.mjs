import test from 'node:test'
import assert from 'node:assert/strict'
import { TERMS } from '../src/data/terms.mjs'
import {
  applyUpgrade,
  computeCardReward,
  getAutoOpensPerSecond,
  getEffectiveTierWeights,
  getHighestUnlockedTier,
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

function quantile(sortedValues, q) {
  if (sortedValues.length === 0) return 0
  const idx = Math.floor((sortedValues.length - 1) * q)
  return sortedValues[idx]
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

function createInitialState() {
  return {
    coins: 100,
    luck_level: 0,
    mutation_level: 0,
    value_level: 0,
    tier_boost_level: 0,
    auto_unlocked: false,
    auto_speed_level: 0,
    packs_opened: 0,
    manual_opens: 0,
    auto_opens: 0,
    auto_open_progress: 0,
    highest_tier_unlocked: 1,
  }
}

function drawOne(state, rng, source) {
  const tier = Number(pickFromWeightedMap(getEffectiveTierWeights(state), rng) || 1)
  const rarity = pickFromWeightedMap(getRarityWeightsForTier(tier, state.luck_level), rng) || 'common'
  const mutation = pickFromWeightedMap(getMutationWeights(state.mutation_level), rng) || 'none'

  const term = pickTerm(tier, rarity, rng)
  const reward = computeCardReward({
    baseBp: term.baseBp,
    rarity,
    mutation,
    valueLevel: state.value_level,
  })

  state.coins += reward
  state.packs_opened += 1
  if (source === 'auto') {
    state.auto_opens += 1
  } else {
    state.manual_opens += 1
  }
  state.highest_tier_unlocked = getHighestUnlockedTier(state)

  return tier
}

function applyAutoOpens(state, elapsedSeconds, rng) {
  if (!state.auto_unlocked || elapsedSeconds <= 0) {
    return 0
  }

  const total = state.auto_open_progress + (elapsedSeconds * getAutoOpensPerSecond(state))
  const count = Math.floor(total)
  state.auto_open_progress = total - count

  let maxTier = 0
  for (let i = 0; i < count; i += 1) {
    maxTier = Math.max(maxTier, drawOne(state, rng, 'auto'))
  }

  return maxTier
}

function runPurchaseLoop(state) {
  const strategy = [
    { key: 'auto_unlock', field: 'auto_unlocked', target: 1 },
    { key: 'tier_boost', field: 'tier_boost_level', target: 13 },
    { key: 'tier_boost', field: 'tier_boost_level', target: 20 },
    { key: 'auto_speed', field: 'auto_speed_level', target: 10 },
    { key: 'luck_engine', field: 'luck_level', target: 9 },
    { key: 'mutation_lab', field: 'mutation_level', target: 8 },
    { key: 'value_engine', field: 'value_level', target: 8 },
    { key: 'auto_speed', field: 'auto_speed_level', target: 16 },
  ]

  let changed = true
  let guard = 0

  while (changed && guard < 200) {
    changed = false
    guard += 1

    for (const step of strategy) {
      const currentLevel = step.key === 'auto_unlock'
        ? (state.auto_unlocked ? 1 : 0)
        : Number(state[step.field] || 0)

      if (currentLevel >= step.target) continue

      try {
        applyUpgrade(state, step.key)
        changed = true
        break
      } catch (_) {
        continue
      }
    }
  }
}

function simulateFirstTier6HitMinutes(seed) {
  const rng = createSeededRng(seed + 1)
  const state = createInitialState()

  let firstTier6AtSeconds = null
  let elapsedSeconds = 0

  const maxSeconds = 90 * 60
  while (elapsedSeconds <= maxSeconds && firstTier6AtSeconds == null) {
    elapsedSeconds += 1.2

    const maxAutoTier = applyAutoOpens(state, 1.2, rng)
    if (maxAutoTier >= 6) {
      firstTier6AtSeconds = elapsedSeconds
      break
    }

    const manualTier = drawOne(state, rng, 'manual')
    if (manualTier >= 6) {
      firstTier6AtSeconds = elapsedSeconds
      break
    }

    runPurchaseLoop(state)
  }

  if (firstTier6AtSeconds == null) {
    return 90
  }

  return firstTier6AtSeconds / 60
}

test('seeded simulation keeps first tier-6 hit in 30-50 minute target band', () => {
  const runCount = Math.max(1, Number(process.env.SIM_RUNS || 500))
  const runs = []
  for (let i = 0; i < runCount; i += 1) {
    runs.push(simulateFirstTier6HitMinutes(i + 1))
  }

  const sorted = [...runs].sort((a, b) => a - b)
  const p25 = quantile(sorted, 0.25)
  const p50 = quantile(sorted, 0.5)
  const p75 = quantile(sorted, 0.75)

  if (process.env.SIM_LOG === '1') {
    console.log(`simulation runs=${runCount} p25=${p25.toFixed(2)} p50=${p50.toFixed(2)} p75=${p75.toFixed(2)}`)
  }

  assert.ok(p25 >= 30, `Expected p25 >= 30, got ${p25}`)
  assert.ok(p50 >= 30 && p50 <= 50, `Expected p50 in [30, 50], got ${p50}`)
  assert.ok(p75 <= 50, `Expected p75 <= 50, got ${p75}`)
})
