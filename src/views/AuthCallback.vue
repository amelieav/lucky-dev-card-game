<template>
  <section class="mx-auto max-w-xl">
    <div class="card p-6 sm:p-8">
      <h1 class="text-xl font-semibold">Signing you in</h1>
      <p class="mt-2 text-sm text-muted">Finalizing your email confirmation and session.</p>

      <p v-if="error" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {{ error }}
      </p>

      <p v-else class="mt-4 text-sm text-muted">Please wait...</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'

const store = useStore()
const router = useRouter()

const error = computed(() => store.state.auth.error)

onMounted(async () => {
  await store.dispatch('debug/hydrate')
  await store.dispatch('auth/initAuth')

  if (store.state.auth.user) {
    router.replace('/game')
    return
  }

  router.replace('/')
})
</script>
