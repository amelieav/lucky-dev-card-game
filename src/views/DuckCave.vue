<template>
  <section class="card p-5 space-y-5">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">Duck Cave</h1>
        <p class="text-sm text-muted">All cards stolen by the duck this season.</p>
      </div>
      <p class="text-xs text-muted">Season {{ seasonIdLabel }}</p>
    </div>

    <div v-if="!duckCaveUnlocked" class="rounded-xl border border-soft bg-panel-soft p-4 text-sm text-muted">
      Duck Cave unlocks at Rebirth 1.
    </div>

    <template v-else>
      <div class="grid gap-3 sm:grid-cols-3">
        <article class="rounded-xl border border-soft bg-panel-soft p-3 text-sm">
          <p class="text-xs text-muted">Cards stolen</p>
          <p class="font-semibold">{{ formatNumber(duckTheftCount) }}</p>
        </article>
        <article class="rounded-xl border border-soft bg-panel-soft p-3 text-sm sm:col-span-2">
          <p class="text-xs text-muted">Highest stolen card</p>
          <p class="font-semibold">{{ highestStolenLabel }}</p>
        </article>
      </div>

      <div class="duck-cave-scene" :class="{ 'duck-cave-scene--empty': laidOutEntries.length === 0 }">
        <div class="duck-cave-ground" aria-hidden="true"></div>

        <div v-if="laidOutEntries.length === 0" class="duck-cave-empty-note">
          <p>The duck looks sad. No stolen cards yet this season.</p>
        </div>

        <div
          v-for="entry in laidOutEntries"
          :key="entry.id"
          class="duck-cave-card"
          :style="entry.style"
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
import { computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import TermCard from '../components/game/TermCard.vue'
import { TERMS_BY_KEY } from '../data/terms'
import { getTermPresentation } from '../data/boosterTerms.mjs'
import { getBaseTierFromEffectiveTier, normalizeLayer } from '../lib/packLogic.mjs'

const store = useStore()
const MAX_RENDERED_CARDS = 90

const snapshot = computed(() => store.state.game.snapshot || null)
const playerState = computed(() => snapshot.value?.state || null)
const activeLayer = computed(() => normalizeLayer(playerState.value?.active_layer || 1))
const rebirthCount = computed(() => Math.max(0, Number(playerState.value?.rebirth_count || 0)))
const duckCaveUnlocked = computed(() => rebirthCount.value >= 1 || activeLayer.value > 1)
const seasonIdLabel = computed(() => snapshot.value?.season?.id || 'Unknown')
const duckTheftStats = computed(() => store.state.game.duckTheftStats || {})
const duckTheftCount = computed(() => Math.max(0, Number(duckTheftStats.value?.count || 0)))
const highestStolen = computed(() => duckTheftStats.value?.highest || null)
const highestStolenLabel = computed(() => {
  const entry = highestStolen.value
  if (!entry) return 'None yet'
  const tier = Math.max(0, Number(entry.tier || 0))
  const rarity = String(entry.rarity || 'common').toLowerCase()
  return `${entry.name || 'Unknown Card'} · T${tier || '?'} · ${rarity}`
})
const stolenEntries = computed(() => {
  const rows = Array.isArray(duckTheftStats.value?.entries) ? duckTheftStats.value.entries : []
  return rows.slice(0, MAX_RENDERED_CARDS)
})
const duckSpriteSrc = computed(() => (
  stolenEntries.value.length > 0
    ? duckAsset('walk2.png')
    : duckAsset('cry1.png')
))

const laidOutEntries = computed(() => {
  return stolenEntries.value.map((entry, index) => {
    const layout = layoutForEntry(entry, index)
    const term = TERMS_BY_KEY[entry.termKey] || null
    const presentation = getTermPresentation(entry.termKey, activeLayer.value)
    const effectiveTier = Math.max(1, Number(entry.tier || term?.tier || 1))
    const baseTier = getBaseTierFromEffectiveTier(effectiveTier)
    return {
      ...entry,
      name: entry.name || presentation.name || term?.name || 'Unknown Card',
      icon: presentation.icon || term?.icon || 'help-circle',
      rarity: normalizeRarity(entry.rarity || term?.rarity || 'common'),
      mutation: normalizeMutation(entry.mutation || 'none'),
      value: Math.max(0, Number(entry.value || 0)),
      baseTier,
      style: {
        left: `${layout.left}%`,
        top: `${layout.top}%`,
        transform: `translate(-50%, -50%) rotate(${layout.rotate}deg) scale(${layout.scale})`,
        zIndex: String(layout.zIndex),
      },
      id: entry.id || `${entry.termKey || 'unknown'}-${entry.at || index}-${index}`,
    }
  })
})

onMounted(async () => {
  if (!store.state.game.snapshot) {
    await store.dispatch('game/bootstrapPlayer')
  }
  await store.dispatch('game/hydrateDuckTheftStats')
})

watch(() => snapshot.value?.season?.id, () => {
  void store.dispatch('game/hydrateDuckTheftStats')
})

function hashString(value) {
  const text = String(value || '')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) >>> 0
  }
  return hash >>> 0
}

function layoutForEntry(entry, index) {
  const seed = hashString(`${entry.id || ''}:${entry.termKey || ''}:${entry.at || ''}:${index}`)
  const left = 8 + ((seed % 8400) / 100)
  const top = 18 + (((Math.floor(seed / 37) % 6400) / 100))
  const rotate = -18 + ((Math.floor(seed / 101) % 3600) / 100)
  const scale = 0.82 + ((Math.floor(seed / 211) % 34) / 100)
  const zIndex = 8 + Math.floor(top)
  return {
    left: clamp(left, 8, 92),
    top: clamp(top, 18, 84),
    rotate: clamp(rotate, -20, 20),
    scale: clamp(scale, 0.82, 1.15),
    zIndex,
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
  min-height: 26rem;
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
  width: clamp(4.2rem, 10vw, 6.5rem);
  max-width: 16vw;
  pointer-events: none;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.28));
}

.duck-cave-duck {
  position: absolute;
  width: clamp(5.2rem, 12vw, 7.5rem);
  height: auto;
  left: 50%;
  bottom: 9%;
  transform: translateX(-50%);
  z-index: 120;
  filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.38));
}

.duck-cave-duck--walk {
  animation:
    duck-cave-stroll 16s linear infinite,
    duck-cave-bob 1.6s ease-in-out infinite;
}

@keyframes duck-cave-stroll {
  0% {
    left: 10%;
    transform: translateX(-50%) scaleX(1);
  }
  48% {
    left: 90%;
    transform: translateX(-50%) scaleX(1);
  }
  52% {
    left: 90%;
    transform: translateX(-50%) scaleX(-1);
  }
  100% {
    left: 10%;
    transform: translateX(-50%) scaleX(-1);
  }
}

@keyframes duck-cave-bob {
  0%, 100% { bottom: 9%; }
  50% { bottom: 10.4%; }
}

@media (max-width: 900px) {
  .duck-cave-scene {
    min-height: 22rem;
  }

  .duck-cave-card {
    width: clamp(3.8rem, 14vw, 5rem);
    max-width: 21vw;
  }
}
</style>
