<template>
  <header class="app-nav border-b border-soft bg-panel">
    <div class="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
      <div class="flex items-center gap-3">
        <div class="brand-badge h-8 w-8 rounded-lg grid place-items-center text-sm font-semibold" aria-hidden="true">
          <vue-feather type="code" size="14" stroke-width="2.5"></vue-feather>
        </div>
        <div>
          <p class="text-sm font-semibold tracking-wide text-main">Lucky Agent</p>
          <p class="text-xs text-muted">Card Opening Game</p>
        </div>
      </div>

      <nav v-if="isAuthed" class="flex items-center gap-4 text-sm">
        <router-link class="nav-link" to="/game">Game</router-link>
        <router-link class="nav-link" to="/leaderboard">Leaderboard</router-link>
        <router-link class="nav-link" to="/profile">Profile</router-link>
      </nav>

      <div class="flex items-center gap-3" v-if="isAuthed">
        <span
          class="afk-debug"
          :class="isAfk ? 'afk-debug--afk' : 'afk-debug--active'"
          title="Debug: AFK if no mouse movement for 10 seconds in this window"
        >
          {{ isAfk ? 'AFK' : 'Active' }}
        </span>
        <span class="hidden text-xs text-muted sm:block">{{ userEmail }}</span>
        <button class="btn-secondary" type="button" @click="handleSignOut">Sign out</button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'

const store = useStore()
const router = useRouter()
const AFK_TIMEOUT_MS = 10_000
const AFK_TICK_MS = 1_000
const KEEP_ALIVE_MS = 5_000

const isAuthed = computed(() => !!store.state.auth.user)
const userEmail = computed(() => store.state.auth.user?.email || '')
const nowMs = ref(Date.now())
const lastMouseMoveMs = ref(Date.now())
const isAfk = computed(() => {
  if (!isAuthed.value) return false
  return (nowMs.value - lastMouseMoveMs.value) >= AFK_TIMEOUT_MS
})

let afkTimer = null
let keepAliveTimer = null

function markMouseActivity() {
  const timestamp = Date.now()
  lastMouseMoveMs.value = timestamp
  nowMs.value = timestamp
}

async function runKeepAliveTick() {
  if (!isAuthed.value) return
  if (store.state.game.actionLoading) return
  await store.dispatch('game/keepAlive')
}

function startKeepAlive() {
  if (keepAliveTimer || !isAuthed.value) return
  keepAliveTimer = window.setInterval(() => {
    void runKeepAliveTick()
  }, KEEP_ALIVE_MS)
}

function stopKeepAlive() {
  if (!keepAliveTimer) return
  window.clearInterval(keepAliveTimer)
  keepAliveTimer = null
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', markMouseActivity, { passive: true })
  }

  afkTimer = window.setInterval(() => {
    nowMs.value = Date.now()
  }, AFK_TICK_MS)

  if (isAuthed.value) {
    startKeepAlive()
    void runKeepAliveTick()
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('mousemove', markMouseActivity)
  }

  if (afkTimer) {
    window.clearInterval(afkTimer)
    afkTimer = null
  }

  stopKeepAlive()
})

watch(isAuthed, (authed) => {
  nowMs.value = Date.now()
  lastMouseMoveMs.value = nowMs.value

  if (!authed) {
    stopKeepAlive()
    return
  }

  startKeepAlive()
  void runKeepAliveTick()
})

async function handleSignOut() {
  await store.dispatch('auth/signOut')
  router.push('/')
}
</script>

<style scoped>
.brand-badge {
  color: #fff7ff;
  background:
    radial-gradient(circle at 18% 20%, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0) 50%),
    linear-gradient(140deg, #f6a4ca 0%, #ec76bc 45%, #d86be6 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    0 8px 18px rgba(221, 95, 174, 0.35);
}

.nav-link {
  color: var(--text-muted);
  transition: color 0.2s ease;
}

.nav-link.router-link-active,
.nav-link:hover {
  color: var(--text-main);
}

.afk-debug {
  border-radius: 9999px;
  border: 1px solid rgba(120, 143, 194, 0.35);
  padding: 0.2rem 0.6rem;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.afk-debug--active {
  background: rgba(78, 166, 116, 0.14);
  border-color: rgba(78, 166, 116, 0.45);
  color: #2b8d55;
}

.afk-debug--afk {
  background: rgba(219, 116, 83, 0.14);
  border-color: rgba(219, 116, 83, 0.45);
  color: #b75535;
}
</style>
