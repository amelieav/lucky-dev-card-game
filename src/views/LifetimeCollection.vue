<template>
  <section class="card p-5 space-y-5">
    <div v-if="!supportsLifetimeCollection" class="rounded-xl border border-soft bg-panel-soft p-4 text-sm text-muted">
      Lifetime Collection is unavailable in the current runtime mode.
    </div>

    <template v-else>
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">Lifetime Collection</h1>
        <p class="text-sm text-muted">Mini card atlas of your best lifetime pulls across packs.</p>
      </div>
      <div class="text-right text-sm">
        <p class="text-xs uppercase tracking-wide text-muted">Active Pack</p>
        <p class="font-semibold text-main">{{ packLabel(activeLayer) }}</p>
        <button class="btn-secondary mt-2" type="button" :disabled="loading" @click="refreshLifetime">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <article class="rounded-xl border border-soft bg-panel-soft p-3">
        <p class="text-xs text-muted">Current Missing</p>
        <p class="text-2xl font-semibold">{{ Math.max(0, totalCards - currentCollected) }}</p>
      </article>
      <article class="rounded-xl border border-soft bg-panel-soft p-3">
        <p class="text-xs text-muted">Lifetime Unique</p>
        <p class="text-2xl font-semibold">{{ lifetimeTotal }}</p>
      </article>
      <article class="rounded-xl border border-soft bg-panel-soft p-3">
        <p class="text-xs text-muted">Rebirths</p>
        <p class="text-2xl font-semibold">{{ rebirthCount }}</p>
      </article>
    </div>

    <p v-if="error" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>

    <section
      v-for="layer in lifetimeLayers"
      :key="`lifetime-layer-${layer.layer}`"
      class="rounded-xl border border-soft bg-panel-soft p-4"
    >
      <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 class="text-base font-semibold">{{ packLabel(layer.layer) }}</h2>
          <p class="text-xs text-muted">
            {{ layer.collected }}/{{ layer.total }} collected · {{ percent(layer.collected, layer.total) }} completion
          </p>
        </div>
        <div class="text-right text-xs text-muted">
          <p>Total copies: <span class="font-semibold text-main">{{ layer.totalCopies }}</span></p>
          <p>
            Highest:
            <span class="font-semibold text-main">{{ layer.highestLabel }}</span>
          </p>
        </div>
      </div>

      <div class="lifetime-layer-layout">
        <div>
          <div class="grid gap-0 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
            <div
              v-for="item in layer.items"
              :key="`lifetime-card-${layer.layer}-${item.termKey}`"
              class="lifetime-mini-slot"
            >
              <term-card
                class="lifetime-mini-card"
                size="mini"
                :name="item.name"
                :tier="item.tier"
                :rarity="item.rarity"
                :mutation="item.bestMutation"
                :icon="item.icon"
                :coins="item.copies"
                stat-label="copies"
                stat-prefix=""
                :unknown="!item.owned"
              />
            </div>
          </div>
        </div>

        <aside class="lifetime-layer-sidebar rounded-xl border border-soft bg-white/70 p-3">
          <div class="mb-2 flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold">Full Holo</h3>
            <span class="text-[11px] uppercase tracking-wide text-muted">{{ completionRowsForLayer(layer.layer).length }}</span>
          </div>
          <p v-if="!completionRowsForLayer(layer.layer).length" class="text-xs text-muted">No full holo collections yet.</p>
          <ul v-else class="completion-board__grid">
            <li
              v-for="(row, index) in completionRowsForLayer(layer.layer)"
              :key="`completion-board-row-${layer.layer}-${row.user_id}-${index}`"
              class="completion-board__tile"
            >
              <p class="completion-board__name">#{{ index + 1 }} {{ row.display_name }}</p>
              <p class="completion-board__meta">
                Completed: <span class="completion-board__time">{{ formatCompletionTime(row.all_holo_completed_at) }}</span>
              </p>
            </li>
          </ul>
          <p v-if="completionBoardError" class="mt-2 text-xs text-red-600">{{ completionBoardError }}</p>
        </aside>
      </div>
    </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import TermCard from '../components/game/TermCard.vue'
import { getTermPresentation } from '../data/boosterTerms.mjs'
import { TERMS, TERMS_BY_KEY } from '../data/terms'
import { computeCardReward, getEffectiveTierForLayer, normalizeLayer } from '../lib/packLogic.mjs'

const store = useStore()
const loading = ref(false)
const error = ref(null)
const lifetimePayload = ref({
  total_unique: 0,
  per_layer: [],
  cards: [],
  highest_per_layer: [],
})
const completionBoardRows = ref([])
const completionBoardError = ref(null)

const snapshot = computed(() => store.state.game.snapshot || null)
const supportsLifetimeCollection = computed(() => Boolean(store.state.game.capabilities?.supports_lifetime_collection))
const stateRow = computed(() => snapshot.value?.state || null)
const currentTerms = computed(() => Array.isArray(snapshot.value?.terms) ? snapshot.value.terms : [])
const totalCards = TERMS.length
const currentCollected = computed(() => currentTerms.value.length)
const lifetimeTotal = computed(() => Number(lifetimePayload.value.total_unique || 0))
const activeLayer = computed(() => normalizeLayer(stateRow.value?.active_layer || 1))
const rebirthCount = computed(() => Math.max(0, Number(stateRow.value?.rebirth_count || 0)))
const boosterUnlocked = computed(() => rebirthCount.value > 0 || activeLayer.value > 1)
const completionBoardByLayer = computed(() => {
  const rows = Array.isArray(completionBoardRows.value) ? completionBoardRows.value : []
  const grouped = rows.reduce((acc, row) => {
    const layer = normalizeLayer(row.layer || 1)
    if (!row.all_holo_completed_at) return acc
    if (!acc[layer]) acc[layer] = []
    acc[layer].push({
      layer,
      user_id: row.user_id || 'unknown',
      display_name: String(row.display_name || 'Unknown Agent'),
      all_cards_completed_at: row.all_cards_completed_at || null,
      all_holo_completed_at: row.all_holo_completed_at || null,
    })
    return acc
  }, {})

  const layers = [1]
  if (boosterUnlocked.value) layers.push(2)

  return layers.map((layer) => ({
    layer,
    label: packLabel(layer),
    rows: (grouped[layer] || []).slice(0, 25),
  }))
})

function completionRowsForLayer(layerNumber) {
  const layer = normalizeLayer(layerNumber || 1)
  const row = completionBoardByLayer.value.find((entry) => entry.layer === layer)
  return row?.rows || []
}

const lifetimeLayers = computed(() => {
  const perLayer = Array.isArray(lifetimePayload.value.per_layer) ? lifetimePayload.value.per_layer : []
  const cards = Array.isArray(lifetimePayload.value.cards) ? lifetimePayload.value.cards : []
  const highestRows = Array.isArray(lifetimePayload.value.highest_per_layer)
    ? lifetimePayload.value.highest_per_layer
    : []

  const cardsByLayer = cards.reduce((acc, row) => {
    const layer = normalizeLayer(row.layer || 1)
    if (!acc[layer]) acc[layer] = {}
    acc[layer][row.term_key] = row
    return acc
  }, {})

  const highestByLayer = highestRows.reduce((acc, row) => {
    const layer = normalizeLayer(row.layer || 1)
    acc[layer] = row
    return acc
  }, {})

  return perLayer
    .map((row) => {
      const layer = normalizeLayer(row.layer || 1)
      return row
        ? { ...row, layer }
        : null
    })
    .filter((row) => row && (row.layer === 1 || boosterUnlocked.value))
    .sort((a, b) => a.layer - b.layer)
    .map((row) => {
      const layer = row.layer
      const layerCards = cardsByLayer[layer] || {}

      const items = TERMS.map((term) => {
        const owned = layerCards[term.key]
        const presentation = getTermPresentation(term.key, layer)
        return {
          termKey: term.key,
          name: presentation.name || term.name,
          tier: Number(term.tier || 1),
          rarity: term.rarity,
          icon: presentation.icon || term.icon || 'help-circle',
          value: computeCardReward({
            baseBp: term.baseBp,
            rarity: term.rarity,
            mutation: 'none',
            valueLevel: 0,
          }),
          owned: Boolean(owned),
          copies: Math.max(0, Number(owned?.copies || 0)),
          bestMutation: normalizeMutation(owned?.best_mutation || 'none'),
        }
      })

      const highest = highestByLayer[layer]
      const highestTier = highest?.tier == null
        ? null
        : getEffectiveTierForLayer(Number(highest.tier || 1), layer)
      const highestPresentation = highest?.term_key ? getTermPresentation(highest.term_key, layer) : null
      const highestLabel = highest?.term_key
        ? `${highestPresentation?.name || highest.term_name || TERMS_BY_KEY[highest.term_key]?.name || highest.term_key} · T${highestTier || '?'} · ${normalizeRarity(highest.rarity)} · ${mutationLabel(highest.best_mutation)}`
        : 'None yet'

      return {
        layer,
        collected: Math.max(0, Number(row.collected || 0)),
        total: Math.max(1, Number(row.total || TERMS.length)),
        totalCopies: items.reduce((sum, item) => sum + Number(item.copies || 0), 0),
        highestLabel,
        items,
      }
    })
})

onMounted(async () => {
  await store.dispatch('auth/initAuth')
  if (!store.state.game.snapshot) {
    await store.dispatch('game/bootstrapPlayer')
  }
  if (!supportsLifetimeCollection.value) {
    return
  }
  await refreshLifetime()
})

async function refreshLifetime() {
  loading.value = true
  error.value = null
  completionBoardError.value = null
  try {
    const [payload, boardRows] = await Promise.all([
      store.dispatch('game/fetchLifetimeCollection'),
      store.dispatch('game/fetchLifetimeCompletionBoard', { limit: 100 }),
    ])
    lifetimePayload.value = normalizeLifetimePayload(payload || snapshot.value?.lifetime)
    completionBoardRows.value = Array.isArray(boardRows) ? boardRows : []
  } catch (err) {
    error.value = err?.message || 'Unable to load lifetime collection.'
    lifetimePayload.value = normalizeLifetimePayload(snapshot.value?.lifetime)
    try {
      const boardRows = await store.dispatch('game/fetchLifetimeCompletionBoard', { limit: 100 })
      completionBoardRows.value = Array.isArray(boardRows) ? boardRows : []
    } catch (boardErr) {
      completionBoardRows.value = []
      completionBoardError.value = boardErr?.message || 'Unable to load completion board.'
    }
  } finally {
    loading.value = false
  }
}

function normalizeLifetimePayload(payload) {
  const safe = payload && typeof payload === 'object' ? payload : {}
  return {
    total_unique: Math.max(0, Number(safe.total_unique || 0)),
    per_layer: Array.isArray(safe.per_layer) ? safe.per_layer : [],
    cards: Array.isArray(safe.cards) ? safe.cards : [],
    highest_per_layer: Array.isArray(safe.highest_per_layer) ? safe.highest_per_layer : [],
  }
}

function percent(collected, total) {
  if (!total) return '0%'
  return `${((Number(collected || 0) / Number(total || 1)) * 100).toFixed(1)}%`
}

function normalizeMutation(mutation) {
  const key = String(mutation || '').trim().toLowerCase()
  if (key === 'glitched' || key === 'prismatic') return 'holo'
  if (key === 'foil' || key === 'holo') return key
  return 'none'
}

function normalizeRarity(rarity) {
  const key = String(rarity || '').trim().toLowerCase()
  if (key === 'legendary' || key === 'rare') return key
  return 'common'
}

function mutationLabel(mutation) {
  const normalized = normalizeMutation(mutation)
  if (normalized === 'holo') return 'HOLO'
  if (normalized === 'foil') return 'FOIL'
  return 'None'
}

function packLabel(layerNumber) {
  const layer = normalizeLayer(layerNumber || 1)
  if (layer === 1) return 'Base Pack'
  return 'Booster Pack'
}

function formatCompletionTime(value, fallback = 'Not yet') {
  const parsed = Date.parse(String(value || ''))
  if (!Number.isFinite(parsed)) return fallback
  return new Date(parsed).toLocaleString()
}
</script>

<style scoped>
.lifetime-layer-layout {
  display: grid;
  gap: 0.65rem;
}

@media (min-width: 1024px) {
  .lifetime-layer-layout {
    grid-template-columns: minmax(0, 1fr) 10rem;
  }
}

.lifetime-layer-sidebar {
  align-self: start;
}

.completion-board__list {
  display: grid;
  gap: 0.35rem;
  max-height: 14rem;
  overflow: auto;
  padding-right: 0.2rem;
}

.completion-board__row {
  border: 1px solid rgba(123, 146, 186, 0.28);
  border-radius: 0.65rem;
  background: rgba(240, 246, 255, 0.7);
  padding: 0.42rem 0.5rem;
}

.completion-board__name {
  font-size: 0.78rem;
  font-weight: 700;
  color: #1a2f57;
}

.completion-board__meta {
  font-size: 0.66rem;
  color: #4c618b;
  margin-top: 0.08rem;
}

.completion-board__time {
  font-weight: 700;
  color: #243d68;
}

.completion-board__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.35rem;
  max-height: 14rem;
  overflow: auto;
  padding-right: 0.15rem;
}

.completion-board__tile {
  border: 1px solid rgba(123, 146, 186, 0.28);
  border-radius: 0.5rem;
  background: rgba(240, 246, 255, 0.7);
  padding: 0.35rem 0.42rem;
  min-height: 4rem;
}

.lifetime-mini-card {
  max-width: none;
  width: 100%;
  margin: 0;
}

.lifetime-mini-card :deep(.term-card) {
  --term-card-mutation-size: clamp(0.34rem, 0.58vw, 0.44rem);
  --term-card-name-size: clamp(0.52rem, 0.72vw, 0.62rem);
  --term-card-name-line: 1.02;
  --term-card-rarity-size: 0.34rem;
  --term-card-rarity-pad-y: 0.08rem;
  --term-card-rarity-pad-x: 0.24rem;
  --term-card-coins-value-size: 0.5rem;
  --term-card-coins-label-size: 0.32rem;
}

.lifetime-mini-slot {
  min-width: 0;
}

</style>
