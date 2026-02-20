import { NICK_PARTS_A, NICK_PARTS_B, NICK_PARTS_C } from '../data/nicknameParts.mjs'
import { TERMS, TERMS_BY_KEY } from '../data/terms.mjs'
import { BALANCE_CONFIG, luckUpgradeCost } from './balanceConfig.mjs'
import { getHighestUnlockedTier, pickMixedTier } from './hatchLogic.mjs'

const STORAGE_PREFIX = 'lucky_agent_local_economy_v1'
const memoryStorage = new Map()
const RARITIES = ['common', 'rare', 'epic', 'legendary']

function nowIso(nowMs = Date.now()) {
  return new Date(nowMs).toISOString()
}

function chooseRandom(values, rng = Math.random) {
  return values[Math.floor(rng() * values.length)]
}

function assertAuthenticatedUser(user) {
  if (!user?.id) {
    throw new Error('Authentication required')
  }
}

function storageKey(userId) {
  return `${STORAGE_PREFIX}:${userId}`
}

function readRawValue(key) {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key)
  }
  return memoryStorage.get(key) || null
}

function writeRawValue(key, value) {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, value)
    return
  }
  memoryStorage.set(key, value)
}

function buildDefaultRecord(user, rng = Math.random) {
  const partA = chooseRandom(NICK_PARTS_A, rng)
  const partB = chooseRandom(NICK_PARTS_B, rng)
  const partC = chooseRandom(NICK_PARTS_C, rng)
  const timestamp = nowIso()

  return {
    coins: BALANCE_CONFIG.initialCoins,
    luck_level: 0,
    passive_rate_bp: 0,
    highest_tier_unlocked: 1,
    eggs_opened: 0,
    last_tick_at: timestamp,
    updated_at: timestamp,
    terms: [],
    profile: {
      nick_part_a: partA,
      nick_part_b: partB,
      nick_part_c: partC,
      display_name: `${partA} ${partB} ${partC}`,
      updated_at: timestamp,
    },
    next_reward: null,
  }
}

function sanitizeRecord(record, user, rng = Math.random) {
  if (!record || typeof record !== 'object') {
    return buildDefaultRecord(user, rng)
  }

  const fallback = buildDefaultRecord(user, rng)

  return {
    ...fallback,
    ...record,
    terms: Array.isArray(record.terms) ? record.terms : [],
    profile: {
      ...fallback.profile,
      ...(record.profile || {}),
    },
  }
}

function readRecord(user, rng = Math.random) {
  const key = storageKey(user.id)
  const raw = readRawValue(key)

  if (!raw) {
    const created = buildDefaultRecord(user, rng)
    writeRawValue(key, JSON.stringify(created))
    return created
  }

  try {
    const parsed = JSON.parse(raw)
    return sanitizeRecord(parsed, user, rng)
  } catch (_) {
    const recreated = buildDefaultRecord(user, rng)
    writeRawValue(key, JSON.stringify(recreated))
    return recreated
  }
}

function writeRecord(user, record) {
  writeRawValue(storageKey(user.id), JSON.stringify(record))
}

function sortTerms(terms) {
  return [...terms].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level
    if (b.copies !== a.copies) return b.copies - a.copies
    return a.term_key.localeCompare(b.term_key)
  })
}

function toSnapshot(record, debugAllowed, nowMs = Date.now()) {
  return {
    state: {
      coins: record.coins,
      luck_level: record.luck_level,
      passive_rate_bp: record.passive_rate_bp,
      highest_tier_unlocked: record.highest_tier_unlocked,
      eggs_opened: record.eggs_opened,
      last_tick_at: record.last_tick_at,
      updated_at: record.updated_at,
    },
    profile: { ...record.profile },
    terms: sortTerms(record.terms),
    meta: {
      server_now: nowIso(nowMs),
      debug_allowed: Boolean(debugAllowed),
      local_mode: true,
    },
  }
}

function calcLevel(copies) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(1, Number(copies || 1)))))
}

function applyIdleIncome(record, nowMs = Date.now()) {
  const lastTickMs = Date.parse(record.last_tick_at || nowIso())
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - lastTickMs) / 1000))
  const cappedSeconds = Math.min(BALANCE_CONFIG.idleIncomeCapSeconds, elapsedSeconds)
  const gained = Math.floor((cappedSeconds * record.passive_rate_bp) / 10000)
  const timestamp = nowIso(nowMs)

  record.coins += gained
  record.last_tick_at = timestamp
  record.updated_at = timestamp

  return gained
}

function recomputePassiveRateBp(record) {
  const termBp = record.terms.reduce((sum, row) => {
    const term = TERMS_BY_KEY[row.term_key]
    if (!term) return sum
    return sum + ((term.baseBp * BALANCE_CONFIG.baseBpMultiplier) * Math.max(1, Number(row.level || 1)))
  }, 0)

  record.passive_rate_bp = termBp + (Math.max(0, Number(record.luck_level || 0)) * BALANCE_CONFIG.luckPassiveBpBonus)
}

function ensureUnlockedTier(record) {
  record.highest_tier_unlocked = Math.max(
    Number(record.highest_tier_unlocked || 1),
    getHighestUnlockedTier(record.eggs_opened),
  )
}

function termRarity(termKey) {
  return TERMS_BY_KEY[termKey]?.rarity || 'common'
}

function termName(termKey) {
  return TERMS_BY_KEY[termKey]?.name || termKey
}

function rollRarity(eggTier, luckLevel, rng = Math.random) {
  const tierWeights = BALANCE_CONFIG.rarityWeightsByTier[eggTier] || BALANCE_CONFIG.rarityWeightsByTier[6]
  let commonW = Number(tierWeights.common || 0)
  let rareW = Number(tierWeights.rare || 0)
  let epicW = Number(tierWeights.epic || 0)
  let legendaryW = Number(tierWeights.legendary || 0)

  const luckBonus = Math.min(BALANCE_CONFIG.luckRarityShiftCap, Math.max(0, Number(luckLevel || 0)))

  commonW = Math.max(5, commonW - luckBonus)
  rareW += Math.floor(luckBonus * 0.5)
  epicW += Math.floor(luckBonus * 0.3)
  legendaryW += (luckBonus - Math.floor(luckBonus * 0.5) - Math.floor(luckBonus * 0.3))

  const totalW = commonW + rareW + epicW + legendaryW
  const roll = rng() * totalW

  if (roll < commonW) return 'common'
  if (roll < commonW + rareW) return 'rare'
  if (roll < commonW + rareW + epicW) return 'epic'
  return 'legendary'
}

function randomTermByPool(drawTier, rarity, rng = Math.random) {
  const exactPool = TERMS.filter((term) => term.tier === drawTier && term.rarity === rarity)
  if (exactPool.length > 0) {
    return chooseRandom(exactPool, rng).key
  }

  const fallbackPool = TERMS.filter((term) => term.tier === drawTier)
  if (fallbackPool.length > 0) {
    return chooseRandom(fallbackPool, rng).key
  }

  return null
}

function upsertTerm(record, termKey, copiesToAdd = 1, nowMs = Date.now()) {
  const idx = record.terms.findIndex((term) => term.term_key === termKey)
  const timestamp = nowIso(nowMs)

  if (idx === -1) {
    const copies = Math.max(1, Number(copiesToAdd || 1))
    record.terms.push({
      term_key: termKey,
      copies,
      level: calcLevel(copies),
      updated_at: timestamp,
    })
    return
  }

  const nextCopies = Number(record.terms[idx].copies || 0) + Math.max(1, Number(copiesToAdd || 1))
  record.terms[idx] = {
    ...record.terms[idx],
    copies: nextCopies,
    level: calcLevel(nextCopies),
    updated_at: timestamp,
  }
}

function getTermRow(record, termKey) {
  return record.terms.find((term) => term.term_key === termKey)
}

function getEggCost(tier) {
  const cost = BALANCE_CONFIG.eggCosts[tier]
  return typeof cost === 'number' ? cost : null
}

function validateNicknameParts(parts) {
  if (!NICK_PARTS_A.includes(parts.partA)) throw new Error('Invalid nickname part A')
  if (!NICK_PARTS_B.includes(parts.partB)) throw new Error('Invalid nickname part B')
  if (!NICK_PARTS_C.includes(parts.partC)) throw new Error('Invalid nickname part C')
}

function validateDebugOverride(override) {
  if (!override || typeof override !== 'object') return
  if (override.term_key && !TERMS_BY_KEY[override.term_key]) {
    throw new Error(`Unknown term key: ${override.term_key}`)
  }
  if (override.rarity && !RARITIES.includes(override.rarity)) {
    throw new Error(`Unknown rarity: ${override.rarity}`)
  }
  if (override.tier && (Number(override.tier) < 1 || Number(override.tier) > 6)) {
    throw new Error('Invalid egg tier')
  }
}

export function bootstrapLocalPlayer(user, { debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {}) {
  assertAuthenticatedUser(user)

  const record = readRecord(user, rng)
  applyIdleIncome(record, nowMs)
  ensureUnlockedTier(record)
  recomputePassiveRateBp(record)
  writeRecord(user, record)

  return toSnapshot(record, debugAllowed, nowMs)
}

export function openLocalEgg(
  user,
  { tier, debugOverride = null, debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {},
) {
  assertAuthenticatedUser(user)
  const selectedTier = Number(tier)

  if (selectedTier < 1 || selectedTier > 6) {
    throw new Error('Invalid egg tier')
  }

  const record = readRecord(user, rng)
  applyIdleIncome(record, nowMs)
  ensureUnlockedTier(record)

  if (selectedTier > record.highest_tier_unlocked) {
    throw new Error(`Tier ${selectedTier} is locked`)
  }

  const cost = getEggCost(selectedTier)
  if (cost == null) {
    throw new Error('Invalid egg tier')
  }

  if (record.coins < cost) {
    throw new Error('Not enough coins')
  }

  validateDebugOverride(debugOverride)

  let drawTier = selectedTier
  let chosenTerm = null
  let chosenRarity = null
  let debugApplied = false

  if (debugOverride) {
    if (!debugAllowed) {
      throw new Error('Debug override not allowed for this account')
    }
    chosenTerm = debugOverride.term_key || null
    chosenRarity = debugOverride.rarity || null
    drawTier = Number(debugOverride.tier || selectedTier)
    debugApplied = true
  } else if (record.next_reward && debugAllowed) {
    validateDebugOverride(record.next_reward)
    chosenTerm = record.next_reward.term_key || null
    chosenRarity = record.next_reward.rarity || null
    drawTier = Number(record.next_reward.tier || selectedTier)
    record.next_reward = null
    debugApplied = true
  } else if (selectedTier === 1) {
    drawTier = pickMixedTier(record.eggs_opened, rng)
  }

  if (chosenTerm && !TERMS_BY_KEY[chosenTerm]) {
    throw new Error(`Unknown term key: ${chosenTerm}`)
  }

  if (!chosenRarity) {
    chosenRarity = chosenTerm ? termRarity(chosenTerm) : rollRarity(selectedTier, record.luck_level, rng)
  }

  if (!chosenTerm) {
    chosenTerm = randomTermByPool(drawTier, chosenRarity, rng)
  }

  if (!chosenTerm) {
    throw new Error('Unable to resolve draw term')
  }

  record.coins -= cost
  record.eggs_opened += 1
  record.highest_tier_unlocked = Math.max(record.highest_tier_unlocked, getHighestUnlockedTier(record.eggs_opened))
  record.updated_at = nowIso(nowMs)

  upsertTerm(record, chosenTerm, 1, nowMs)
  recomputePassiveRateBp(record)
  writeRecord(user, record)

  const termRow = getTermRow(record, chosenTerm)

  return {
    snapshot: toSnapshot(record, debugAllowed, nowMs),
    draw: {
      term_key: chosenTerm,
      term_name: termName(chosenTerm),
      rarity: chosenRarity,
      tier: drawTier,
      copies: termRow?.copies || 1,
      level: termRow?.level || 1,
      debug_applied: debugApplied,
    },
  }
}

export function upgradeLocalLuck(user, { debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {}) {
  assertAuthenticatedUser(user)

  const record = readRecord(user, rng)
  applyIdleIncome(record, nowMs)

  const cost = luckUpgradeCost(record.luck_level)
  if (record.coins < cost) {
    throw new Error('Not enough coins to upgrade luck')
  }

  record.coins -= cost
  record.luck_level += 1
  record.updated_at = nowIso(nowMs)

  recomputePassiveRateBp(record)
  writeRecord(user, record)

  return {
    snapshot: toSnapshot(record, debugAllowed, nowMs),
  }
}

export function updateLocalNickname(user, parts, { debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {}) {
  assertAuthenticatedUser(user)
  validateNicknameParts(parts)

  const record = readRecord(user, rng)
  const timestamp = nowIso(nowMs)

  record.profile = {
    nick_part_a: parts.partA,
    nick_part_b: parts.partB,
    nick_part_c: parts.partC,
    display_name: `${parts.partA} ${parts.partB} ${parts.partC}`,
    updated_at: timestamp,
  }
  record.updated_at = timestamp

  writeRecord(user, record)

  return {
    snapshot: toSnapshot(record, debugAllowed, nowMs),
  }
}

export function debugApplyLocal(user, action, { debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {}) {
  assertAuthenticatedUser(user)

  if (!debugAllowed) {
    throw new Error('Debug actions are not allowed for this account')
  }

  const actionType = action?.type
  if (!actionType) {
    throw new Error('Missing debug action type')
  }

  const record = readRecord(user, rng)
  applyIdleIncome(record, nowMs)

  if (actionType === 'add_coins') {
    record.coins += Math.max(0, Number(action.amount || 0))
  } else if (actionType === 'set_coins') {
    record.coins = Math.max(0, Number(action.amount || 0))
  } else if (actionType === 'set_luck_level') {
    record.luck_level = Math.max(0, Number(action.level || 0))
  } else if (actionType === 'grant_term') {
    if (!TERMS_BY_KEY[action.term_key]) {
      throw new Error(`Unknown term key: ${action.term_key || ''}`)
    }
    upsertTerm(record, action.term_key, Math.max(1, Number(action.copies || 1)), nowMs)
  } else if (actionType === 'set_next_reward') {
    validateDebugOverride(action)
    const { type: _omit, ...nextReward } = action
    record.next_reward = nextReward
  } else if (actionType === 'reset_account') {
    record.coins = BALANCE_CONFIG.initialCoins
    record.luck_level = 0
    record.passive_rate_bp = 0
    record.highest_tier_unlocked = 1
    record.eggs_opened = 0
    record.last_tick_at = nowIso(nowMs)
    record.terms = []
    record.next_reward = null
  } else {
    throw new Error(`Unsupported debug action type: ${actionType}`)
  }

  if (['set_luck_level', 'grant_term', 'reset_account'].includes(actionType)) {
    recomputePassiveRateBp(record)
  }

  ensureUnlockedTier(record)
  record.updated_at = nowIso(nowMs)
  writeRecord(user, record)

  return {
    snapshot: toSnapshot(record, debugAllowed, nowMs),
    debug_action: actionType,
  }
}
