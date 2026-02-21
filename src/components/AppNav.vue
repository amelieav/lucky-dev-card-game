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
        <span class="hidden text-xs text-muted sm:block">{{ userEmail }}</span>
        <button class="btn-secondary" type="button" @click="handleSignOut">Sign out</button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'

const store = useStore()
const router = useRouter()

const isAuthed = computed(() => !!store.state.auth.user)
const userEmail = computed(() => store.state.auth.user?.email || '')

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
</style>
