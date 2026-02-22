import {
  bootstrapPlayer as apiBootstrapPlayer,
  buyUpgrade as apiBuyUpgrade,
  debugApply as apiDebugApply,
  keepAlive as apiKeepAlive,
  loseCard as apiLoseCard,
  openPack as apiOpenPack,
  resetAccount as apiResetAccount,
  updateNickname as apiUpdateNickname,
} from '../../services/gameApi'
import {
  bootstrapLocalPlayer,
  buyLocalUpgrade,
  debugApplyLocal,
  keepAliveLocalPlayer,
  loseLocalCard,
  openLocalPack,
  resetLocalAccount,
  syncLocalPlayer,
  updateLocalNickname,
} from '../../lib/localEconomy.mjs'

const LOCAL_ECONOMY_ENABLED = import.meta.env.VITE_LOCAL_ECONOMY === '1'
const RECENT_DRAWS_LIMIT = 5
const DUCK_THEFT_STORAGE_PREFIX = 'lucky_agent_duck_theft_v1'
const DUCK_RARITY_RANK = {
  common: 1,
  rare: 2,
  legendary: 3,
}
const DUCK_MUTATION_RANK = {
  none: 1,
  foil: 2,
  holo: 3,
}

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

function defaultDuckTheftStats() {
  return {
    count: 0,
    highest: null,
  }
}

function normalizeDuckTheftRarity(rarity) {
  const key = String(rarity || '').trim().toLowerCase()
  return DUCK_RARITY_RANK[key] ? key : 'common'
}

function normalizeDuckTheftMutation(mutation) {
  const key = String(mutation || '').trim().toLowerCase()
  if (key === 'glitched' || key === 'prismatic') return 'holo'
  return DUCK_MUTATION_RANK[key] ? key : 'none'
}

function parseDuckTheftTimestamp(entry) {
  const parsed = Date.parse(entry?.at || '')
  return Number.isFinite(parsed) ? parsed : 0
}

function isDuckTheftEntryStronger(candidate, incumbent) {
  if (!incumbent) return true
  if (candidate.tier !== incumbent.tier) return candidate.tier > incumbent.tier

  const candidateRarity = DUCK_RARITY_RANK[candidate.rarity] || 1
  const incumbentRarity = DUCK_RARITY_RANK[incumbent.rarity] || 1
  if (candidateRarity !== incumbentRarity) return candidateRarity > incumbentRarity

  const candidateMutation = DUCK_MUTATION_RANK[candidate.mutation] || 1
  const incumbentMutation = DUCK_MUTATION_RANK[incumbent.mutation] || 1
  if (candidateMutation !== incumbentMutation) return candidateMutation > incumbentMutation

  // Keep a stable winner for identical card strength.
  return parseDuckTheftTimestamp(candidate) > parseDuckTheftTimestamp(incumbent)
}

function normalizeDuckTheftEntry(entry) {
  if (!entry || typeof entry !== 'object') return null
  const value = Math.max(0, Number(entry.value || 0))
  return {
    termKey: entry.termKey || null,
    name: entry.name || 'Unknown Card',
    value,
    tier: Math.max(0, Number(entry.tier || 0)),
    rarity: normalizeDuckTheftRarity(entry.rarity),
    mutation: normalizeDuckTheftMutation(entry.mutation || entry.effect),
    at: entry.at || new Date().toISOString(),
  }
}

function normalizeDuckTheftStats(stats) {
  const safe = defaultDuckTheftStats()
  if (!stats || typeof stats !== 'object') return safe

  safe.count = Math.max(0, Number(stats.count || 0))
  safe.highest = normalizeDuckTheftEntry(stats.highest)
  return safe
}

function duckTheftStorageKey(userId) {
  return `${DUCK_THEFT_STORAGE_PREFIX}:${userId}`
}

function readDuckTheftStats(userId) {
  if (!userId) return defaultDuckTheftStats()

  try {
    if (typeof window === 'undefined' || !window.localStorage) return defaultDuckTheftStats()
    const raw = window.localStorage.getItem(duckTheftStorageKey(userId))
    if (!raw) return defaultDuckTheftStats()
    return normalizeDuckTheftStats(JSON.parse(raw))
  } catch (_) {
    return defaultDuckTheftStats()
  }
}

function writeDuckTheftStats(userId, stats) {
  if (!userId) return

  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.setItem(duckTheftStorageKey(userId), JSON.stringify(normalizeDuckTheftStats(stats)))
  } catch (_) {
    // Persistence errors should not break gameplay.
  }
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
    duckTheftStats: defaultDuckTheftStats(),
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
    duckTheftStats(state) {
      return normalizeDuckTheftStats(state.duckTheftStats)
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
    setDuckTheftStats(state, payload) {
      state.duckTheftStats = normalizeDuckTheftStats(payload)
    },
    recordDuckTheft(state, payload) {
      const current = normalizeDuckTheftStats(state.duckTheftStats)
      const nextEntry = normalizeDuckTheftEntry({
        ...payload,
        at: payload?.at || new Date().toISOString(),
      })
      if (!nextEntry) {
        state.duckTheftStats = current
        return
      }

      const next = {
        count: current.count + 1,
        highest: current.highest,
      }

      if (isDuckTheftEntryStronger(nextEntry, current.highest)) {
        next.highest = nextEntry
      }

      state.duckTheftStats = next
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
      state.duckTheftStats = defaultDuckTheftStats()
      state.debugAllowed = false
    },
  },
  actions: {
    hydrateDuckTheftStats({ commit, rootState }) {
      const userId = rootState.auth.user?.id
      commit('setDuckTheftStats', readDuckTheftStats(userId))
    },

    recordDuckTheft({ commit, rootState, state }, payload) {
      commit('recordDuckTheft', payload)
      writeDuckTheftStats(rootState.auth.user?.id, state.duckTheftStats)
    },

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
        commit('setDuckTheftStats', readDuckTheftStats(user?.id))
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

    async loseCard({ commit, rootState }, { termKey } = {}) {
      commit('setActionLoading', true)
      commit('setError', null)

      try {
        const user = rootState.auth.user
        const data = LOCAL_ECONOMY_ENABLED
          ? loseLocalCard(user, { termKey, debugAllowed: rootState.debug.enabled })
          : await apiLoseCard(termKey)

        const snapshot = normalizeSnapshot(data)
        commit('applySnapshot', snapshot)
      } catch (error) {
        commit('setError', error.message || 'Unable to remove card.')
        throw error
      } finally {
        commit('setActionLoading', false)
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
        commit('setDuckTheftStats', defaultDuckTheftStats())
        writeDuckTheftStats(user?.id, defaultDuckTheftStats())
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
