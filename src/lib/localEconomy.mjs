import { NICK_PARTS_A, NICK_PARTS_B, NICK_PARTS_C } from '../data/nicknameParts.mjs'
import { TERMS, TERMS_BY_KEY } from '../data/terms.mjs'
import { BALANCE_CONFIG } from './balanceConfig.mjs'
import { validateDisplayName } from './displayNameValidation.mjs'
import {
  RARITIES,
  applyUpgrade,
  bestMutation,
  canBuyUpgrade,
  computeCardReward,
  getBaseTierFromEffectiveTier,
  getAutoOpensPerSecond,
  getEffectiveTierWeights,
  getEffectiveTierForLayer,
  getHighestUnlockedTier,
  MISSING_CARD_GIFT_COST,
  normalizeLayer,
  getMutationWeights,
  getPassiveIncomeSummaryFromTerms,
  getRarityWeightsForTier,
  normalizeMutation,
  pickFromWeightedMap,
} from './packLogic.mjs'

const STORAGE_PREFIX = 'lucky_agent_local_pack_economy_v1'
const LEGACY_STORAGE_PREFIX = 'lucky_agent_local_economy_v1'
const ACTIVE_WINDOW_SECONDS = 15
const DEFAULT_SEASON_DURATION_MS = 7 * 24 * 60 * 60 * 1000
const MAX_REBIRTHS = 1
const MAX_ACTIVE_LAYER = MAX_REBIRTHS + 1
const memoryStorage = new Map()

const TERMS_TOTAL = TERMS.length
const RARITY_RANK = {
  common: 1,
  rare: 2,
  legendary: 3,
}
const MUTATION_RANK = {
  none: 1,
  foil: 2,
  holo: 3,
}

// Local economy is a development fallback and not the authoritative runtime.
const LOCAL_RUNTIME_CAPABILITIES = Object.freeze({
  supports_rebirth: false,
  supports_lifetime_collection: false,
  supports_season_history: false,
  economy_version: 'local-dev-fallback',
  config: {},
})

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

function normalizeActiveLayer(value) {
  return Math.max(1, Math.min(MAX_ACTIVE_LAYER, normalizeLayer(value)))
}

function chooseRandom(values, rng = Math.random) {
  return values[Math.floor(rng() * values.length)]
}

function generateDefaultDisplayName(partA, partB, partC) {
  const candidates = [
    `${partA}_${partB}`,
    `${partA}_${partC}`,
    `${partB}_${partC}`,
    `${partA}${partB}`,
  ]

  for (const candidate of candidates) {
    const check = validateDisplayName(candidate)
    if (check.ok) return check.value
  }

  return `Player_${Math.floor(Math.random() * 9000) + 1000}`
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

function toInt(value, fallback = 0) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.floor(n)
}

function seasonDurationMs() {
  const envValue = typeof import.meta !== 'undefined' && import.meta?.env
    ? import.meta.env.VITE_SEASON_DURATION_MS
    : null
  const parsed = Number(envValue)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SEASON_DURATION_MS
  }
  return Math.max(1_000, Math.floor(parsed))
}

function toIsoDateUTC(timestampMs) {
  return new Date(timestampMs).toISOString().slice(0, 10)
}

function mondaySeasonWindow(nowMs = Date.now()) {
  const now = new Date(nowMs)
  const midnightUtcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const day = now.getUTCDay()
  const offsetDays = (day + 6) % 7
  const startsAtMs = midnightUtcMs - (offsetDays * 24 * 60 * 60 * 1000)
  const endsAtMs = startsAtMs + DEFAULT_SEASON_DURATION_MS
  return {
    id: `week-${toIsoDateUTC(startsAtMs)}`,
    starts_at: nowIso(startsAtMs),
    ends_at: nowIso(endsAtMs),
  }
}

function intervalSeasonWindow(nowMs = Date.now(), durationMs) {
  const safeDuration = Math.max(1_000, Math.floor(Number(durationMs || DEFAULT_SEASON_DURATION_MS)))
  const startsAtMs = Math.floor(nowMs / safeDuration) * safeDuration
  const endsAtMs = startsAtMs + safeDuration
  return {
    id: `interval-${safeDuration}-${startsAtMs}`,
    starts_at: nowIso(startsAtMs),
    ends_at: nowIso(endsAtMs),
  }
}

function getCurrentSeasonWindow(nowMs = Date.now()) {
  const durationMs = seasonDurationMs()
  if (durationMs === DEFAULT_SEASON_DURATION_MS) {
    return mondaySeasonWindow(nowMs)
  }
  return intervalSeasonWindow(nowMs, durationMs)
}

function normalizeRarity(rarity) {
  const key = String(rarity || '').trim().toLowerCase()
  return RARITY_RANK[key] ? key : 'common'
}

function normalizeLifetimeEntry(entry, nowMs = Date.now()) {
  if (!entry || typeof entry !== 'object') return null
  const termKey = String(entry.term_key || '').trim()
  if (!TERMS_BY_KEY[termKey]) return null
  const layer = normalizeActiveLayer(toInt(entry.layer, 1))
  const firstCollectedAtMs = Date.parse(entry.first_collected_at || '')
  const lastCollectedAtMs = Date.parse(entry.last_collected_at || '')
  return {
    layer,
    term_key: termKey,
    copies: Math.max(1, toInt(entry.copies, 1)),
    best_mutation: normalizeMutation(entry.best_mutation || 'none'),
    first_collected_at: Number.isFinite(firstCollectedAtMs) ? nowIso(firstCollectedAtMs) : nowIso(nowMs),
    last_collected_at: Number.isFinite(lastCollectedAtMs) ? nowIso(lastCollectedAtMs) : nowIso(nowMs),
  }
}

function normalizeStolenEntry(entry, nowMs = Date.now()) {
  if (!entry || typeof entry !== 'object') return null
  const termKey = String(entry.term_key || '').trim()
  if (!TERMS_BY_KEY[termKey]) return null
  const layer = normalizeActiveLayer(toInt(entry.layer, 1))
  const stolenAtMs = Date.parse(entry.stolen_at || '')
  return {
    layer,
    term_key: termKey,
    stolen_at: Number.isFinite(stolenAtMs) ? nowIso(stolenAtMs) : nowIso(nowMs),
  }
}

function uniqueLifetimeEntries(entries, nowMs = Date.now()) {
  const byKey = new Map()
  for (const entry of Array.isArray(entries) ? entries : []) {
    const normalized = normalizeLifetimeEntry(entry, nowMs)
    if (!normalized) continue
    const key = `${normalized.layer}:${normalized.term_key}`
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, normalized)
      continue
    }

    const firstMs = Math.min(
      Date.parse(existing.first_collected_at || '') || Date.now(),
      Date.parse(normalized.first_collected_at || '') || Date.now(),
    )
    const lastMs = Math.max(
      Date.parse(existing.last_collected_at || '') || 0,
      Date.parse(normalized.last_collected_at || '') || 0,
    )

    byKey.set(key, {
      ...existing,
      copies: Math.max(1, Number(existing.copies || 1)) + Math.max(1, Number(normalized.copies || 1)),
      best_mutation: bestMutation(existing.best_mutation, normalized.best_mutation),
      first_collected_at: nowIso(firstMs),
      last_collected_at: nowIso(lastMs || Date.now()),
    })
  }

  return Array.from(byKey.values()).sort((a, b) => {
    if (a.layer !== b.layer) return a.layer - b.layer
    return a.term_key.localeCompare(b.term_key)
  })
}

function uniqueStolenEntries(entries, nowMs = Date.now()) {
  const seen = new Set()
  const result = []
  for (const entry of Array.isArray(entries) ? entries : []) {
    const normalized = normalizeStolenEntry(entry, nowMs)
    if (!normalized) continue
    const key = `${normalized.layer}:${normalized.term_key}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
  }

  return result.sort((a, b) => {
    if (a.layer !== b.layer) return a.layer - b.layer
    return a.term_key.localeCompare(b.term_key)
  })
}

function normalizeSeason(raw, nowMs = Date.now()) {
  const fallback = getCurrentSeasonWindow(nowMs)
  if (!raw || typeof raw !== 'object') {
    return fallback
  }

  const startsAtMs = Date.parse(raw.starts_at || '')
  const endsAtMs = Date.parse(raw.ends_at || '')
  return {
    id: String(raw.id || fallback.id),
    starts_at: Number.isFinite(startsAtMs) ? nowIso(startsAtMs) : fallback.starts_at,
    ends_at: Number.isFinite(endsAtMs) ? nowIso(endsAtMs) : fallback.ends_at,
  }
}

function normalizeSeasonHistoryEntry(entry, nowMs = Date.now()) {
  if (!entry || typeof entry !== 'object') return null

  const seasonId = String(entry.season_id || '').trim()
  if (!seasonId) return null

  const startsAtMs = Date.parse(entry.starts_at || '')
  const endsAtMs = Date.parse(entry.ends_at || '')
  const recordedAtMs = Date.parse(entry.recorded_at || '')

  return {
    season_id: seasonId,
    starts_at: Number.isFinite(startsAtMs) ? nowIso(startsAtMs) : nowIso(nowMs),
    ends_at: Number.isFinite(endsAtMs) ? nowIso(endsAtMs) : nowIso(nowMs),
    rank: Math.max(1, toInt(entry.rank, 1)),
    total_players: Math.max(1, toInt(entry.total_players, 1)),
    score: Math.max(0, Number(entry.score || 0)),
    best_term_key: entry.best_term_key || null,
    best_term_name: entry.best_term_name || null,
    best_term_tier: Math.max(0, toInt(entry.best_term_tier, 0)),
    best_term_rarity: normalizeRarity(entry.best_term_rarity),
    best_term_mutation: normalizeMutation(entry.best_term_mutation || 'none'),
    best_term_copies: Math.max(0, toInt(entry.best_term_copies, 0)),
    first_place_name: entry.first_place_name || null,
    first_place_score: Math.max(0, Number(entry.first_place_score || 0)),
    second_place_name: entry.second_place_name || null,
    second_place_score: Math.max(0, Number(entry.second_place_score || 0)),
    third_place_name: entry.third_place_name || null,
    third_place_score: Math.max(0, Number(entry.third_place_score || 0)),
    viewer_previous_rank: entry.viewer_previous_rank == null ? null : Math.max(1, toInt(entry.viewer_previous_rank, 1)),
    recorded_at: Number.isFinite(recordedAtMs) ? nowIso(recordedAtMs) : nowIso(nowMs),
  }
}

function normalizeSeasonHistory(entries, nowMs = Date.now()) {
  const seen = new Set()
  const result = []
  for (const entry of Array.isArray(entries) ? entries : []) {
    const normalized = normalizeSeasonHistoryEntry(entry, nowMs)
    if (!normalized) continue
    if (seen.has(normalized.season_id)) continue
    seen.add(normalized.season_id)
    result.push(normalized)
  }

  return result.sort((a, b) => {
    const aEnd = Date.parse(a.ends_at || '')
    const bEnd = Date.parse(b.ends_at || '')
    if (Number.isFinite(aEnd) && Number.isFinite(bEnd) && bEnd !== aEnd) {
      return bEnd - aEnd
    }
    return b.season_id.localeCompare(a.season_id)
  })
}

function buildDefaultRecord(user, rng = Math.random, nowMs = Date.now()) {
  const partA = chooseRandom(NICK_PARTS_A, rng)
  const partB = chooseRandom(NICK_PARTS_B, rng)
  const partC = chooseRandom(NICK_PARTS_C, rng)
  const timestamp = nowIso(nowMs)

  return {
    coins: BALANCE_CONFIG.initialCoins,
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
    passive_rate_cps: 0,
    rebirth_count: 0,
    active_layer: 1,
    active_until_at: timestamp,
    last_tick_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
    season: getCurrentSeasonWindow(nowMs),
    season_history: [],
    terms: [],
    lifetime_terms: [],
    stolen_terms: [],
    profile: {
      nick_part_a: partA,
      nick_part_b: partB,
      nick_part_c: partC,
      display_name: generateDefaultDisplayName(partA, partB, partC),
      name_customized: false,
      updated_at: timestamp,
    },
    next_reward: null,
  }
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

function buildLifetimeSummary(record) {
  const lifetime = uniqueLifetimeEntries(record.lifetime_terms || [])
  const byLayer = new Map()
  const cards = []
  const highestByLayer = new Map()

  for (const entry of lifetime) {
    if (Number(entry.layer || 1) > MAX_ACTIVE_LAYER) continue

    const set = byLayer.get(entry.layer) || new Set()
    set.add(entry.term_key)
    byLayer.set(entry.layer, set)

    const term = TERMS_BY_KEY[entry.term_key]
    if (!term) continue

    const card = {
      layer: entry.layer,
      term_key: entry.term_key,
      term_name: term.name,
      tier: getEffectiveTierForLayer(Number(term.tier || 1), entry.layer),
      rarity: normalizeRarity(term.rarity),
      best_mutation: normalizeMutation(entry.best_mutation),
      copies: Math.max(1, Number(entry.copies || 1)),
      first_collected_at: entry.first_collected_at,
      last_collected_at: entry.last_collected_at || entry.first_collected_at,
    }
    cards.push(card)

    const currentHighest = highestByLayer.get(entry.layer)
    if (!currentHighest || compareBestCard(currentHighest, {
      term_key: card.term_key,
      tier: card.tier,
      rarity: card.rarity,
      mutation: card.best_mutation,
      copies: card.copies,
    }) > 0) {
      highestByLayer.set(entry.layer, {
        term_key: card.term_key,
        term_name: card.term_name,
        tier: card.tier,
        rarity: card.rarity,
        best_mutation: card.best_mutation,
        copies: card.copies,
      })
    }
  }

  const knownLayers = Array.from(byLayer.keys())
  knownLayers.push(normalizeActiveLayer(record.active_layer))
  const maxLayer = Math.min(MAX_ACTIVE_LAYER, Math.max(...knownLayers))
  const perLayer = []
  for (let layer = 1; layer <= maxLayer; layer += 1) {
    const collected = byLayer.get(layer)?.size || 0
    perLayer.push({
      layer,
      collected,
      total: TERMS_TOTAL,
    })
  }

  cards.sort((a, b) => {
    if (a.layer !== b.layer) return a.layer - b.layer
    if (a.tier !== b.tier) return a.tier - b.tier
    return a.term_key.localeCompare(b.term_key)
  })

  const highest_per_layer = Array.from(highestByLayer.entries())
    .map(([layer, row]) => ({
      layer,
      ...row,
    }))
    .sort((a, b) => a.layer - b.layer)

  return {
    total_unique: lifetime.length,
    per_layer: perLayer,
    cards,
    highest_per_layer,
  }
}

function currentLayerStolenTermKeys(record) {
  const activeLayer = normalizeActiveLayer(record.active_layer)
  return uniqueStolenEntries(record.stolen_terms || [])
    .filter((entry) => entry.layer === activeLayer)
    .map((entry) => entry.term_key)
}

function compareBestCard(a, b) {
  if (!b) return -1
  if (!a) return 1

  if (a.tier !== b.tier) return b.tier - a.tier

  const aRarityRank = RARITY_RANK[a.rarity] || 1
  const bRarityRank = RARITY_RANK[b.rarity] || 1
  if (aRarityRank !== bRarityRank) return bRarityRank - aRarityRank

  const aMutationRank = MUTATION_RANK[a.mutation] || 1
  const bMutationRank = MUTATION_RANK[b.mutation] || 1
  if (aMutationRank !== bMutationRank) return bMutationRank - aMutationRank

  if (a.copies !== b.copies) return b.copies - a.copies
  return a.term_key.localeCompare(b.term_key)
}

function buildBestCardFromTerms(terms = [], activeLayer = 1) {
  const candidates = (terms || []).map((row) => {
    const term = TERMS_BY_KEY[row.term_key]
    if (!term) return null
    return {
      term_key: term.key,
      term_name: term.name,
      tier: getEffectiveTierForLayer(Number(term.tier || 1), activeLayer),
      rarity: normalizeRarity(term.rarity),
      mutation: normalizeMutation(row.best_mutation),
      copies: Math.max(0, Number(row.copies || 0)),
    }
  }).filter(Boolean)

  if (!candidates.length) return null
  candidates.sort(compareBestCard)
  return candidates[0]
}

function latestSeasonHistoryRow(record) {
  const rows = normalizeSeasonHistory(record.season_history || [])
  return rows[0] || null
}

function buildSeasonArchiveRow(record, nowMs = Date.now()) {
  const best = buildBestCardFromTerms(record.terms, normalizeActiveLayer(record.active_layer))
  const displayName = String(record?.profile?.display_name || 'Local Player').trim() || 'Local Player'
  return {
    season_id: record.season?.id || `legacy-${nowMs}`,
    starts_at: record.season?.starts_at || nowIso(nowMs),
    ends_at: record.season?.ends_at || nowIso(nowMs),
    rank: 1,
    total_players: 1,
    score: Math.max(0, Number(record.coins || 0)),
    best_term_key: best?.term_key || null,
    best_term_name: best?.term_name || null,
    best_term_tier: Number(best?.tier || 0),
    best_term_rarity: best?.rarity || 'common',
    best_term_mutation: best?.mutation || 'none',
    best_term_copies: Number(best?.copies || 0),
    first_place_name: displayName,
    first_place_score: Math.max(0, Number(record.coins || 0)),
    second_place_name: null,
    second_place_score: 0,
    third_place_name: null,
    third_place_score: 0,
    viewer_previous_rank: 1,
    recorded_at: nowIso(nowMs),
  }
}

function archiveCurrentSeason(record, nowMs = Date.now()) {
  if (!record?.season?.id) return

  const row = buildSeasonArchiveRow(record, nowMs)
  const existing = normalizeSeasonHistory(record.season_history || [])
  const deduped = existing.filter((entry) => entry.season_id !== row.season_id)
  record.season_history = normalizeSeasonHistory([row, ...deduped], nowMs)
}

function resetProgress(record, {
  nowMs = Date.now(),
  clearCurrentTerms = true,
  resetRebirth = false,
} = {}) {
  record.coins = BALANCE_CONFIG.initialCoins
  record.mutation_level = 0
  record.value_level = 0
  record.luck_level = 0
  record.tier_boost_level = 0
  record.auto_unlocked = false
  record.auto_speed_level = 0
  record.packs_opened = 0
  record.eggs_opened = 0
  record.manual_opens = 0
  record.auto_opens = 0
  record.auto_open_progress = 0
  record.passive_rate_cps = 0
  record.active_until_at = nowIso(nowMs)
  record.last_tick_at = nowIso(nowMs)
  record.updated_at = nowIso(nowMs)
  record.next_reward = null

  if (clearCurrentTerms) {
    record.terms = []
  }

  if (resetRebirth) {
    record.rebirth_count = 0
    record.active_layer = 1
  }

  const activeLayer = normalizeActiveLayer(record.active_layer)
  record.stolen_terms = uniqueStolenEntries(record.stolen_terms || [], nowMs)
    .filter((entry) => entry.layer !== activeLayer)

  record.highest_tier_unlocked = getHighestUnlockedTier(record)
}

function ensureSeasonState(record, nowMs = Date.now()) {
  const current = getCurrentSeasonWindow(nowMs)
  record.season = normalizeSeason(record.season, nowMs)

  if (record.season.id === current.id) {
    return false
  }

  archiveCurrentSeason(record, nowMs)
  resetProgress(record, {
    nowMs,
    clearCurrentTerms: true,
    resetRebirth: true,
  })
  record.season = current
  record.updated_at = nowIso(nowMs)
  return true
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
    lifetime_terms: Array.isArray(record.lifetime_terms) ? record.lifetime_terms : [],
    stolen_terms: Array.isArray(record.stolen_terms) ? record.stolen_terms : [],
    season_history: Array.isArray(record.season_history) ? record.season_history : [],
  }

  if (merged.profile?.name_customized == null) {
    // Preserve behavior for existing local profiles created before this flag.
    merged.profile.name_customized = true
  } else {
    merged.profile.name_customized = Boolean(merged.profile.name_customized)
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
  merged.mutation_level = Math.max(0, Number(merged.mutation_level || 0))
  merged.value_level = Math.max(0, Number((merged.value_level ?? merged.luck_level) || 0))
  merged.luck_level = merged.value_level
  merged.coins = Math.max(0, Number(merged.coins || 0))
  merged.rebirth_count = Math.max(0, Math.min(MAX_REBIRTHS, Number(merged.rebirth_count || 0)))
  merged.active_layer = normalizeActiveLayer(merged.active_layer)
  merged.auto_unlocked = Boolean(merged.auto_unlocked)

  const activeUntilMs = Date.parse(merged.active_until_at || '')
  merged.active_until_at = Number.isFinite(activeUntilMs) ? nowIso(activeUntilMs) : nowIso(nowMs)

  merged.terms = merged.terms.map((row) => sanitizeTermRow(row))
  merged.lifetime_terms = uniqueLifetimeEntries(merged.lifetime_terms, nowMs)
  merged.stolen_terms = uniqueStolenEntries(merged.stolen_terms, nowMs)
  merged.season = normalizeSeason(merged.season, nowMs)
  merged.season_history = normalizeSeasonHistory(merged.season_history, nowMs)

  if (merged.lifetime_terms.length === 0 && merged.terms.length > 0) {
    const migratedLifetime = merged.terms.map((row) => ({
      layer: 1,
      term_key: row.term_key,
      copies: Math.max(1, Number(row.copies || 1)),
      best_mutation: normalizeMutation(row.best_mutation || 'none'),
      first_collected_at: nowIso(nowMs),
      last_collected_at: nowIso(nowMs),
    }))
    merged.lifetime_terms = uniqueLifetimeEntries(migratedLifetime, nowMs)
  }

  merged.highest_tier_unlocked = getHighestUnlockedTier(merged)
  merged.passive_rate_cps = Math.max(0, Number(merged.passive_rate_cps || 0))

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

function toSnapshot(record, debugAllowed, nowMs = Date.now()) {
  const passiveSummary = getPassiveIncomeSummaryFromTerms(record.terms)
  record.passive_rate_cps = passiveSummary.totalRate

  return {
    state: {
      coins: record.coins,
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
      passive_rate_bp: passiveSummary.totalRate * 100,
      passive_rate_cps: passiveSummary.totalRate,
      passive_foil_cards: passiveSummary.foilCards,
      passive_holo_cards: passiveSummary.holoCards,
      auto_open_progress: record.auto_open_progress,
      active_until_at: record.active_until_at,
      last_tick_at: record.last_tick_at,
      updated_at: record.updated_at,
      rebirth_count: record.rebirth_count,
      active_layer: record.active_layer,
    },
    profile: { ...record.profile },
    terms: sortTerms(record.terms),
    season: { ...record.season },
    stolen_terms: currentLayerStolenTermKeys(record),
    lifetime: buildLifetimeSummary(record),
    season_history: normalizeSeasonHistory(record.season_history || []),
    meta: {
      server_now: nowIso(nowMs),
      debug_allowed: Boolean(debugAllowed),
      local_mode: true,
      season_duration_ms: seasonDurationMs(),
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

function addLifetimeCollect(record, termKey, { copiesToAdd = 1, mutation = 'none' } = {}, nowMs = Date.now()) {
  const activeLayer = normalizeActiveLayer(record.active_layer)
  const key = `${activeLayer}:${termKey}`
  const entries = uniqueLifetimeEntries(record.lifetime_terms || [], nowMs)
  const idx = entries.findIndex((entry) => `${entry.layer}:${entry.term_key}` === key)

  if (idx === -1) {
    entries.push({
      layer: activeLayer,
      term_key: termKey,
      copies: Math.max(1, Number(copiesToAdd || 1)),
      best_mutation: normalizeMutation(mutation),
      first_collected_at: nowIso(nowMs),
      last_collected_at: nowIso(nowMs),
    })
  } else {
    entries[idx] = {
      ...entries[idx],
      copies: Math.max(1, Number(entries[idx].copies || 1)) + Math.max(1, Number(copiesToAdd || 1)),
      best_mutation: bestMutation(entries[idx].best_mutation, normalizeMutation(mutation)),
      last_collected_at: nowIso(nowMs),
    }
  }

  record.lifetime_terms = uniqueLifetimeEntries(entries, nowMs)
}

function clearStolenMarker(record, termKey, nowMs = Date.now()) {
  const activeLayer = normalizeActiveLayer(record.active_layer)
  record.stolen_terms = uniqueStolenEntries(record.stolen_terms || [], nowMs)
    .filter((entry) => !(entry.layer === activeLayer && entry.term_key === termKey))
}

function markStolenMarker(record, termKey, nowMs = Date.now()) {
  const activeLayer = normalizeActiveLayer(record.active_layer)
  const existing = uniqueStolenEntries(record.stolen_terms || [], nowMs)
  const key = `${activeLayer}:${termKey}`
  if (existing.some((entry) => `${entry.layer}:${entry.term_key}` === key)) {
    record.stolen_terms = existing
    return
  }

  existing.push({
    layer: activeLayer,
    term_key: termKey,
    stolen_at: nowIso(nowMs),
  })
  record.stolen_terms = uniqueStolenEntries(existing, nowMs)
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
    addLifetimeCollect(record, termKey, {
      copiesToAdd: copies,
      mutation: normalizedMutation,
    }, nowMs)
    clearStolenMarker(record, termKey, nowMs)
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
  addLifetimeCollect(record, termKey, {
    copiesToAdd: Math.max(1, Number(copiesToAdd || 1)),
    mutation: normalizedMutation,
  }, nowMs)
  clearStolenMarker(record, termKey, nowMs)
}

function getTermRow(record, termKey) {
  return record.terms.find((term) => term.term_key === termKey)
}

function validateNicknameParts(parts) {
  if (!NICK_PARTS_A.includes(parts.partA)) throw new Error('Invalid nickname part A')
  if (!NICK_PARTS_B.includes(parts.partB)) throw new Error('Invalid nickname part B')
  if (!NICK_PARTS_C.includes(parts.partC)) throw new Error('Invalid nickname part C')
}

function resolveRequestedDisplayName(parts = {}) {
  if (parts && typeof parts === 'object' && typeof parts.displayName === 'string') {
    const direct = String(parts.displayName || '').trim()
    if (direct) return direct
  }

  if (parts && typeof parts === 'object' && parts.partA && parts.partB && parts.partC) {
    validateNicknameParts(parts)
    return `${parts.partA}_${parts.partB}_${parts.partC}`
  }

  throw new Error('Missing display name')
}

function validateDebugOverride(override) {
  if (!override || typeof override !== 'object') return

  if (override.term_key && !TERMS_BY_KEY[override.term_key]) {
    throw new Error(`Unknown term key: ${override.term_key}`)
  }

  if (override.rarity && !RARITIES.includes(override.rarity)) {
    throw new Error(`Unknown rarity: ${override.rarity}`)
  }

  if (override.mutation) {
    const normalized = normalizeMutation(override.mutation)
    const rawMutation = String(override.mutation || '').trim().toLowerCase()
    if (normalized === 'none' && rawMutation !== 'none') {
      throw new Error(`Unknown mutation: ${override.mutation}`)
    }
  }

  if (override.tier && Number(override.tier) < 1) {
    throw new Error('Invalid pack tier')
  }
}

function clampActiveWindowSeconds(windowSeconds = ACTIVE_WINDOW_SECONDS) {
  return Math.max(5, Math.min(120, Math.floor(Number(windowSeconds || ACTIVE_WINDOW_SECONDS))))
}

function touchRecordActivity(record, { nowMs = Date.now(), windowSeconds = ACTIVE_WINDOW_SECONDS } = {}) {
  const windowMs = clampActiveWindowSeconds(windowSeconds) * 1000
  const currentActiveUntilMs = Date.parse(record.active_until_at || '')
  const fallbackActiveUntilMs = nowMs
  const activeUntilMs = Number.isFinite(currentActiveUntilMs) ? currentActiveUntilMs : fallbackActiveUntilMs
  const nextActiveUntilMs = Math.max(activeUntilMs, nowMs + windowMs)
  record.active_until_at = nowIso(nextActiveUntilMs)
}

function activeElapsedSeconds(record, nowMs = Date.now()) {
  const lastTickMs = Date.parse(record.last_tick_at || nowIso(nowMs))
  if (!Number.isFinite(lastTickMs)) return 0

  const activeUntilMs = Date.parse(record.active_until_at || '')
  const effectiveNowMs = Number.isFinite(activeUntilMs)
    ? Math.min(nowMs, activeUntilMs)
    : nowMs

  return Math.max(0, Math.floor((effectiveNowMs - lastTickMs) / 1000))
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

  const activeLayer = normalizeActiveLayer(record.active_layer)
  const explicitTier = Number(forced?.tier || 0) || null
  const explicitTerm = forced?.term_key || null

  let drawTier = explicitTier
  let chosenTerm = explicitTerm
  let chosenRarity = forced?.rarity || null
  let chosenMutation = forced?.mutation || null

  if (chosenTerm && !TERMS_BY_KEY[chosenTerm]) {
    throw new Error(`Unknown term key: ${chosenTerm}`)
  }

  if (drawTier) {
    const normalizedTier = Math.max(1, Number(drawTier))
    drawTier = normalizedTier > 6
      ? getBaseTierFromEffectiveTier(normalizedTier)
      : normalizedTier
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
      const rarityWeights = getRarityWeightsForTier(drawTier, record.value_level)
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
  const effectiveTier = getEffectiveTierForLayer(drawTier, activeLayer)

  return {
    term_key: chosenTerm,
    term_name: term.name,
    rarity: chosenRarity,
    mutation: chosenMutation,
    tier: effectiveTier,
    reward,
    copies: termRow?.copies || 1,
    level: termRow?.level || 1,
    best_mutation: normalizeMutation(termRow?.best_mutation || chosenMutation),
    source,
    debug_applied: Boolean(debugApplied || forced),
    layer: activeLayer,
  }
}

function applyAutoProgress(record, {
  debugAllowed = false,
  rng = Math.random,
  nowMs = Date.now(),
  allowAutoDraws = true,
} = {}) {
  const elapsedSeconds = activeElapsedSeconds(record, nowMs)
  const cappedSeconds = Math.min(BALANCE_CONFIG.idleIncomeCapSeconds, elapsedSeconds)
  const passiveSummary = getPassiveIncomeSummaryFromTerms(record.terms)

  let drawsApplied = 0
  let lastDraw = null
  let maxTierDrawn = 0

  if (cappedSeconds > 0 && passiveSummary.totalRate > 0) {
    record.coins += passiveSummary.totalRate * cappedSeconds
  }

  if (allowAutoDraws && record.auto_unlocked && cappedSeconds > 0) {
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
  record.passive_rate_cps = passiveSummary.totalRate

  return {
    drawsApplied,
    lastDraw,
    maxTierDrawn,
  }
}

function prepareRecord(user, { debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {}) {
  const record = readRecord(user, rng, nowMs)
  const changed = ensureSeasonState(record, nowMs)
  if (changed) {
    record.updated_at = nowIso(nowMs)
  }
  applyAutoProgress(record, {
    debugAllowed,
    rng,
    nowMs,
    allowAutoDraws: false,
  })
  return record
}

function currentCollectionComplete(record) {
  const collected = new Set(record.terms.map((row) => row.term_key))
  return collected.size >= TERMS_TOTAL
}

function currentCollectionMissingTerms(record) {
  const collected = new Set((record.terms || []).map((row) => row.term_key))
  return TERMS.filter((term) => !collected.has(term.key))
}

export function bootstrapLocalPlayer(user, { debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {}) {
  assertAuthenticatedUser(user)

  const record = readRecord(user, rng, nowMs)
  ensureSeasonState(record, nowMs)
  applyAutoProgress(record, { debugAllowed, rng, nowMs })
  touchRecordActivity(record, { nowMs })
  record.highest_tier_unlocked = getHighestUnlockedTier(record)
  writeRecord(user, record)

  return toSnapshot(record, debugAllowed, nowMs)
}

export function getLocalRuntimeCapabilities() {
  return { ...LOCAL_RUNTIME_CAPABILITIES }
}

export function syncLocalPlayer(user, { debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {}) {
  assertAuthenticatedUser(user)

  const record = readRecord(user, rng, nowMs)
  ensureSeasonState(record, nowMs)
  const { drawsApplied, lastDraw, maxTierDrawn } = applyAutoProgress(record, { debugAllowed, rng, nowMs })
  touchRecordActivity(record, { nowMs })
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
  {
    source = 'manual',
    debugOverride = null,
    debugAllowed = false,
    allowAutoProgress = true,
    rng = Math.random,
    nowMs = Date.now(),
  } = {},
) {
  assertAuthenticatedUser(user)

  const record = readRecord(user, rng, nowMs)
  ensureSeasonState(record, nowMs)
  if (source !== 'auto' && allowAutoProgress) {
    applyAutoProgress(record, { debugAllowed, rng, nowMs })
  } else {
    applyAutoProgress(record, {
      debugAllowed,
      rng,
      nowMs,
      allowAutoDraws: false,
    })
  }
  touchRecordActivity(record, { nowMs })

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
  ensureSeasonState(record, nowMs)
  applyAutoProgress(record, { debugAllowed, rng, nowMs })
  touchRecordActivity(record, { nowMs })

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

export function buyLocalMissingCardGift(
  user,
  { debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {},
) {
  assertAuthenticatedUser(user)

  const record = readRecord(user, rng, nowMs)
  ensureSeasonState(record, nowMs)
  applyAutoProgress(record, { debugAllowed, rng, nowMs })
  touchRecordActivity(record, { nowMs })

  if (Number(record.coins || 0) < MISSING_CARD_GIFT_COST) {
    throw new Error('Not enough coins')
  }

  const missingTerms = currentCollectionMissingTerms(record)
  if (!missingTerms.length) {
    throw new Error('Current collection is already complete')
  }

  const chosenTerm = chooseRandom(missingTerms, rng)
  record.coins = Number(record.coins || 0) - MISSING_CARD_GIFT_COST
  upsertTerm(record, chosenTerm.key, { copiesToAdd: 1, mutation: 'none' }, nowMs)
  record.updated_at = nowIso(nowMs)
  record.highest_tier_unlocked = getHighestUnlockedTier(record)
  writeRecord(user, record)

  const termRow = getTermRow(record, chosenTerm.key)
  const activeLayer = normalizeActiveLayer(record.active_layer)

  return {
    snapshot: toSnapshot(record, debugAllowed, nowMs),
    gift: {
      term_key: chosenTerm.key,
      term_name: chosenTerm.name,
      rarity: chosenTerm.rarity,
      mutation: 'none',
      tier: getEffectiveTierForLayer(Number(chosenTerm.tier || 1), activeLayer),
      reward: 0,
      copies: termRow?.copies || 1,
      level: termRow?.level || 1,
      best_mutation: normalizeMutation(termRow?.best_mutation || 'none'),
      source: 'shop_gift',
      debug_applied: false,
      layer: activeLayer,
    },
  }
}

export function rebirthLocalPlayer(user, { debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {}) {
  assertAuthenticatedUser(user)

  const record = prepareRecord(user, { debugAllowed, rng, nowMs })

  if (!currentCollectionComplete(record)) {
    throw new Error(`Rebirth requires full collection (${TERMS_TOTAL}/${TERMS_TOTAL}) in current layer`)
  }

  if (Number(record.rebirth_count || 0) >= MAX_REBIRTHS) {
    throw new Error('Rebirth already used for this season')
  }

  const fromLayer = normalizeActiveLayer(record.active_layer)
  record.rebirth_count = Math.min(MAX_REBIRTHS, Math.max(0, Number(record.rebirth_count || 0)) + 1)
  record.active_layer = MAX_ACTIVE_LAYER

  resetProgress(record, {
    nowMs,
    clearCurrentTerms: true,
    resetRebirth: false,
  })

  touchRecordActivity(record, { nowMs })
  record.updated_at = nowIso(nowMs)
  writeRecord(user, record)

  return {
    snapshot: toSnapshot(record, debugAllowed, nowMs),
    rebirth: {
      rebirth_count: record.rebirth_count,
      from_layer: fromLayer,
      to_layer: record.active_layer,
    },
  }
}

export function getLocalLifetimeCollection(user, { rng = Math.random, nowMs = Date.now() } = {}) {
  assertAuthenticatedUser(user)
  const record = readRecord(user, rng, nowMs)
  ensureSeasonState(record, nowMs)
  writeRecord(user, record)
  return buildLifetimeSummary(record)
}

export function getLocalSeasonHistory(user, { limit = 200, rng = Math.random, nowMs = Date.now() } = {}) {
  assertAuthenticatedUser(user)
  const record = readRecord(user, rng, nowMs)
  ensureSeasonState(record, nowMs)
  writeRecord(user, record)

  const rows = normalizeSeasonHistory(record.season_history || [])
  return rows.slice(0, Math.max(1, Math.min(500, Number(limit || 200))))
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
    upgradeKey: 'value_upgrade',
    debugAllowed,
    rng,
    nowMs,
  })
}

export function updateLocalNickname(user, parts, { debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {}) {
  assertAuthenticatedUser(user)
  const requestedName = resolveRequestedDisplayName(parts)
  const validation = validateDisplayName(requestedName)
  if (!validation.ok) {
    throw new Error(validation.message || 'Invalid display name')
  }

  const record = readRecord(user, rng, nowMs)
  ensureSeasonState(record, nowMs)
  touchRecordActivity(record, { nowMs })
  const timestamp = nowIso(nowMs)

  record.profile = {
    ...(record.profile || {}),
    display_name: validation.value,
    name_customized: true,
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

  resetProgress(record, {
    nowMs,
    clearCurrentTerms: true,
    resetRebirth: true,
  })
  record.lifetime_terms = []
  record.stolen_terms = []
  record.season_history = []
  record.season = getCurrentSeasonWindow(nowMs)
  record.profile = {
    nick_part_a: partA,
    nick_part_b: partB,
    nick_part_c: partC,
    display_name: generateDefaultDisplayName(partA, partB, partC),
    name_customized: false,
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
  ensureSeasonState(record, nowMs)
  applyAutoProgress(record, { debugAllowed, rng, nowMs })
  touchRecordActivity(record, { nowMs })

  if (actionType === 'add_coins') {
    record.coins += Math.max(0, Number(action.amount || 0))
  } else if (actionType === 'set_coins') {
    record.coins = Math.max(0, Number(action.amount || 0))
  } else if (actionType === 'set_luck_level') {
    record.value_level = Math.max(0, Number(action.level || 0))
    record.luck_level = record.value_level
  } else if (actionType === 'set_mutation_level') {
    record.mutation_level = Math.max(0, Number(action.level || 0))
  } else if (actionType === 'set_tier_boost_level') {
    record.tier_boost_level = Math.max(0, Number(action.level || 0))
  } else if (actionType === 'set_auto_speed_level') {
    record.auto_speed_level = Math.max(0, Number(action.level || 0))
  } else if (actionType === 'set_value_level') {
    record.value_level = Math.max(0, Number(action.level || 0))
    record.luck_level = record.value_level
  } else if (actionType === 'set_auto_unlocked') {
    record.auto_unlocked = Boolean(action.enabled)
  } else if (actionType === 'grant_full_set') {
    record.coins = Math.max(0, Number(action.amount ?? action.coins ?? 200_000))
    for (const term of TERMS) {
      const existing = record.terms.find((row) => row.term_key === term.key)
      if (!existing) {
        upsertTerm(record, term.key, { copiesToAdd: 1, mutation: 'none' }, nowMs)
      } else {
        clearStolenMarker(record, term.key, nowMs)
      }
    }
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
  } else if (actionType === 'rebirth') {
    if (!currentCollectionComplete(record)) {
      throw new Error(`Rebirth requires full collection (${TERMS_TOTAL}/${TERMS_TOTAL}) in current layer`)
    }
    if (Number(record.rebirth_count || 0) >= MAX_REBIRTHS) {
      throw new Error('Rebirth already used for this season')
    }
    record.rebirth_count = Math.min(MAX_REBIRTHS, Math.max(0, Number(record.rebirth_count || 0)) + 1)
    record.active_layer = MAX_ACTIVE_LAYER
    resetProgress(record, {
      nowMs,
      clearCurrentTerms: true,
      resetRebirth: false,
    })
  } else if (actionType === 'reset_account') {
    resetProgress(record, {
      nowMs,
      clearCurrentTerms: true,
      resetRebirth: true,
    })
    record.lifetime_terms = []
    record.stolen_terms = []
    record.season_history = []
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

export function loseLocalCard(user, { termKey, debugAllowed = false, rng = Math.random, nowMs = Date.now() } = {}) {
  assertAuthenticatedUser(user)

  const targetKey = String(termKey || '').trim()
  if (!targetKey) {
    throw new Error('Missing term key')
  }

  const record = readRecord(user, rng, nowMs)
  ensureSeasonState(record, nowMs)
  applyAutoProgress(record, {
    debugAllowed,
    rng,
    nowMs,
    allowAutoDraws: false,
  })
  touchRecordActivity(record, { nowMs })

  const idx = record.terms.findIndex((row) => row.term_key === targetKey)
  if (idx === -1) {
    return {
      snapshot: toSnapshot(record, debugAllowed, nowMs),
      loss: {
        term_key: targetKey,
        removed: false,
      },
    }
  }

  record.terms.splice(idx, 1)
  markStolenMarker(record, targetKey, nowMs)
  record.highest_tier_unlocked = getHighestUnlockedTier(record)
  record.updated_at = nowIso(nowMs)
  writeRecord(user, record)

  return {
    snapshot: toSnapshot(record, debugAllowed, nowMs),
    loss: {
      term_key: targetKey,
      removed: true,
    },
  }
}

export function keepAliveLocalPlayer(
  user,
  { debugAllowed = false, rng = Math.random, nowMs = Date.now(), windowSeconds = ACTIVE_WINDOW_SECONDS } = {},
) {
  assertAuthenticatedUser(user)

  const record = readRecord(user, rng, nowMs)
  ensureSeasonState(record, nowMs)
  applyAutoProgress(record, {
    debugAllowed,
    rng,
    nowMs,
    allowAutoDraws: false,
  })
  touchRecordActivity(record, { nowMs, windowSeconds })
  record.highest_tier_unlocked = getHighestUnlockedTier(record)
  writeRecord(user, record)

  return {
    snapshot: toSnapshot(record, debugAllowed, nowMs),
    draws_applied: 0,
    draw: null,
    draw_max_tier: 0,
  }
}
