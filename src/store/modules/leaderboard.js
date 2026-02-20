import { fetchLeaderboard } from '../../services/gameApi'

const CACHE_TTL_MS = 5 * 60 * 1000

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
    async fetch({ state, commit }, { force = false, limit = 50 } = {}) {
      const freshEnough = Date.now() - state.lastFetchedAt < CACHE_TTL_MS
      if (!force && freshEnough && state.rows.length > 0) {
        return
      }

      commit('setLoading', true)
      commit('setError', null)

      try {
        const rows = await fetchLeaderboard(limit)
        commit('setRows', rows)
      } catch (error) {
        commit('setError', error.message || 'Unable to load leaderboard.')
      } finally {
        commit('setLoading', false)
      }
    },
  },
}
