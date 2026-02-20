import {
  bootstrapPlayer as apiBootstrapPlayer,
  debugApply as apiDebugApply,
  openEgg as apiOpenEgg,
  updateNickname as apiUpdateNickname,
  upgradeLuck as apiUpgradeLuck,
} from '../../services/gameApi'
import {
  bootstrapLocalPlayer,
  debugApplyLocal,
  openLocalEgg,
  updateLocalNickname,
  upgradeLocalLuck,
} from '../../lib/localEconomy.mjs'

const LOCAL_ECONOMY_ENABLED = import.meta.env.VITE_LOCAL_ECONOMY === '1'

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
    async bootstrapPlayer({ commit, rootState }) {
      commit('setLoading', true)
      commit('setError', null)

      try {
        const user = rootState.auth.user
        const data = LOCAL_ECONOMY_ENABLED
          ? bootstrapLocalPlayer(user, { debugAllowed: rootState.debug.enabled })
          : await apiBootstrapPlayer()
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
        const user = rootState.auth.user
        const override = rootState.debug.enabled ? debugOverride : null
        const data = LOCAL_ECONOMY_ENABLED
          ? openLocalEgg(user, {
              tier,
              debugOverride: override,
              debugAllowed: rootState.debug.enabled,
            })
          : await apiOpenEgg(tier, override)
        const snapshot = normalizeSnapshot(data)
        commit('applySnapshot', snapshot)
        commit('setOpenResult', data?.draw || null)
      } catch (error) {
        commit('setError', error.message || 'Unable to open egg.')
      } finally {
        commit('setActionLoading', false)
      }
    },

    async upgradeLuck({ commit, rootState }) {
      commit('setActionLoading', true)
      commit('setError', null)

      try {
        const user = rootState.auth.user
        const data = LOCAL_ECONOMY_ENABLED
          ? upgradeLocalLuck(user, { debugAllowed: rootState.debug.enabled })
          : await apiUpgradeLuck()
        const snapshot = normalizeSnapshot(data)
        commit('applySnapshot', snapshot)
      } catch (error) {
        commit('setError', error.message || 'Unable to upgrade luck.')
      } finally {
        commit('setActionLoading', false)
      }
    },

    async updateNickname({ commit, rootState }, parts) {
      commit('setActionLoading', true)
      commit('setError', null)

      try {
        const user = rootState.auth.user
        const data = LOCAL_ECONOMY_ENABLED
          ? updateLocalNickname(user, parts, { debugAllowed: rootState.debug.enabled })
          : await apiUpdateNickname(parts)
        const snapshot = normalizeSnapshot(data)
        commit('applySnapshot', snapshot)
      } catch (error) {
        commit('setError', error.message || 'Unable to update nickname.')
        throw error
      } finally {
        commit('setActionLoading', false)
      }
    },

    async debugApply({ commit, rootState }, action) {
      commit('setActionLoading', true)
      commit('setError', null)
      commit('debug/setLastError', null, { root: true })

      try {
        const user = rootState.auth.user
        const data = LOCAL_ECONOMY_ENABLED
          ? debugApplyLocal(user, action, { debugAllowed: rootState.debug.enabled })
          : await apiDebugApply(action)
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
