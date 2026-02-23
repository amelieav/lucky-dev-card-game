import {
  fetchLeaderboard,
  fetchSeasonHistory as apiFetchSeasonHistory,
  submitNameReport as apiSubmitNameReport,
} from '../../services/gameApi'
import { getLocalSeasonHistory } from '../../lib/localEconomy.mjs'
import { TERMS_BY_KEY } from '../../data/terms'
import { getEffectiveTierForLayer, normalizeLayer } from '../../lib/packLogic.mjs'

const CACHE_TTL_MS = 5 * 60 * 1000
const LOCAL_ECONOMY_ENABLED = import.meta.env.VITE_LOCAL_ECONOMY === '1'
const LEADERBOARD_RETRY_DELAY_MS = 350
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

function isTransientTimeoutError(error) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('timed out') || message.includes('timeout')
}

function wait(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, Math.max(0, Number(ms || 0)))
  })
}

async function fetchLeaderboardWithRetry(limit) {
  try {
    return await fetchLeaderboard(limit)
  } catch (error) {
    if (!isTransientTimeoutError(error)) {
      throw error
    }

    await wait(LEADERBOARD_RETRY_DELAY_MS)
    return fetchLeaderboard(limit)
  }
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

function latestSeasonHistoryRank(snapshot) {
  const rows = Array.isArray(snapshot?.season_history) ? snapshot.season_history : []
  if (!rows.length) return null
  return Math.max(1, Number(rows[0]?.rank || 1))
}

function buildLocalBestCardRow(snapshot) {
  const stateRow = snapshot?.state
  const profile = snapshot?.profile
  const terms = Array.isArray(snapshot?.terms) ? snapshot.terms : []
  const season = snapshot?.season || null
  const activeLayer = normalizeLayer(stateRow?.active_layer || 1)

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
        tier: getEffectiveTierForLayer(Number(term.tier || 1), activeLayer),
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
    viewer_previous_rank: latestSeasonHistoryRank(snapshot),
    season_id: season?.id || null,
    season_starts_at: season?.starts_at || null,
    season_ends_at: season?.ends_at || null,
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
    viewer_previous_rank: row?.viewer_previous_rank == null ? null : Math.max(1, Number(row.viewer_previous_rank)),
    season_id: row?.season_id || null,
    season_starts_at: row?.season_starts_at || null,
    season_ends_at: row?.season_ends_at || null,
    is_you: Boolean(row?.is_you),
  }))
}

function normalizeSeasonHistoryRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    season_id: row?.season_id || null,
    starts_at: row?.starts_at || null,
    ends_at: row?.ends_at || null,
    rank: Math.max(1, Number(row?.rank || 1)),
    total_players: Math.max(1, Number(row?.total_players || 1)),
    score: Number(row?.score || 0),
    best_term_key: row?.best_term_key || null,
    best_term_name: row?.best_term_name || null,
    best_term_tier: Math.max(0, Number(row?.best_term_tier || 0)),
    best_term_rarity: normalizeRarity(row?.best_term_rarity),
    best_term_mutation: normalizeMutation(row?.best_term_mutation),
    best_term_copies: Math.max(0, Number(row?.best_term_copies || 0)),
    first_place_name: row?.first_place_name || null,
    first_place_score: Math.max(0, Number(row?.first_place_score || 0)),
    second_place_name: row?.second_place_name || null,
    second_place_score: Math.max(0, Number(row?.second_place_score || 0)),
    third_place_name: row?.third_place_name || null,
    third_place_score: Math.max(0, Number(row?.third_place_score || 0)),
  }))
}

export default {
  namespaced: true,
  state: () => ({
    rows: [],
    seasonHistory: [],
    seasonInfo: null,
    viewerPreviousRank: null,
    loading: false,
    historyLoading: false,
    error: null,
    historyError: null,
    lastFetchedAt: 0,
  }),
  mutations: {
    setRows(state, rows) {
      state.rows = Array.isArray(rows) ? rows : []
      state.lastFetchedAt = Date.now()
      const seasonFromRow = state.rows.find((row) => row?.season_id)
      state.seasonInfo = seasonFromRow
        ? {
            id: seasonFromRow.season_id,
            startsAt: seasonFromRow.season_starts_at,
            endsAt: seasonFromRow.season_ends_at,
          }
        : null
      state.viewerPreviousRank = seasonFromRow?.viewer_previous_rank || null
    },
    setSeasonHistory(state, rows) {
      state.seasonHistory = Array.isArray(rows) ? rows : []
    },
    setLoading(state, value) {
      state.loading = value
    },
    setHistoryLoading(state, value) {
      state.historyLoading = value
    },
    setError(state, message) {
      state.error = message || null
    },
    setHistoryError(state, message) {
      state.historyError = message || null
    },
    clear(state) {
      state.rows = []
      state.seasonHistory = []
      state.seasonInfo = null
      state.viewerPreviousRank = null
      state.loading = false
      state.historyLoading = false
      state.error = null
      state.historyError = null
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
          rows = await fetchLeaderboardWithRetry(limit)
        }

        commit('setRows', normalizeRows(rows))
      } catch (error) {
        if (isTransientTimeoutError(error) && state.rows.length > 0) {
          // Keep stale but valid rows and avoid flashing a transient fetch error.
          commit('setError', null)
          return
        }

        commit('setError', error.message || 'Unable to load leaderboard.')
      } finally {
        commit('setLoading', false)
      }
    },

    async fetchSeasonHistory({ commit, rootState }, { limit = 200 } = {}) {
      commit('setHistoryLoading', true)
      commit('setHistoryError', null)

      try {
        if (!rootState.game?.capabilities?.supports_season_history) {
          commit('setSeasonHistory', [])
          return
        }

        let rows
        if (LOCAL_ECONOMY_ENABLED) {
          const user = rootState.auth.user
          rows = user?.id ? getLocalSeasonHistory(user, { limit }) : []
        } else {
          rows = await apiFetchSeasonHistory(limit)
        }

        commit('setSeasonHistory', normalizeSeasonHistoryRows(rows))
      } catch (error) {
        commit('setHistoryError', error.message || 'Unable to load season history.')
      } finally {
        commit('setHistoryLoading', false)
      }
    },

    async submitNameReport({ rootState }, { reportedName, details = '' } = {}) {
      const normalizedName = String(reportedName || '').trim()
      const normalizedDetails = String(details || '').trim()

      if (!normalizedName) {
        throw new Error('Please provide the reported name.')
      }

      if (LOCAL_ECONOMY_ENABLED) {
        return {
          ok: true,
          submitted_at: new Date().toISOString(),
          reported_name: normalizedName,
          details: normalizedDetails,
          local_only: true,
          reporter_user_id: rootState.auth.user?.id || null,
        }
      }

      return apiSubmitNameReport({
        reportedName: normalizedName,
        details: normalizedDetails,
      })
    },
  },
}
