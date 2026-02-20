<template>
  <section class="card p-5">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">Global Leaderboard</h1>
        <p class="text-sm text-muted">Ranks by net score across all players.</p>
      </div>
      <button class="btn-secondary" type="button" :disabled="loading" @click="refresh">Refresh</button>
    </div>

    <p v-if="error" class="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>

    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="text-left text-muted">
            <th class="px-2 py-2">Rank</th>
            <th class="px-2 py-2">Player</th>
            <th class="px-2 py-2">Score</th>
            <th class="px-2 py-2">Luck</th>
            <th class="px-2 py-2">Tier</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="`${row.rank}-${row.display_name}`" class="border-t border-soft">
            <td class="px-2 py-2">{{ row.rank }}</td>
            <td class="px-2 py-2 font-medium">{{ row.display_name }}</td>
            <td class="px-2 py-2">{{ formatNumber(row.score) }}</td>
            <td class="px-2 py-2">Lv {{ row.luck_level }}</td>
            <td class="px-2 py-2">{{ row.highest_tier_unlocked }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="!loading && rows.length === 0" class="mt-4 text-sm text-muted">No rankings yet.</p>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useStore } from 'vuex'

const store = useStore()

const rows = computed(() => store.state.leaderboard.rows)
const loading = computed(() => store.state.leaderboard.loading)
const error = computed(() => store.state.leaderboard.error)

onMounted(async () => {
  await store.dispatch('leaderboard/fetch', { force: false, limit: 50 })
})

async function refresh() {
  await store.dispatch('leaderboard/fetch', { force: true, limit: 50 })
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}
</script>
