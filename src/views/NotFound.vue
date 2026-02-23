<template>
  <div class="rounded-2xl border border-soft bg-panel p-8 text-center shadow-sm">
    <h1 class="text-xl font-semibold">Page not found</h1>
    <p class="mt-3 text-sm text-muted">The route does not exist in Lucky Agent.</p>
    <router-link class="btn-primary mt-5 inline-flex" :to="backRoute">Back to game</router-link>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { hasAuthParamsInUrl } from '../lib/auth'

const backRoute = computed(() => (hasAuthParamsInUrl() ? '/auth/callback' : '/game'))
</script>
