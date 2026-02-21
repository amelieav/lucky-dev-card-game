import {
  bootstrapPlayer as apiBootstrapPlayer,
  buyUpgrade as apiBuyUpgrade,
  debugApply as apiDebugApply,
  keepAlive as apiKeepAlive,
  openPack as apiOpenPack,
  resetAccount as apiResetAccount,
  updateNickname as apiUpdateNickname,
} from '../../services/gameApi'
import {
  bootstrapLocalPlayer,
  buyLocalUpgrade,
  debugApplyLocal,
  keepAliveLocalPlayer,
  openLocalPack,
  resetLocalAccount,
  syncLocalPlayer,
  updateLocalNickname,
} from '../../lib/localEconomy.mjs'

const LOCAL_ECONOMY_ENABLED = import.meta.env.VITE_LOCAL_ECONOMY === '1'
const RECENT_DRAWS_LIMIT = 5

function normalizeSnapshot(data) {
  if (!data) return null

  if (data.snapshot) {
    return data.snapshot
  }

  return data
}

function isSameDraw(a, b) {
  if (!a || !b) return false
  const keys = ['term_key', 'tier', 'rarity', 'mutation', 'reward', 'copies', 'level', 'source']
  return keys.every((key) => a[key] === b[key])
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
    recentDraws: [],
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
      const draw = payload || null
      state.openResult = draw

      if (!draw) return
      if (isSameDraw(state.recentDraws[0], draw)) return

      state.recentDraws = [draw, ...state.recentDraws].slice(0, RECENT_DRAWS_LIMIT)
    },
    setRecentDraws(state, payload) {
      state.recentDraws = Array.isArray(payload) ? payload.slice(0, RECENT_DRAWS_LIMIT) : []
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
      state.recentDraws = []
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

    async keepAlive({ commit, rootState }) {
      try {
        const user = rootState.auth.user
        if (!user?.id) return

        const data = LOCAL_ECONOMY_ENABLED
          ? keepAliveLocalPlayer(user, { debugAllowed: rootState.debug.enabled })
          : await apiKeepAlive()
        if (!data) return

        const snapshot = normalizeSnapshot(data)
        commit('applySnapshot', snapshot)

        if (data?.draw) {
          commit('setOpenResult', data.draw)
        }
      } catch (_) {
        // Keep-alive must be non-disruptive; explicit actions surface actionable errors.
      }
    },

    async openPack({ commit, rootState }, { source = 'manual', debugOverride = null, pauseAutoProgress = false } = {}) {
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
              allowAutoProgress: !pauseAutoProgress,
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

    async resetAccount({ commit, rootState }) {
      commit('setActionLoading', true)
      commit('setError', null)

      try {
        const user = rootState.auth.user
        const data = LOCAL_ECONOMY_ENABLED
          ? resetLocalAccount(user, { debugAllowed: rootState.debug.enabled })
          : await apiResetAccount()
        const snapshot = normalizeSnapshot(data)
        commit('applySnapshot', snapshot)
        commit('setOpenResult', null)
        commit('setRecentDraws', [])
      } catch (error) {
        commit('setError', error.message || 'Unable to reset account.')
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
      return dispatch('buyUpgrade', { upgradeKey: 'value_upgrade' })
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
