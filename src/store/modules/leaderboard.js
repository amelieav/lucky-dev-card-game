import { fetchLeaderboard } from '../../services/gameApi'

const CACHE_TTL_MS = 5 * 60 * 1000
const LOCAL_ECONOMY_ENABLED = import.meta.env.VITE_LOCAL_ECONOMY === '1'

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
          const stateRow = snapshot?.state
          const profile = snapshot?.profile

          rows = stateRow
            ? [{
                rank: 1,
                display_name: profile?.display_name || 'Local Player',
                score: Number(stateRow?.coins || 0),
                value_level: Number(stateRow?.value_level || stateRow?.luck_level || 0),
                highest_tier_unlocked: Number(stateRow?.highest_tier_unlocked || 1),
                updated_at: stateRow?.updated_at,
              }]
            : []
        } else {
          rows = await fetchLeaderboard(limit)
        }

        commit('setRows', rows)
      } catch (error) {
        commit('setError', error.message || 'Unable to load leaderboard.')
      } finally {
        commit('setLoading', false)
      }
    },
  },
}
