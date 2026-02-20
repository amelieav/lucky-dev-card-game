import {
  bootstrapPlayer as apiBootstrapPlayer,
  debugApply as apiDebugApply,
  openEgg as apiOpenEgg,
  updateNickname as apiUpdateNickname,
  upgradeLuck as apiUpgradeLuck,
} from '../../services/gameApi'

function normalizeSnapshot(data) {
  if (!data) return null

  if (data.snapshot) {
    return data.snapshot
  }

  return data
}

export default {
  namespaced: true,
  state: () => ({
    loading: false,
    actionLoading: false,
    error: null,
    snapshot: null,
    lastSyncMs: 0,
    openResult: null,
    debugAllowed: false,
  }),
  getters: {
    playerState(state) {
      return state.snapshot?.state || null
    },
    profile(state) {
      return state.snapshot?.profile || null
    },
    terms(state) {
      return state.snapshot?.terms || []
    },
  },
  mutations: {
    setLoading(state, value) {
      state.loading = value
    },
    setActionLoading(state, value) {
      state.actionLoading = value
    },
    setError(state, message) {
      state.error = message || null
    },
    setOpenResult(state, payload) {
      state.openResult = payload || null
    },
    applySnapshot(state, snapshot) {
      state.snapshot = snapshot
      state.lastSyncMs = Date.now()
      state.debugAllowed = !!snapshot?.meta?.debug_allowed
    },
    clear(state) {
      state.loading = false
      state.actionLoading = false
      state.error = null
      state.snapshot = null
      state.lastSyncMs = 0
      state.openResult = null
      state.debugAllowed = false
    },
  },
  actions: {
    async bootstrapPlayer({ commit }) {
      commit('setLoading', true)
      commit('setError', null)

      try {
        const data = await apiBootstrapPlayer()
        const snapshot = normalizeSnapshot(data)
        commit('applySnapshot', snapshot)
      } catch (error) {
        commit('setError', error.message || 'Unable to load player state.')
      } finally {
        commit('setLoading', false)
      }
    },

    async openEgg({ commit, rootState }, { tier, debugOverride = null }) {
      commit('setActionLoading', true)
      commit('setError', null)

      try {
        const override = rootState.debug.enabled ? debugOverride : null
        const data = await apiOpenEgg(tier, override)
        const snapshot = normalizeSnapshot(data)
        commit('applySnapshot', snapshot)
        commit('setOpenResult', data?.draw || null)
      } catch (error) {
        commit('setError', error.message || 'Unable to open egg.')
      } finally {
        commit('setActionLoading', false)
      }
    },

    async upgradeLuck({ commit }) {
      commit('setActionLoading', true)
      commit('setError', null)

      try {
        const data = await apiUpgradeLuck()
        const snapshot = normalizeSnapshot(data)
        commit('applySnapshot', snapshot)
      } catch (error) {
        commit('setError', error.message || 'Unable to upgrade luck.')
      } finally {
        commit('setActionLoading', false)
      }
    },

    async updateNickname({ commit }, parts) {
      commit('setActionLoading', true)
      commit('setError', null)

      try {
        const data = await apiUpdateNickname(parts)
        const snapshot = normalizeSnapshot(data)
        commit('applySnapshot', snapshot)
      } catch (error) {
        commit('setError', error.message || 'Unable to update nickname.')
        throw error
      } finally {
        commit('setActionLoading', false)
      }
    },

    async debugApply({ commit }, action) {
      commit('setActionLoading', true)
      commit('setError', null)
      commit('debug/setLastError', null, { root: true })

      try {
        const data = await apiDebugApply(action)
        const snapshot = normalizeSnapshot(data)
        commit('applySnapshot', snapshot)
        commit('setOpenResult', data?.draw || null)
        commit('debug/setLastResult', data, { root: true })
      } catch (error) {
        const message = error.message || 'Debug action failed.'
        commit('setError', message)
        commit('debug/setLastError', message, { root: true })
      } finally {
        commit('setActionLoading', false)
      }
    },
  },
}
