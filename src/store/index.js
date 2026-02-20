import { createStore } from 'vuex'
import auth from './modules/auth'
import game from './modules/game'
import leaderboard from './modules/leaderboard'
import debug from './modules/debug'

export default createStore({
  modules: {
    auth,
    game,
    leaderboard,
    debug,
  },
})
