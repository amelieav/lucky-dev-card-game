import { NICK_PARTS_A, NICK_PARTS_B, NICK_PARTS_C } from '../data/nicknameParts.mjs'
import { TERMS, TERMS_BY_KEY } from '../data/terms.mjs'
import { BALANCE_CONFIG } from './balanceConfig.mjs'
import {
  MUTATIONS,
  RARITIES,
  applyUpgrade,
  bestMutation,
  canBuyUpgrade,
  computeCardReward,
  getAutoOpensPerSecond,
  getEffectiveTierWeights,
  getHighestUnlockedTier,
  getMutationWeights,
  getRarityWeightsForTier,
  normalizeMutation,
  pickFromWeightedMap,
} from './packLogic.mjs'

const STORAGE_PREFIX = 'lucky_agent_local_pack_economy_v1'
const LEGACY_STORAGE_PREFIX = 'lucky_agent_local_economy_v1'
const memoryStorage = new Map()

const TERMS_BY_TIER = TERMS.reduce((acc, term) => {
  if (!acc[term.tier]) acc[term.tier] = []
  acc[term.tier].push(term)
  return acc
}, {})

const TERMS_BY_TIER_AND_RARITY = TERMS.reduce((acc, term) => {
  const key = `${term.tier}:${term.rarity}`
  if (!acc[key]) acc[key] = []
  acc[key].push(term)
  return acc
}, {})

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

function legacyStorageKey(userId) {
  return `${LEGACY_STORAGE_PREFIX}:${userId}`
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

function buildDefaultRecord(user, rng = Math.random, nowMs = Date.now()) {
  const partA = chooseRandom(NICK_PARTS_A, rng)
  const partB = chooseRandom(NICK_PARTS_B, rng)
  const partC = chooseRandom(NICK_PARTS_C, rng)
  const timestamp = nowIso(nowMs)

  return {
    coins: BALANCE_CONFIG.initialCoins,
    luck_level: 0,
    mutation_level: 0,
    value_level: 0,
    tier_boost_level: 0,
    auto_unlocked: false,
    auto_speed_level: 0,
    highest_tier_unlocked: 1,
    packs_opened: 0,
    eggs_opened: 0,
    manual_opens: 0,
    auto_opens: 0,
    auto_open_progress: 0,
    passive_rate_bp: 0,
    last_tick_at: timestamp,
    created_at: timestamp,
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

function sanitizeRecord(record, user, rng = Math.random, nowMs = Date.now()) {
  const fallback = buildDefaultRecord(user, rng, nowMs)
  if (!record || typeof record !== 'object') return fallback

  const merged = {
    ...fallback,
    ...record,
    profile: {
      ...fallback.profile,
      ...(record.profile || {}),
    },
    terms: Array.isArray(record.terms) ? record.terms : [],
  }

  if (merged.packs_opened == null && merged.eggs_opened != null) {
    merged.packs_opened = Number(merged.eggs_opened || 0)
  }

  merged.packs_opened = Math.max(0, Number(merged.packs_opened || 0))
  merged.eggs_opened = merged.packs_opened
  merged.manual_opens = Math.max(0, Number(merged.manual_opens || 0))
  merged.auto_opens = Math.max(0, Number(merged.auto_opens || 0))
  merged.auto_open_progress = Math.max(0, Number(merged.auto_open_progress || 0))
  merged.auto_speed_level = Math.max(0, Number(merged.auto_speed_level || 0))
  merged.tier_boost_level = Math.max(0, Number(merged.tier_boost_level || 0))
  merged.luck_level = Math.max(0, Number(merged.luck_level || 0))
  merged.mutation_level = Math.max(0, Number(merged.mutation_level || 0))
  merged.value_level = Math.max(0, Number(merged.value_level || 0))
  merged.coins = Math.max(0, Number(merged.coins || 0))
  merged.auto_unlocked = Boolean(merged.auto_unlocked)
  merged.terms = merged.terms.map((row) => sanitizeTermRow(row))
  merged.highest_tier_unlocked = getHighestUnlockedTier(merged)

  return merged
}

function parseStored(raw, user, rng = Math.random, nowMs = Date.now()) {
  try {
    return sanitizeRecord(JSON.parse(raw), user, rng, nowMs)
  } catch (_) {
    return null
  }
}

function readRecord(user, rng = Math.random, nowMs = Date.now()) {
  const currentRaw = readRawValue(storageKey(user.id))
  if (currentRaw) {
    const parsed = parseStored(currentRaw, user, rng, nowMs)
    if (parsed) return parsed
  }

  const legacyRaw = readRawValue(legacyStorageKey(user.id))
  if (legacyRaw) {
    const migrated = parseStored(legacyRaw, user, rng, nowMs)
    if (migrated) {
      writeRawValue(storageKey(user.id), JSON.stringify(migrated))
      return migrated
    }
  }

  const created = buildDefaultRecord(user, rng, nowMs)
  writeRawValue(storageKey(user.id), JSON.stringify(created))
  return created
}

function writeRecord(user, record) {
  writeRawValue(storageKey(user.id), JSON.stringify(record))
}

function sanitizeTermRow(row) {
  return {
    ...row,
    term_key: String(row?.term_key || ''),
    copies: Math.max(0, Number(row?.copies || 0)),
    level: Math.max(1, Number(row?.level || 1)),
    best_mutation: normalizeMutation(row?.best_mutation || row?.bestMutation || 'none'),
  }
}

function sortTerms(terms) {
  return terms.map((row) => sanitizeTermRow(row)).sort((a, b) => {
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
      mutation_level: record.mutation_level,
      value_level: record.value_level,
      tier_boost_level: record.tier_boost_level,
      auto_unlocked: record.auto_unlocked,
      auto_speed_level: record.auto_speed_level,
      highest_tier_unlocked: record.highest_tier_unlocked,
      packs_opened: record.packs_opened,
      eggs_opened: record.packs_opened,
      manual_opens: record.manual_opens,
      auto_opens: record.auto_opens,
      passive_rate_bp: 0,
      auto_open_progress: record.auto_open_progress,
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

function getTermPool(drawTier, rarity) {
  return TERMS_BY_TIER_AND_RARITY[`${drawTier}:${rarity}`] || []
}

function randomTermByPool(drawTier, rarity, rng = Math.random) {
  const exact = getTermPool(drawTier, rarity)
  if (exact.length > 0) {
    return chooseRandom(exact, rng).key
  }

  const fallback = TERMS_BY_TIER[drawTier] || []
  if (fallback.length > 0) {
    return chooseRandom(fallback, rng).key
  }

  return null
}

function upsertTerm(record, termKey, { copiesToAdd = 1, mutation = 'none' } = {}, nowMs = Date.now()) {
  const idx = record.terms.findIndex((term) => term.term_key === termKey)
  const timestamp = nowIso(nowMs)
  const normalizedMutation = normalizeMutation(mutation)

  if (idx === -1) {
    const copies = Math.max(1, Number(copiesToAdd || 1))
    record.terms.push({
      term_key: termKey,
      copies,
      level: calcLevel(copies),
      best_mutation: normalizedMutation,
      updated_at: timestamp,
    })
    return
  }

  const nextCopies = Number(record.terms[idx].copies || 0) + Math.max(1, Number(copiesToAdd || 1))
  const previousBestMutation = normalizeMutation(record.terms[idx].best_mutation || 'none')
  record.terms[idx] = {
    ...record.terms[idx],
    copies: nextCopies,
    level: calcLevel(nextCopies),
    best_mutation: bestMutation(previousBestMutation, normalizedMutation),
    updated_at: timestamp,
  }
}

function getTermRow(record, termKey) {
  return record.terms.find((term) => term.term_key === termKey)
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

  if (override.mutation && !MUTATIONS.includes(override.mutation)) {
    throw new Error(`Unknown mutation: ${override.mutation}`)
  }

  if (override.tier && (Number(override.tier) < 1 || Number(override.tier) > 6)) {
    throw new Error('Invalid pack tier')
  }
}

function applySinglePackOpen(
  record,
  { source = 'manual', debugOverride = null, debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {},
) {
  validateDebugOverride(debugOverride)

  let forced = debugOverride
  let debugApplied = false

  if (forced && !debugAllowed) {
    throw new Error('Debug override not allowed for this account')
  }

  if (!forced && record.next_reward && debugAllowed) {
    forced = record.next_reward
    record.next_reward = null
    debugApplied = true
  }

  const explicitTier = Number(forced?.tier || 0) || null
  const explicitTerm = forced?.term_key || null

  let drawTier = explicitTier
  let chosenTerm = explicitTerm
  let chosenRarity = forced?.rarity || null
  let chosenMutation = forced?.mutation || null

  if (chosenTerm && !TERMS_BY_KEY[chosenTerm]) {
    throw new Error(`Unknown term key: ${chosenTerm}`)
  }

  if (!drawTier) {
    const tierWeights = getEffectiveTierWeights(record)
    drawTier = Number(pickFromWeightedMap(tierWeights, rng) || 1)
  }

  if (chosenTerm && !explicitTier) {
    drawTier = TERMS_BY_KEY[chosenTerm].tier
  }

  if (!chosenRarity) {
    if (chosenTerm) {
      chosenRarity = TERMS_BY_KEY[chosenTerm].rarity
    } else {
      const rarityWeights = getRarityWeightsForTier(drawTier, record.luck_level)
      chosenRarity = pickFromWeightedMap(rarityWeights, rng) || 'common'
    }
  }

  if (!chosenMutation) {
    const mutationWeights = getMutationWeights(record.mutation_level)
    chosenMutation = pickFromWeightedMap(mutationWeights, rng) || 'none'
  }

  if (!chosenTerm) {
    chosenTerm = randomTermByPool(drawTier, chosenRarity, rng)
  }

  if (!chosenTerm) {
    throw new Error('Unable to resolve draw term')
  }

  const term = TERMS_BY_KEY[chosenTerm]
  const reward = computeCardReward({
    baseBp: term.baseBp,
    rarity: chosenRarity,
    mutation: chosenMutation,
    valueLevel: record.value_level,
  })

  record.coins += reward
  record.packs_opened += 1
  record.eggs_opened = record.packs_opened

  if (source === 'auto') {
    record.auto_opens += 1
  } else {
    record.manual_opens += 1
  }

  upsertTerm(record, chosenTerm, { copiesToAdd: 1, mutation: chosenMutation }, nowMs)
  record.highest_tier_unlocked = getHighestUnlockedTier(record)
  record.updated_at = nowIso(nowMs)

  const termRow = getTermRow(record, chosenTerm)

  return {
    term_key: chosenTerm,
    term_name: term.name,
    rarity: chosenRarity,
    mutation: chosenMutation,
    tier: drawTier,
    reward,
    copies: termRow?.copies || 1,
    level: termRow?.level || 1,
    best_mutation: normalizeMutation(termRow?.best_mutation || chosenMutation),
    source,
    debug_applied: Boolean(debugApplied || forced),
  }
}

function applyAutoProgress(record, { debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {}) {
  const lastTick = Date.parse(record.last_tick_at || nowIso(nowMs))
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - lastTick) / 1000))
  const cappedSeconds = Math.min(BALANCE_CONFIG.idleIncomeCapSeconds, elapsedSeconds)

  let drawsApplied = 0
  let lastDraw = null
  let maxTierDrawn = 0

  if (record.auto_unlocked && cappedSeconds > 0) {
    const openings = record.auto_open_progress + (cappedSeconds * getAutoOpensPerSecond(record))
    const wholeOpens = Math.max(0, Math.floor(openings))
    record.auto_open_progress = openings - wholeOpens

    for (let i = 0; i < wholeOpens; i += 1) {
      lastDraw = applySinglePackOpen(record, {
        source: 'auto',
        debugOverride: null,
        debugAllowed,
        rng,
        nowMs,
      })
      drawsApplied += 1
      maxTierDrawn = Math.max(maxTierDrawn, Number(lastDraw?.tier || 0))
    }
  }

  record.last_tick_at = nowIso(nowMs)
  if (drawsApplied === 0) {
    record.updated_at = nowIso(nowMs)
  }

  return {
    drawsApplied,
    lastDraw,
    maxTierDrawn,
  }
}

function resetProgress(record, nowMs = Date.now()) {
  record.coins = BALANCE_CONFIG.initialCoins
  record.luck_level = 0
  record.mutation_level = 0
  record.value_level = 0
  record.tier_boost_level = 0
  record.auto_unlocked = false
  record.auto_speed_level = 0
  record.highest_tier_unlocked = 1
  record.packs_opened = 0
  record.eggs_opened = 0
  record.manual_opens = 0
  record.auto_opens = 0
  record.auto_open_progress = 0
  record.passive_rate_bp = 0
  record.last_tick_at = nowIso(nowMs)
  record.updated_at = nowIso(nowMs)
  record.terms = []
  record.next_reward = null
}

export function bootstrapLocalPlayer(user, { debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {}) {
  assertAuthenticatedUser(user)

  const record = readRecord(user, rng, nowMs)
  applyAutoProgress(record, { debugAllowed, rng, nowMs })
  record.highest_tier_unlocked = getHighestUnlockedTier(record)
  writeRecord(user, record)

  return toSnapshot(record, debugAllowed, nowMs)
}

export function syncLocalPlayer(user, { debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {}) {
  assertAuthenticatedUser(user)

  const record = readRecord(user, rng, nowMs)
  const { drawsApplied, lastDraw, maxTierDrawn } = applyAutoProgress(record, { debugAllowed, rng, nowMs })
  record.highest_tier_unlocked = getHighestUnlockedTier(record)
  writeRecord(user, record)

  return {
    snapshot: toSnapshot(record, debugAllowed, nowMs),
    draws_applied: drawsApplied,
    draw: lastDraw,
    draw_max_tier: maxTierDrawn,
  }
}

export function openLocalPack(
  user,
  { source = 'manual', debugOverride = null, debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {},
) {
  assertAuthenticatedUser(user)

  const record = readRecord(user, rng, nowMs)
  applyAutoProgress(record, { debugAllowed, rng, nowMs })

  const draw = applySinglePackOpen(record, {
    source,
    debugOverride,
    debugAllowed,
    rng,
    nowMs,
  })

  record.highest_tier_unlocked = getHighestUnlockedTier(record)
  writeRecord(user, record)

  return {
    snapshot: toSnapshot(record, debugAllowed, nowMs),
    draw,
  }
}

export function buyLocalUpgrade(
  user,
  { upgradeKey, debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {},
) {
  assertAuthenticatedUser(user)

  const record = readRecord(user, rng, nowMs)
  applyAutoProgress(record, { debugAllowed, rng, nowMs })

  if (!canBuyUpgrade(record, upgradeKey)) {
    throw new Error('Upgrade unavailable or not enough coins')
  }

  const purchase = applyUpgrade(record, upgradeKey)
  record.updated_at = nowIso(nowMs)
  record.highest_tier_unlocked = getHighestUnlockedTier(record)
  writeRecord(user, record)

  return {
    snapshot: toSnapshot(record, debugAllowed, nowMs),
    purchase,
  }
}

// Backward-compatible aliases.
export function openLocalEgg(
  user,
  { tier = 1, debugOverride = null, debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {},
) {
  const override = debugOverride ? { ...debugOverride } : {}
  if (override.tier == null) {
    override.tier = tier
  }

  return openLocalPack(user, {
    source: 'manual',
    debugOverride: override,
    debugAllowed,
    rng,
    nowMs,
  })
}

export function upgradeLocalLuck(user, { debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {}) {
  return buyLocalUpgrade(user, {
    upgradeKey: 'luck_engine',
    debugAllowed,
    rng,
    nowMs,
  })
}

export function updateLocalNickname(user, parts, { debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {}) {
  assertAuthenticatedUser(user)
  validateNicknameParts(parts)

  const record = readRecord(user, rng, nowMs)
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

export function resetLocalAccount(user, { debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {}) {
  assertAuthenticatedUser(user)

  const record = readRecord(user, rng, nowMs)
  const timestamp = nowIso(nowMs)
  const partA = chooseRandom(NICK_PARTS_A, rng)
  const partB = chooseRandom(NICK_PARTS_B, rng)
  const partC = chooseRandom(NICK_PARTS_C, rng)

  resetProgress(record, nowMs)
  record.profile = {
    nick_part_a: partA,
    nick_part_b: partB,
    nick_part_c: partC,
    display_name: `${partA} ${partB} ${partC}`,
    updated_at: timestamp,
  }
  record.updated_at = timestamp
  writeRecord(user, record)

  return {
    snapshot: toSnapshot(record, debugAllowed, nowMs),
    debug_action: 'reset_account',
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

  const record = readRecord(user, rng, nowMs)
  applyAutoProgress(record, { debugAllowed, rng, nowMs })

  if (actionType === 'add_coins') {
    record.coins += Math.max(0, Number(action.amount || 0))
  } else if (actionType === 'set_coins') {
    record.coins = Math.max(0, Number(action.amount || 0))
  } else if (actionType === 'set_luck_level') {
    record.luck_level = Math.max(0, Number(action.level || 0))
  } else if (actionType === 'set_mutation_level') {
    record.mutation_level = Math.max(0, Number(action.level || 0))
  } else if (actionType === 'set_tier_boost_level') {
    record.tier_boost_level = Math.max(0, Number(action.level || 0))
  } else if (actionType === 'set_auto_speed_level') {
    record.auto_speed_level = Math.max(0, Number(action.level || 0))
  } else if (actionType === 'set_value_level') {
    record.value_level = Math.max(0, Number(action.level || 0))
  } else if (actionType === 'set_auto_unlocked') {
    record.auto_unlocked = Boolean(action.enabled)
  } else if (actionType === 'grant_term') {
    if (!TERMS_BY_KEY[action.term_key]) {
      throw new Error(`Unknown term key: ${action.term_key || ''}`)
    }
    upsertTerm(record, action.term_key, {
      copiesToAdd: Math.max(1, Number(action.copies || 1)),
      mutation: action.best_mutation || action.mutation || 'none',
    }, nowMs)
  } else if (actionType === 'set_next_reward') {
    validateDebugOverride(action)
    const { type: _omit, ...nextReward } = action
    record.next_reward = nextReward
  } else if (actionType === 'buy_upgrade') {
    const key = String(action.upgrade_key || '')
    if (!key) {
      throw new Error('Missing upgrade_key')
    }
    if (!canBuyUpgrade(record, key)) {
      throw new Error('Upgrade unavailable or not enough coins')
    }
    applyUpgrade(record, key)
  } else if (actionType === 'reset_account') {
    resetProgress(record, nowMs)
  } else {
    throw new Error(`Unsupported debug action type: ${actionType}`)
  }

  record.highest_tier_unlocked = getHighestUnlockedTier(record)
  record.eggs_opened = record.packs_opened
  record.updated_at = nowIso(nowMs)
  writeRecord(user, record)

  return {
    snapshot: toSnapshot(record, debugAllowed, nowMs),
    debug_action: actionType,
  }
}
