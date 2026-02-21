import { supabase } from '../../lib/supabase'
import {
  getAccessTokenFromUrl,
  cleanupAuthParamsFromUrl,
  getCodeFromUrl,
  getMagicLinkRedirectTo,
  getOtpTypeFromUrl,
  getRefreshTokenFromUrl,
  getTokenHashFromUrl,
} from '../../lib/auth'

let authListener = null
let initAuthPromise = null

export default {
  namespaced: true,
  state: () => ({
    initialized: false,
    loading: false,
    session: null,
    user: null,
    error: null,
    magicLinkSent: false,
  }),
  mutations: {
    setInitialized(state, value) {
      state.initialized = value
    },
    setLoading(state, value) {
      state.loading = value
    },
    setSession(state, session) {
      state.session = session
      state.user = session?.user || null
    },
    setError(state, message) {
      state.error = message || null
    },
    setMagicLinkSent(state, value) {
      state.magicLinkSent = value
    },
    clear(state) {
      state.session = null
      state.user = null
      state.error = null
      state.magicLinkSent = false
    },
  },
  actions: {
    async initAuth({ state, commit, dispatch }) {
      if (state.initialized) {
        return
      }

      if (initAuthPromise) {
        return initAuthPromise
      }

      initAuthPromise = (async () => {
        commit('setLoading', true)
        commit('setError', null)

        try {
          const code = getCodeFromUrl()
          const tokenHash = getTokenHashFromUrl()
          const otpType = getOtpTypeFromUrl()
          const accessToken = getAccessTokenFromUrl()
          const refreshToken = getRefreshTokenFromUrl()

          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
            if (exchangeError) {
              throw exchangeError
            }
            cleanupAuthParamsFromUrl()
          } else if (tokenHash && otpType) {
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: otpType,
            })

            if (verifyError) {
              throw verifyError
            }

            cleanupAuthParamsFromUrl()
          } else if (accessToken && refreshToken) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (setSessionError) {
              throw setSessionError
            }

            cleanupAuthParamsFromUrl()
          }

          const { data, error } = await supabase.auth.getSession()
          if (error) {
            throw error
          }

          commit('setSession', data?.session || null)

          if (!authListener) {
            const { data: listener } = supabase.auth.onAuthStateChange(async (_, session) => {
              commit('setSession', session)
              if (session?.user) {
                await dispatch('game/bootstrapPlayer', null, { root: true })
              } else {
                commit('game/clear', null, { root: true })
                commit('leaderboard/clear', null, { root: true })
              }
            })
            authListener = listener
          }

          if (data?.session?.user) {
            await dispatch('game/bootstrapPlayer', null, { root: true })
          }
        } catch (error) {
          commit('setError', error.message || 'Unable to initialize authentication.')
        } finally {
          commit('setInitialized', true)
          commit('setLoading', false)
          initAuthPromise = null
        }
      })()

      return initAuthPromise
    },

    async sendMagicLink({ commit }, email) {
      commit('setLoading', true)
      commit('setError', null)
      commit('setMagicLinkSent', false)

      try {
        const redirectTo = getMagicLinkRedirectTo()
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
          },
        })

        if (error) {
          throw error
        }

        commit('setMagicLinkSent', true)
      } catch (error) {
        commit('setError', error.message || 'Unable to send magic link.')
      } finally {
        commit('setLoading', false)
      }
    },

    async signOut({ commit }) {
      commit('setLoading', true)
      commit('setError', null)

      try {
        const { error } = await supabase.auth.signOut({
          scope: 'local',
        })

        if (error) {
          throw error
        }
      } catch (error) {
        commit('setError', error.message || 'Unable to sign out from Supabase.')
      } finally {
        // Always clear local state so user is signed out in-app even if remote sign-out fails.
        commit('clear')
        commit('game/clear', null, { root: true })
        commit('leaderboard/clear', null, { root: true })
        commit('setInitialized', false)
        commit('setLoading', false)
      }
    },
  },
}
