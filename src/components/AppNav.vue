<template>
  <header class="app-nav border-b border-soft bg-panel">
    <div class="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
      <div class="flex items-center gap-3">
        <div class="brand-badge h-8 w-8 rounded-lg grid place-items-center text-sm font-semibold" aria-hidden="true">
          <vue-feather type="code" size="14" stroke-width="2.5"></vue-feather>
        </div>
        <div>
          <p class="text-sm font-semibold tracking-wide text-main">Lucky Dev</p>
          <p class="text-xs text-muted">Card Opening Game</p>
        </div>
      </div>

      <nav v-if="isAuthed" class="flex items-center gap-4 text-sm">
        <router-link class="nav-link" to="/game">Game</router-link>
        <router-link class="nav-link" to="/leaderboard">Leaderboard</router-link>
        <router-link v-if="supportsLifetimeCollection" class="nav-link" to="/lifetime">Lifetime Collection</router-link>
        <router-link v-if="duckCaveUnlocked" class="nav-link" to="/duck-cave">Duck Cave</router-link>
        <router-link class="nav-link" to="/profile">Profile</router-link>
      </nav>

      <div class="flex items-center gap-3" v-if="isAuthed">
        <div
          v-if="duckCardsStolen > 0"
          class="duck-stolen-wrap"
          @mouseenter="showDuckInfo"
          @mouseleave="hideDuckInfo"
        >
          <button
            class="duck-stolen-metric duck-stolen-metric--button"
            type="button"
            :aria-expanded="duckInfoOpen ? 'true' : 'false'"
            aria-controls="duck-info-popover"
            @click="toggleDuckInfo"
            @focus="showDuckInfo"
            @blur="hideDuckInfo"
          >
            cards stolen by a duck: {{ duckCardsStolen }}
          </button>
          <div v-if="duckInfoOpen" id="duck-info-popover" class="duck-info-popover" role="note">
            Duck raids can trigger if you're AFK for too long. The duck targets a random
            owned card from your highest completed tier and drags it away. Click the duck to scare it off before it
            escapes.
          </div>
        </div>
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
const supportsLifetimeCollection = computed(() => Boolean(store.state.game.capabilities?.supports_lifetime_collection))
const duckCaveUnlocked = computed(() => {
  const state = store.state.game.snapshot?.state || {}
  const rebirthCount = Math.max(0, Number(state.rebirth_count || 0))
  const activeLayer = Math.max(1, Number(state.active_layer || 1))
  return rebirthCount >= 1 || activeLayer > 1
})
const duckCardsStolen = computed(() => Math.max(0, Number(store.state.game.duckTheftStats?.count || 0)))
const duckInfoOpen = ref(false)
const duckInfoPinned = ref(false)
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

function showDuckInfo() {
  duckInfoOpen.value = true
}

function hideDuckInfo() {
  if (duckInfoPinned.value) return
  duckInfoOpen.value = false
}

function toggleDuckInfo() {
  if (duckInfoPinned.value) {
    duckInfoPinned.value = false
    duckInfoOpen.value = false
    return
  }

  duckInfoPinned.value = true
  duckInfoOpen.value = true
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', markMouseActivity, { passive: true })
  }

  afkTimer = window.setInterval(() => {
    nowMs.value = Date.now()
  }, AFK_TICK_MS)

  if (isAuthed.value) {
    store.dispatch('game/hydrateDuckTheftStats')
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
    duckInfoPinned.value = false
    duckInfoOpen.value = false
    stopKeepAlive()
    return
  }

  store.dispatch('game/hydrateDuckTheftStats')
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

.duck-stolen-metric {
  border-radius: 9999px;
  border: 1px solid rgba(120, 143, 194, 0.35);
  background: rgba(91, 123, 192, 0.09);
  padding: 0.2rem 0.6rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #34517f;
  white-space: nowrap;
}

.duck-stolen-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.duck-stolen-metric--button {
  cursor: pointer;
}

.duck-stolen-metric--button:focus-visible {
  outline: 2px solid rgba(52, 81, 127, 0.45);
  outline-offset: 2px;
}

.duck-info-popover {
  position: absolute;
  right: 0;
  top: calc(100% + 0.45rem);
  z-index: 40;
  width: min(24rem, 72vw);
  border-radius: 0.75rem;
  border: 1px solid rgba(120, 143, 194, 0.35);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 10px 24px rgba(26, 46, 94, 0.2);
  padding: 0.55rem 0.65rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.35;
  color: #2e4b79;
  white-space: normal;
  text-transform: none;
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
