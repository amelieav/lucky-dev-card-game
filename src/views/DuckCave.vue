<template>
  <section class="card p-5 space-y-5">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">Duck Cave</h1>
        <p class="text-sm text-muted">
          Welcome to the duck cave. All the cards the duck has stolen get stashed in his duck cave.
          These cards are from all players across the leaderboard.
        </p>
        <p v-if="localEconomyEnabled" class="mt-1 text-xs text-muted">
          Local mode note: only your local player data exists in this runtime.
        </p>
      </div>
      <p class="text-xs text-muted">Season {{ seasonIdLabel }}</p>
    </div>

    <div v-if="!duckCaveUnlocked" class="rounded-xl border border-soft bg-panel-soft p-4 text-sm text-muted">
      Duck Cave unlocks at Rebirth 1.
    </div>

    <template v-else>
      <div class="grid gap-3 sm:grid-cols-3">
        <article class="rounded-xl border border-soft bg-panel-soft p-3 text-sm">
          <p class="text-xs text-muted">Cards in cave</p>
          <p class="font-semibold">{{ formatNumber(duckTheftCount) }}</p>
        </article>
        <article class="rounded-xl border border-soft bg-panel-soft p-3 text-sm sm:col-span-2">
          <p class="text-xs text-muted">Highest stolen card</p>
          <p class="font-semibold">{{ highestStolenLabel }}</p>
        </article>
      </div>

      <p v-if="caveLoading" class="text-xs text-muted">Loading duck cave stash...</p>
      <p v-else-if="caveLoadError" class="text-xs text-red-700">{{ caveLoadError }}</p>

      <div class="duck-cave-scene" :class="{ 'duck-cave-scene--empty': laidOutEntries.length === 0 }" :style="duckCaveSceneStyle">
        <div class="duck-cave-ground" aria-hidden="true"></div>

        <div v-if="!caveLoading && laidOutEntries.length === 0" class="duck-cave-empty-note">
          <p>The duck looks sad. No stolen cards yet this season.</p>
        </div>

        <div
          v-for="entry in laidOutEntries"
          :key="entry.id"
          class="duck-cave-card"
          :style="entry.style"
          :title="entry.tooltip"
        >
          <term-card
            size="mini"
            :name="entry.name"
            :tier="entry.baseTier"
            :rarity="entry.rarity"
            :mutation="entry.mutation"
            :icon="entry.icon"
            :coins="entry.value"
          />
        </div>

        <img
          :src="duckSpriteSrc"
          alt="Duck in cave"
          class="duck-cave-duck"
          :class="{ 'duck-cave-duck--walk': laidOutEntries.length > 0 }"
        />
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import TermCard from '../components/game/TermCard.vue'
import { TERMS_BY_KEY } from '../data/terms'
import { getTermPresentation } from '../data/boosterTerms.mjs'
import { getBaseTierFromEffectiveTier, normalizeLayer } from '../lib/packLogic.mjs'

const store = useStore()
const LOCAL_ECONOMY_ENABLED = import.meta.env.VITE_LOCAL_ECONOMY === '1'
const DUCK_CAVE_COLUMNS = 11
const DUCK_CAVE_CARD_ROW_REM = 3.85
const DUCK_CAVE_CARD_START_REM = 4.1
const DUCK_RARITY_RANK = {
  common: 1,
  rare: 2,
  legendary: 3,
}
const DUCK_MUTATION_RANK = {
  none: 1,
  foil: 2,
  holo: 3,
}

const snapshot = computed(() => store.state.game.snapshot || null)
const playerState = computed(() => snapshot.value?.state || null)
const activeLayer = computed(() => normalizeLayer(playerState.value?.active_layer || 1))
const rebirthCount = computed(() => Math.max(0, Number(playerState.value?.rebirth_count || 0)))
const duckCaveUnlocked = computed(() => rebirthCount.value >= 1 || activeLayer.value > 1)
const seasonIdLabel = computed(() => snapshot.value?.season?.id || 'Unknown')
const localEconomyEnabled = computed(() => LOCAL_ECONOMY_ENABLED)

const caveLoading = ref(false)
const caveLoadError = ref(null)
const caveEntriesRaw = ref([])

const stolenEntries = computed(() => {
  return (Array.isArray(caveEntriesRaw.value) ? caveEntriesRaw.value : [])
    .map((entry, index) => normalizeEntry(entry, index))
    .filter(Boolean)
    .sort((a, b) => {
      const aMs = Date.parse(a.stolenAt || '') || 0
      const bMs = Date.parse(b.stolenAt || '') || 0
      return bMs - aMs
    })
})
const stackedEntries = computed(() => {
  return [...stolenEntries.value]
    .sort((a, b) => {
      if (a.value !== b.value) return a.value - b.value
      if (a.tier !== b.tier) return a.tier - b.tier
      const aRarity = DUCK_RARITY_RANK[a.rarity] || 1
      const bRarity = DUCK_RARITY_RANK[b.rarity] || 1
      if (aRarity !== bRarity) return aRarity - bRarity
      const aMutation = DUCK_MUTATION_RANK[a.mutation] || 1
      const bMutation = DUCK_MUTATION_RANK[b.mutation] || 1
      if (aMutation !== bMutation) return aMutation - bMutation
      const aMs = Date.parse(a.stolenAt || '') || 0
      const bMs = Date.parse(b.stolenAt || '') || 0
      return aMs - bMs
    })
})

const duckTheftCount = computed(() => stolenEntries.value.length)
const highestStolen = computed(() => {
  if (!stolenEntries.value.length) return null
  return stolenEntries.value.reduce((best, candidate) => {
    if (!best) return candidate
    if (candidate.tier !== best.tier) return candidate.tier > best.tier ? candidate : best
    const candidateRarity = DUCK_RARITY_RANK[candidate.rarity] || 1
    const bestRarity = DUCK_RARITY_RANK[best.rarity] || 1
    if (candidateRarity !== bestRarity) return candidateRarity > bestRarity ? candidate : best
    const candidateMutation = DUCK_MUTATION_RANK[candidate.mutation] || 1
    const bestMutation = DUCK_MUTATION_RANK[best.mutation] || 1
    if (candidateMutation !== bestMutation) return candidateMutation > bestMutation ? candidate : best
    const candidateAt = Date.parse(candidate.stolenAt || '') || 0
    const bestAt = Date.parse(best.stolenAt || '') || 0
    return candidateAt > bestAt ? candidate : best
  }, null)
})
const highestStolenLabel = computed(() => {
  const entry = highestStolen.value
  if (!entry) return 'None yet'
  return `${entry.name} · T${entry.tier} · ${entry.rarity}`
})

const duckSpriteSrc = computed(() => (
  laidOutEntries.value.length > 0
    ? duckAsset('walk2.png')
    : duckAsset('cry1.png')
))

const caveRows = computed(() => {
  if (!stackedEntries.value.length) return 1
  return Math.max(1, Math.ceil(stackedEntries.value.length / DUCK_CAVE_COLUMNS))
})
const duckCaveSceneStyle = computed(() => {
  const minHeightRem = Math.max(22, (DUCK_CAVE_CARD_START_REM + (caveRows.value * DUCK_CAVE_CARD_ROW_REM) + 8))
  return {
    '--duck-cave-min-height-rem': `${minHeightRem.toFixed(1)}rem`,
  }
})

const laidOutEntries = computed(() => {
  return stackedEntries.value.map((entry, index) => {
    const layout = layoutForEntry(entry, index, stackedEntries.value.length)
    return {
      ...entry,
      style: {
        left: `${layout.left}%`,
        top: `${layout.top}`,
        transform: `translate(-50%, -50%) rotate(${layout.rotate}deg) scale(${layout.scale})`,
        zIndex: String(layout.zIndex),
      },
      tooltip: `${entry.name} · ${entry.ownerName}`,
    }
  })
})

onMounted(async () => {
  await loadDuckCaveEntries()
})

watch(() => snapshot.value?.season?.id, () => {
  void loadDuckCaveEntries()
})

async function loadDuckCaveEntries() {
  caveLoading.value = true
  caveLoadError.value = null

  try {
    if (!store.state.game.snapshot) {
      await store.dispatch('game/bootstrapPlayer')
    }
    await store.dispatch('game/hydrateDuckTheftStats')
    const rows = await store.dispatch('game/fetchDuckCaveStash')
    caveEntriesRaw.value = Array.isArray(rows) ? rows : []
  } catch (error) {
    caveEntriesRaw.value = []
    caveLoadError.value = error?.message || 'Unable to load duck cave stash.'
  } finally {
    caveLoading.value = false
  }
}

function normalizeEntry(entry, index) {
  if (!entry || typeof entry !== 'object') return null

  const termKey = String(entry.term_key || entry.termKey || '').trim() || null
  const term = termKey ? TERMS_BY_KEY[termKey] : null
  const layer = normalizeLayer(entry.layer || activeLayer.value || 1)
  const presentation = termKey ? getTermPresentation(termKey, layer) : null
  const effectiveTier = Math.max(1, Number(entry.tier || term?.tier || 1))
  const baseTier = getBaseTierFromEffectiveTier(effectiveTier)

  return {
    id: String(entry.id || `${entry.user_id || 'u'}:${layer}:${termKey || 'unknown'}:${entry.stolen_at || entry.at || index}`),
    termKey,
    name: entry.term_name || entry.name || presentation?.name || term?.name || 'Unknown Card',
    icon: presentation?.icon || term?.icon || 'help-circle',
    rarity: normalizeRarity(entry.rarity || term?.rarity || 'common'),
    mutation: normalizeMutation(entry.mutation || entry.best_mutation || 'none'),
    value: Math.max(0, Number(entry.value || 0)),
    tier: effectiveTier,
    baseTier,
    ownerName: String(entry.display_name || entry.owner_name || 'Unknown Player'),
    stolenAt: entry.stolen_at || entry.at || null,
  }
}

function hashString(value) {
  const text = String(value || '')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) >>> 0
  }
  return hash >>> 0
}

function layoutForEntry(entry, index, totalCount) {
  const seed = hashString(`${entry.id}:${index}`)
  const rows = Math.max(1, Math.ceil(Math.max(1, totalCount) / DUCK_CAVE_COLUMNS))
  const layerFromBottom = Math.floor(index / DUCK_CAVE_COLUMNS)
  const row = Math.max(0, rows - 1 - layerFromBottom)
  const column = index % DUCK_CAVE_COLUMNS
  const leftBase = 6 + (column * (88 / Math.max(1, DUCK_CAVE_COLUMNS - 1)))
  const jitterX = ((seed % 200) - 100) / 60
  const jitterY = (((Math.floor(seed / 31) % 180) - 90) / 180)
  const rotate = -14 + ((Math.floor(seed / 71) % 2800) / 100)
  const scale = 0.78 + ((Math.floor(seed / 191) % 20) / 100)
  const valueVisibilityRank = index + 1

  return {
    left: clamp(leftBase + jitterX, 5, 95),
    top: `${(DUCK_CAVE_CARD_START_REM + (row * DUCK_CAVE_CARD_ROW_REM) + jitterY).toFixed(2)}rem`,
    rotate: clamp(rotate, -16, 16),
    scale: clamp(scale, 0.76, 0.98),
    zIndex: 20 + valueVisibilityRank,
  }
}

function clamp(value, min, max) {
  const n = Number(value || 0)
  if (n < min) return min
  if (n > max) return max
  return n
}

function duckAsset(fileName) {
  const basePath = `${import.meta.env.BASE_URL || '/'}ducks/${fileName}`
  if (typeof window === 'undefined') {
    return basePath
  }

  try {
    return new URL(basePath, window.location.href).toString()
  } catch (_) {
    return basePath
  }
}

function normalizeRarity(rarity) {
  const key = String(rarity || '').trim().toLowerCase()
  return key === 'legendary' || key === 'rare' ? key : 'common'
}

function normalizeMutation(mutation) {
  const key = String(mutation || '').trim().toLowerCase()
  if (key === 'glitched' || key === 'prismatic') return 'holo'
  if (key === 'foil' || key === 'holo') return key
  return 'none'
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}
</script>

<style scoped>
.duck-cave-scene {
  position: relative;
  min-height: var(--duck-cave-min-height-rem, 26rem);
  border-radius: 1rem;
  border: 1px solid rgba(120, 143, 194, 0.4);
  background:
    radial-gradient(circle at 16% 22%, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0) 32%),
    linear-gradient(180deg, rgba(66, 78, 112, 0.36) 0%, rgba(30, 36, 54, 0.58) 58%, rgba(19, 22, 34, 0.86) 100%);
  overflow: hidden;
}

.duck-cave-scene--empty {
  min-height: 20rem;
}

.duck-cave-ground {
  position: absolute;
  inset: auto 0 0 0;
  height: 34%;
  background:
    radial-gradient(circle at 30% 10%, rgba(255, 232, 163, 0.22), rgba(255, 232, 163, 0) 52%),
    linear-gradient(180deg, rgba(60, 44, 31, 0.2), rgba(39, 28, 22, 0.56));
}

.duck-cave-empty-note {
  position: absolute;
  left: 50%;
  top: 44%;
  transform: translate(-50%, -50%);
  border-radius: 0.75rem;
  border: 1px solid rgba(225, 232, 255, 0.25);
  background: rgba(17, 24, 43, 0.62);
  color: #d9e2ff;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.75rem 0.9rem;
  text-align: center;
}

.duck-cave-card {
  position: absolute;
  width: clamp(3.4rem, 8.2vw, 5.2rem);
  max-width: 13vw;
  pointer-events: none;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.28));
}

.duck-cave-duck {
  position: absolute;
  width: clamp(7rem, 15vw, 10.2rem);
  height: auto;
  left: 50%;
  bottom: 8%;
  transform: translateX(-50%);
  z-index: 120;
  will-change: left, transform, bottom;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.42));
}

.duck-cave-duck--walk {
  animation:
    duck-cave-stroll 13s linear infinite,
    duck-cave-bob 1.15s ease-in-out infinite;
}

@keyframes duck-cave-stroll {
  0% {
    left: 8%;
    transform: translateX(-50%) scaleX(1);
  }
  46% {
    left: 92%;
    transform: translateX(-50%) scaleX(1);
  }
  50% {
    left: 92%;
    transform: translateX(-50%) scaleX(-1);
  }
  96% {
    left: 8%;
    transform: translateX(-50%) scaleX(-1);
  }
  100% {
    left: 8%;
    transform: translateX(-50%) scaleX(1);
  }
}

@keyframes duck-cave-bob {
  0%, 100% { bottom: 8%; }
  50% { bottom: 9.4%; }
}

@media (max-width: 900px) {
  .duck-cave-card {
    width: clamp(3.8rem, 14vw, 5rem);
    max-width: 21vw;
  }
}
</style>
