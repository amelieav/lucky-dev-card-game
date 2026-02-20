<template>
  <section class="mx-auto max-w-xl">
    <div class="card p-6 sm:p-8">
      <p class="text-xs uppercase text-muted" style="letter-spacing:0.18em;">Lucky Agent</p>
      <h1 class="mt-2 text-2xl font-semibold">Magic link sign in</h1>
      <p class="mt-2 text-sm text-muted">
        Sign in to save your progression, luck upgrades, and leaderboard identity.
      </p>

      <form class="mt-5 space-y-3" @submit.prevent="handleSubmit">
        <label class="block text-sm font-medium">Email</label>
        <input v-model="email" class="form-input" type="email" required placeholder="you@example.com" />
        <button class="btn-primary w-full" type="submit" :disabled="loading">Send magic link</button>
      </form>

      <p v-if="magicLinkSent" class="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
        Check your inbox for the sign-in link.
      </p>

      <p v-if="error" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {{ error }}
      </p>

      <p class="mt-4 text-xs text-muted">
        This app uses Supabase Auth with email OTP magic links.
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'

const store = useStore()
const router = useRouter()
const email = ref('')

const loading = computed(() => store.state.auth.loading)
const magicLinkSent = computed(() => store.state.auth.magicLinkSent)
const error = computed(() => store.state.auth.error)

onMounted(async () => {
  await store.dispatch('debug/hydrate')
  await store.dispatch('auth/initAuth')

  if (store.state.auth.user) {
    router.replace('/game')
  }
})

async function handleSubmit() {
  await store.dispatch('auth/sendMagicLink', email.value.trim())
}
</script>
