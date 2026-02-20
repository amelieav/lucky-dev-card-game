import {
  bootstrapPlayer as apiBootstrapPlayer,
  buyUpgrade as apiBuyUpgrade,
  debugApply as apiDebugApply,
  openPack as apiOpenPack,
  updateNickname as apiUpdateNickname,
} from '../../services/gameApi'
import {
  bootstrapLocalPlayer,
  buyLocalUpgrade,
  debugApplyLocal,
  openLocalPack,
  syncLocalPlayer,
  updateLocalNickname,
} from '../../lib/localEconomy.mjs'

const LOCAL_ECONOMY_ENABLED = import.meta.env.VITE_LOCAL_ECONOMY !== '0'

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
    economyMode: LOCAL_ECONOMY_ENABLED ? 'local' : 'server',
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

    async syncPlayer({ commit, rootState }) {
      if (!LOCAL_ECONOMY_ENABLED) return

      try {
        const user = rootState.auth.user
        if (!user?.id) return

        const data = syncLocalPlayer(user, { debugAllowed: rootState.debug.enabled })
        const snapshot = normalizeSnapshot(data)
        commit('applySnapshot', snapshot)

        if (data?.draw) {
          commit('setOpenResult', data.draw)
        }
      } catch (error) {
        commit('setError', error.message || 'Unable to sync player state.')
      }
    },

    async openPack({ commit, rootState }, { source = 'manual', debugOverride = null } = {}) {
      commit('setActionLoading', true)
      commit('setError', null)

      try {
        const user = rootState.auth.user
        const override = rootState.debug.enabled ? debugOverride : null
        const data = LOCAL_ECONOMY_ENABLED
          ? openLocalPack(user, {
              source,
              debugOverride: override,
              debugAllowed: rootState.debug.enabled,
            })
          : await apiOpenPack({ source, debugOverride: override })
        const snapshot = normalizeSnapshot(data)
        commit('applySnapshot', snapshot)
        commit('setOpenResult', data?.draw || null)
      } catch (error) {
        commit('setError', error.message || 'Unable to open pack.')
      } finally {
        commit('setActionLoading', false)
      }
    },

    async buyUpgrade({ commit, rootState }, { upgradeKey }) {
      commit('setActionLoading', true)
      commit('setError', null)

      try {
        const user = rootState.auth.user
        const data = LOCAL_ECONOMY_ENABLED
          ? buyLocalUpgrade(user, {
              upgradeKey,
              debugAllowed: rootState.debug.enabled,
            })
          : await apiBuyUpgrade({ upgradeKey })
        const snapshot = normalizeSnapshot(data)
        commit('applySnapshot', snapshot)
      } catch (error) {
        commit('setError', error.message || 'Unable to buy upgrade.')
      } finally {
        commit('setActionLoading', false)
      }
    },

    // Backward-compatible actions.
    async openEgg({ dispatch }, { tier = 1, debugOverride = null } = {}) {
      const override = {
        ...(debugOverride || {}),
      }
      if (override.tier == null) {
        override.tier = tier
      }

      return dispatch('openPack', { source: 'manual', debugOverride: override })
    },

    async upgradeLuck({ dispatch }) {
      return dispatch('buyUpgrade', { upgradeKey: 'luck_engine' })
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
