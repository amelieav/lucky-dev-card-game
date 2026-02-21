import { fetchLeaderboard } from '../../services/gameApi'
import { TERMS_BY_KEY } from '../../data/terms'

const CACHE_TTL_MS = 5 * 60 * 1000
const LOCAL_ECONOMY_ENABLED = import.meta.env.VITE_LOCAL_ECONOMY === '1'
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

function normalizeRarity(rarity) {
  const key = String(rarity || '').trim().toLowerCase()
  return RARITY_RANK[key] ? key : 'common'
}

function normalizeMutation(mutation) {
  const key = String(mutation || '').trim().toLowerCase()
  if (key === 'glitched' || key === 'prismatic') return 'holo'
  return MUTATION_RANK[key] ? key : 'none'
}

function compareBestCard(a, b) {
  if (a.best_term_tier !== b.best_term_tier) return b.best_term_tier - a.best_term_tier

  const aRarityRank = RARITY_RANK[a.best_term_rarity] || 1
  const bRarityRank = RARITY_RANK[b.best_term_rarity] || 1
  if (aRarityRank !== bRarityRank) return bRarityRank - aRarityRank

  const aMutationRank = MUTATION_RANK[a.best_term_mutation] || 1
  const bMutationRank = MUTATION_RANK[b.best_term_mutation] || 1
  if (aMutationRank !== bMutationRank) return bMutationRank - aMutationRank

  if (a.best_term_copies !== b.best_term_copies) return b.best_term_copies - a.best_term_copies
  return 0
}

function buildLocalBestCardRow(snapshot) {
  const stateRow = snapshot?.state
  const profile = snapshot?.profile
  const terms = Array.isArray(snapshot?.terms) ? snapshot.terms : []

  if (!stateRow) {
    return null
  }

  const mapped = terms
    .map((termRow) => {
      const term = TERMS_BY_KEY[termRow.term_key]
      if (!term) return null
      return {
        term_key: term.key,
        term_name: term.name,
        tier: Number(term.tier || 0),
        rarity: normalizeRarity(term.rarity),
        mutation: normalizeMutation(termRow.best_mutation),
        copies: Math.max(0, Number(termRow.copies || 0)),
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      const compare = compareBestCard(
        {
          best_term_tier: a.tier,
          best_term_rarity: a.rarity,
          best_term_mutation: a.mutation,
          best_term_copies: a.copies,
        },
        {
          best_term_tier: b.tier,
          best_term_rarity: b.rarity,
          best_term_mutation: b.mutation,
          best_term_copies: b.copies,
        },
      )
      if (compare !== 0) return compare
      return a.term_key.localeCompare(b.term_key)
    })

  const best = mapped[0] || null

  return {
    rank: 1,
    total_players: 1,
    user_id: profile?.user_id || null,
    display_name: profile?.display_name || 'Local Player',
    score: Number(stateRow?.coins || 0),
    value_level: Number(stateRow?.value_level || stateRow?.luck_level || 0),
    highest_tier_unlocked: Number(stateRow?.highest_tier_unlocked || 1),
    updated_at: stateRow?.updated_at,
    player_number: 1,
    best_term_key: best?.term_key || null,
    best_term_name: best?.term_name || null,
    best_term_tier: Number(best?.tier || 0),
    best_term_rarity: best?.rarity || 'common',
    best_term_mutation: best?.mutation || 'none',
    best_term_copies: Number(best?.copies || 0),
    viewer_player_number: 1,
    is_you: true,
  }
}

function normalizeRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    rank: Math.max(1, Number(row?.rank || index + 1)),
    total_players: Math.max(1, Number(row?.total_players || 1)),
    user_id: row?.user_id || null,
    display_name: row?.display_name || 'Unknown Player',
    score: Number(row?.score || 0),
    value_level: Number(row?.value_level || row?.luck_level || 0),
    highest_tier_unlocked: Number(row?.highest_tier_unlocked || 1),
    updated_at: row?.updated_at || null,
    player_number: Math.max(1, Number(row?.player_number || 1)),
    best_term_key: row?.best_term_key || null,
    best_term_name: row?.best_term_name || null,
    best_term_tier: Math.max(0, Number(row?.best_term_tier || 0)),
    best_term_rarity: normalizeRarity(row?.best_term_rarity),
    best_term_mutation: normalizeMutation(row?.best_term_mutation),
    best_term_copies: Math.max(0, Number(row?.best_term_copies || 0)),
    viewer_player_number: row?.viewer_player_number == null ? null : Math.max(1, Number(row.viewer_player_number)),
    is_you: Boolean(row?.is_you),
  }))
}

export default {
  namespaced: true,
  state: () => ({
    rows: [],
    loading: false,
    error: null,
    lastFetchedAt: 0,
  }),
  mutations: {
    setRows(state, rows) {
      state.rows = Array.isArray(rows) ? rows : []
      state.lastFetchedAt = Date.now()
    },
    setLoading(state, value) {
      state.loading = value
    },
    setError(state, message) {
      state.error = message || null
    },
    clear(state) {
      state.rows = []
      state.loading = false
      state.error = null
      state.lastFetchedAt = 0
    },
  },
  actions: {
    async fetch({ state, commit, rootState }, { force = false, limit = 50 } = {}) {
      const freshEnough = Date.now() - state.lastFetchedAt < CACHE_TTL_MS
      if (!force && freshEnough && state.rows.length > 0) {
        return
      }

      commit('setLoading', true)
      commit('setError', null)

      try {
        let rows

        if (LOCAL_ECONOMY_ENABLED) {
          const snapshot = rootState.game.snapshot
          const localRow = buildLocalBestCardRow(snapshot)
          rows = localRow ? [localRow] : []
        } else {
          rows = await fetchLeaderboard(limit)
        }

        commit('setRows', normalizeRows(rows))
      } catch (error) {
        commit('setError', error.message || 'Unable to load leaderboard.')
      } finally {
        commit('setLoading', false)
      }
    },
  },
}
