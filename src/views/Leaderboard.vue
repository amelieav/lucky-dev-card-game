<template>
  <section class="card p-5">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">Global Leaderboard</h1>
        <p class="text-sm text-muted">Ranks by highest card, then number of copies of that card.</p>
      </div>
      <div class="text-right">
        <p class="text-[11px] uppercase tracking-wide text-muted">Auto Refresh</p>
        <p class="text-sm font-semibold text-main">in {{ refreshCountdown }}s</p>
      </div>
    </div>

    <p v-if="error" class="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>

    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="text-left text-muted">
            <th class="px-2 py-2">Rank</th>
            <th class="px-2 py-2">Player</th>
            <th class="px-2 py-2">Highest Card</th>
            <th class="px-2 py-2">Copies</th>
            <th class="px-2 py-2">Coins</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="`${row.rank}-${row.display_name}-${row.best_term_key || 'none'}`" class="border-t border-soft">
            <td class="px-2 py-2">{{ row.rank }}</td>
            <td class="px-2 py-2 font-medium">
              <div class="flex items-center gap-2">
                <vue-feather v-if="row.best_term_key" :type="cardIcon(row)" class="h-3.5 w-3.5 text-muted" stroke-width="2.3" aria-hidden="true"></vue-feather>
                <span>{{ row.display_name }}</span>
              </div>
              <span v-if="row.is_you" class="ml-2 rounded bg-panel-soft px-1.5 py-0.5 text-[11px] text-muted">You</span>
            </td>
            <td class="px-2 py-2">
              <div v-if="row.best_term_key" class="flex items-center gap-2">
                <vue-feather :type="cardIcon(row)" class="h-4 w-4" stroke-width="2.3" aria-hidden="true"></vue-feather>
                <div class="leading-tight">
                  <p class="font-medium">{{ cardName(row) }}</p>
                  <p class="text-xs text-muted">
                    T{{ row.best_term_tier }} · {{ row.best_term_rarity }} · {{ mutationLabel(row.best_term_mutation) }}
                  </p>
                </div>
              </div>
              <p v-else class="text-muted">No cards yet</p>
            </td>
            <td class="px-2 py-2">{{ formatNumber(row.best_term_copies) }}</td>
            <td class="px-2 py-2">{{ formatNumber(row.score) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="!loading && rows.length === 0" class="mt-4 text-sm text-muted">No rankings yet.</p>
    <p v-else-if="viewerPlayerNumber" class="mt-4 text-sm text-muted">
      You are player number {{ viewerPlayerNumber }}<span v-if="totalPlayers"> of {{ totalPlayers }}</span>.
    </p>
    <p class="mt-2 text-sm text-muted">
      Highest card stolen by the duck:
      <span class="font-semibold text-main">{{ duckHighestCardLabel }}</span>
    </p>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useStore } from 'vuex'
import { TERMS_BY_KEY } from '../data/terms'

const store = useStore()
const AUTO_REFRESH_SECONDS = 15
const refreshCountdown = ref(AUTO_REFRESH_SECONDS)
let refreshTimer = null

const rows = computed(() => store.state.leaderboard.rows)
const loading = computed(() => store.state.leaderboard.loading)
const error = computed(() => store.state.leaderboard.error)
const duckHighestStolen = computed(() => store.state.game.duckTheftStats?.highest || null)
const duckHighestCardLabel = computed(() => {
  if (!duckHighestStolen.value) return 'None yet'
  const entry = duckHighestStolen.value
  const tier = Number(entry.tier || 0)
  const rarity = String(entry.rarity || 'common').toLowerCase()
  const effect = mutationLabel(entry.mutation)
  return `${entry.name} · T${tier || '?'} · ${rarity} · ${effect}`
})
const viewerPlayerNumber = computed(() => {
  const rowWithViewerMeta = rows.value.find((row) => row?.viewer_player_number != null)
  if (rowWithViewerMeta) return Number(rowWithViewerMeta.viewer_player_number)

  const youRow = rows.value.find((row) => row?.is_you)
  if (youRow) return Number(youRow.player_number || 0)

  return null
})
const totalPlayers = computed(() => {
  if (!rows.value.length) return null
  return Number(rows.value[0]?.total_players || 0) || null
})

onMounted(async () => {
  await store.dispatch('game/hydrateDuckTheftStats')
  await refreshLeaderboard(true)
  startAutoRefresh()
})

onUnmounted(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
})

function startAutoRefresh() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
  }

  refreshCountdown.value = AUTO_REFRESH_SECONDS
  refreshTimer = window.setInterval(() => {
    if (refreshCountdown.value <= 1) {
      refreshCountdown.value = AUTO_REFRESH_SECONDS
      void refreshLeaderboard(true)
      return
    }

    refreshCountdown.value -= 1
  }, 1000)
}

async function refreshLeaderboard(force = true) {
  await store.dispatch('leaderboard/fetch', { force, limit: 50 })
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function cardIcon(row) {
  return TERMS_BY_KEY[row?.best_term_key]?.icon || 'help-circle'
}

function cardName(row) {
  return row?.best_term_name || TERMS_BY_KEY[row?.best_term_key]?.name || row?.best_term_key || 'Unknown Card'
}

function mutationLabel(mutation) {
  const key = String(mutation || '').trim().toLowerCase()
  if (key === 'holo' || key === 'prismatic' || key === 'glitched') return 'HOLO'
  if (key === 'foil') return 'FOIL'
  return 'None'
}
</script>
