import { createRouter, createWebHashHistory } from 'vue-router'
import store from '../store'
import SignIn from '../views/SignIn.vue'
import AuthCallback from '../views/AuthCallback.vue'
import Game from '../views/Game.vue'
import Leaderboard from '../views/Leaderboard.vue'
import LifetimeCollection from '../views/LifetimeCollection.vue'
import Profile from '../views/Profile.vue'
import NotFound from '../views/NotFound.vue'
import { hasAuthParamsInUrl } from '../lib/auth'

const routes = [
  {
    path: '/',
    name: 'SignIn',
    component: SignIn,
  },
  {
    path: '/game',
    name: 'Game',
    component: Game,
    meta: { requiresAuth: true },
  },
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: AuthCallback,
  },
  {
    path: '/auth/confirm',
    name: 'AuthConfirm',
    component: AuthCallback,
  },
  {
    path: '/login',
    redirect: '/',
  },
  {
    path: '/leaderboard',
    name: 'Leaderboard',
    component: Leaderboard,
    meta: { requiresAuth: true },
  },
  {
    path: '/lifetime',
    name: 'LifetimeCollection',
    component: LifetimeCollection,
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
  },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  if (!store.state.auth.initialized) {
    await store.dispatch('debug/hydrate')
    await store.dispatch('auth/initAuth')
  }

  const isAuthenticated = !!store.state.auth.user

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'SignIn' }
  }

  if (to.name === 'NotFound' && hasAuthParamsInUrl()) {
    return { name: 'AuthCallback' }
  }

  if (to.name === 'NotFound' && isAuthenticated) {
    return { name: 'Game' }
  }

  if (to.name === 'SignIn' && isAuthenticated) {
    return { name: 'Game' }
  }

  return true
})

export default router
