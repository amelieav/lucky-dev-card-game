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

      <div class="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        <div
          v-for="item in layer.items"
          :key="`lifetime-card-${layer.layer}-${item.termKey}`"
          class="lifetime-mini-slot space-y-1"
        >
          <term-card
            class="lifetime-mini-card"
            size="mini"
            :name="item.name"
            :tier="item.tier"
            :rarity="item.rarity"
            :mutation="item.bestMutation"
            :icon="item.icon"
            :coins="item.value"
            :unknown="!item.owned"
          />
          <div class="lifetime-mini-meta">
            <template v-if="item.owned">
              <p class="lifetime-mini-metric">
                <span class="lifetime-mini-metric__label">Copies</span>
                <span class="lifetime-mini-metric__value">{{ item.copies }}</span>
              </p>
              <p class="lifetime-mini-metric">
                <span class="lifetime-mini-metric__label">Best</span>
                <span class="lifetime-mini-metric__value">{{ mutationLabel(item.bestMutation) }}</span>
              </p>
            </template>
            <template v-else>
              <p class="lifetime-mini-meta__empty">Not collected</p>
            </template>
          </div>
        </div>
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
  try {
    const payload = await store.dispatch('game/fetchLifetimeCollection')
    lifetimePayload.value = normalizeLifetimePayload(payload || snapshot.value?.lifetime)
  } catch (err) {
    error.value = err?.message || 'Unable to load lifetime collection.'
    lifetimePayload.value = normalizeLifetimePayload(snapshot.value?.lifetime)
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
</script>

<style scoped>
.lifetime-mini-card {
  max-width: 108px;
  margin: 0 auto;
}

.lifetime-mini-slot {
  min-width: 0;
}

.lifetime-mini-meta {
  display: flex;
  gap: 0.28rem;
  flex-wrap: wrap;
  justify-content: center;
  border-radius: 0.38rem;
  border: 1px solid rgba(120, 143, 194, 0.25);
  background: rgba(255, 255, 255, 0.78);
  padding: 0.22rem;
  min-height: 1.78rem;
}

.lifetime-mini-metric {
  display: inline-flex;
  align-items: center;
  gap: 0.24rem;
  margin: 0;
  border-radius: 999px;
  border: 1px solid rgba(120, 143, 194, 0.35);
  background: rgba(235, 243, 255, 0.95);
  padding: 0.08rem 0.32rem;
  font-size: 0.52rem;
  line-height: 1.1;
}

.lifetime-mini-metric__label {
  color: #60759d;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.lifetime-mini-metric__value {
  color: #1f3b67;
  font-weight: 700;
}

.lifetime-mini-meta__empty {
  margin: 0;
  align-self: center;
  font-size: 0.56rem;
  color: #5f739a;
}
</style>
