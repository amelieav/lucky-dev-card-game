import { getDebugFlag, hydrateDebugFlagFromUrl } from '../../lib/debug'

export default {
  namespaced: true,
  state: () => ({
    enabled: false,
    panelOpen: true,
    lastError: null,
    lastResult: null,
  }),
  mutations: {
    setEnabled(state, value) {
      state.enabled = value
    },
    setPanelOpen(state, value) {
      state.panelOpen = value
    },
    setLastError(state, message) {
      state.lastError = message || null
    },
    setLastResult(state, result) {
      state.lastResult = result || null
    },
  },
  actions: {
    hydrate({ commit }) {
      const enabled = hydrateDebugFlagFromUrl() || getDebugFlag()
      commit('setEnabled', enabled)
    },
    togglePanel({ state, commit }) {
      commit('setPanelOpen', !state.panelOpen)
    },
  },
}
