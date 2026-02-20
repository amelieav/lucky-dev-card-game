<template>
  <section class="space-y-4">
    <div class="card p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-wide text-muted">Code-Chicks Unlocked</p>
          <p class="text-xs text-muted">Duplicates increase each chick's earning rate.</p>
        </div>
        <div class="text-right">
          <p class="text-xs text-muted">Coins</p>
          <p class="text-2xl font-semibold">{{ formatNumber(projectedCoins) }}</p>
        </div>
      </div>

      <div class="mt-3 rounded-xl border border-soft bg-panel-soft p-3 text-xs text-muted">
        <p>
          Tier {{ progression.highestTier }} unlocked.
          <span v-if="progression.nextTier">
            Tier {{ progression.nextTier }} unlocks at {{ progression.nextThreshold }} hatches
            ({{ progression.remaining }} remaining).
          </span>
          <span v-else>Max tier unlocked.</span>
        </p>
        <p class="mt-1">
          Current hatch mix:
          <span v-for="tier in Object.keys(currentMixWeights)" :key="tier" class="mr-2">
            T{{ tier }} {{ currentMixWeights[tier] }}%
          </span>
        </p>
      </div>

      <div v-if="codeChicks.length === 0" class="mt-3 rounded-xl border border-dashed border-soft p-3 text-sm text-muted">
        No code-chicks yet. Buy and hatch your first egg.
      </div>

      <div v-else class="mt-3 flex gap-2 overflow-x-auto pb-1">
        <article
          v-for="chick in codeChicks"
          :key="chick.termKey"
          class="min-w-[220px] rounded-xl border border-soft bg-panel-soft p-3"
        >
          <p class="text-sm font-semibold">{{ chick.name }}</p>
          <p class="text-xs text-muted">Tier {{ chick.tier }} · Lv {{ chick.level }} · Copies {{ chick.copies }}</p>
          <p class="mt-1 text-xs text-muted">+{{ chick.earnPerSec.toFixed(3) }}/sec</p>
        </article>
      </div>
    </div>

    <div v-if="gameError" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ gameError }}
    </div>

    <section class="card hatch-card p-6 text-center">
      <p class="text-xs uppercase tracking-wide text-muted">Normal Egg</p>
      <p class="mt-1 text-sm text-muted">Price: {{ NORMAL_EGG_PRICE }} coins</p>

      <div class="egg-shell mx-auto mt-6" :class="{ cracking: hatchPhase === 'cracking' }">
        <span v-if="hatchPhase === 'revealed'" class="egg-face">🐥</span>
        <span v-else class="egg-face">🥚</span>
      </div>

      <p class="mt-4 text-sm text-muted" v-if="hatchPhase === 'idle'">Buy egg to start hatch.</p>
      <p class="mt-4 text-sm text-muted" v-else-if="hatchPhase === 'cracking'">Cracking...</p>
      <p class="mt-4 text-sm text-muted" v-else>Egg hatched.</p>

      <button
        class="btn-primary mt-4"
        type="button"
        :disabled="isHatching || projectedCoins < NORMAL_EGG_PRICE"
        @click="buyAndHatch"
      >
        <span v-if="projectedCoins < NORMAL_EGG_PRICE">Not enough coins</span>
        <span v-else-if="isHatching">Hatching...</span>
        <span v-else>Buy Normal Egg</span>
      </button>

      <div
        v-if="lastHatchResult"
        class="mx-auto mt-4 max-w-md rounded-xl border border-soft bg-panel-soft p-3 text-left"
      >
        <p class="text-xs uppercase tracking-wide text-muted">Hatch Result</p>
        <p class="mt-1 text-base font-semibold">
          Tier {{ lastHatchResult.tier }} · Level {{ lastHatchResult.level }} code-chick:
          {{ termName(lastHatchResult.term_key) }}
        </p>
        <p class="text-xs text-muted">
          Copies: {{ lastHatchResult.copies }} · Earning goes up with each duplicate.
        </p>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { BASE_BP_MULTIPLIER, TERMS_BY_KEY } from '../data/terms'
import { MIX_WEIGHTS, getProgressToNextTier } from '../lib/hatchLogic.mjs'

const NORMAL_EGG_TIER = 1
const NORMAL_EGG_PRICE = 25
const HATCH_DURATION_MS = 2400

const store = useStore()
const nowMs = ref(Date.now())
const hatchPhase = ref('idle')
const isHatching = ref(false)
const lastHatchResult = ref(null)
const displayedTerms = ref([])
let timer = null

const snapshot = computed(() => store.state.game.snapshot)
const playerState = computed(() => snapshot.value?.state || null)
const playerTerms = computed(() => snapshot.value?.terms || [])
const gameError = computed(() => store.state.game.error)
const lastSyncMs = computed(() => Number(store.state.game.lastSyncMs || Date.now()))
const eggsOpened = computed(() => Number(playerState.value?.eggs_opened || 0))

const progression = computed(() => getProgressToNextTier(eggsOpened.value))
const currentMixWeights = computed(() => MIX_WEIGHTS[progression.value.highestTier] || MIX_WEIGHTS[1])

const projectedCoins = computed(() => {
  const state = playerState.value
  if (!state) return 0

  const baseCoins = Number(state.coins || 0)
  const passiveBp = Number(state.passive_rate_bp || 0)
  const elapsedSeconds = Math.max(0, Math.floor((nowMs.value - lastSyncMs.value) / 1000))
  const cappedSeconds = Math.min(12 * 60 * 60, elapsedSeconds)
  const projectedGain = Math.floor((cappedSeconds * passiveBp) / 10000)

  return baseCoins + projectedGain
})

const codeChicks = computed(() => {
  return displayedTerms.value
    .map((row) => {
      const term = TERMS_BY_KEY[row.term_key]
      if (!term) return null

      const level = Number(row.level || 1)
      return {
        termKey: row.term_key,
        name: term.name,
        tier: term.tier,
        level,
        copies: Number(row.copies || 0),
        earnPerSec: ((term.baseBp * BASE_BP_MULTIPLIER) * level) / 10000,
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.tier !== a.tier) return b.tier - a.tier
      if (b.level !== a.level) return b.level - a.level
      return a.name.localeCompare(b.name)
    })
})

watch(
  playerTerms,
  (nextTerms) => {
    // Keep top-row reveal in sync normally, but freeze updates while cracking.
    if (!isHatching.value && hatchPhase.value !== 'cracking') {
      displayedTerms.value = Array.isArray(nextTerms) ? [...nextTerms] : []
    }
  },
  { immediate: true },
)

onMounted(async () => {
  await store.dispatch('auth/initAuth')
  if (!store.state.game.snapshot) {
    await store.dispatch('game/bootstrapPlayer')
  }

  timer = window.setInterval(() => {
    nowMs.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer) {
    window.clearInterval(timer)
  }
})

async function buyAndHatch() {
  if (isHatching.value || projectedCoins.value < NORMAL_EGG_PRICE) return

  isHatching.value = true
  hatchPhase.value = 'cracking'
  lastHatchResult.value = null

  try {
    const hatchDelay = new Promise((resolve) => window.setTimeout(resolve, HATCH_DURATION_MS))
    const openRequest = store.dispatch('game/openEgg', { tier: NORMAL_EGG_TIER })
    await Promise.all([openRequest, hatchDelay])

    const draw = store.state.game.openResult
    if (draw) {
      lastHatchResult.value = draw
      // Reveal new/updated code-chicks only after hatch animation completes.
      displayedTerms.value = [...playerTerms.value]
      hatchPhase.value = 'revealed'
    } else {
      displayedTerms.value = [...playerTerms.value]
      hatchPhase.value = 'idle'
    }
  } finally {
    isHatching.value = false
    window.setTimeout(() => {
      if (!isHatching.value) {
        hatchPhase.value = 'idle'
      }
    }, 1200)
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function termName(termKey) {
  return TERMS_BY_KEY[termKey]?.name || termKey
}
</script>

<style scoped>
.hatch-card {
  min-height: 360px;
}

.egg-shell {
  width: 112px;
  height: 112px;
  border-radius: 9999px;
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, #ffffff, #dce4ff);
  border: 1px solid var(--border-soft);
  box-shadow: 0 10px 22px rgba(34, 53, 107, 0.16);
}

.egg-face {
  font-size: 3rem;
}

.egg-shell.cracking {
  animation: crack 0.35s linear infinite;
}

@keyframes crack {
  0% {
    transform: rotate(0deg) translateX(0px);
  }
  25% {
    transform: rotate(4deg) translateX(2px);
  }
  50% {
    transform: rotate(-4deg) translateX(-2px);
  }
  75% {
    transform: rotate(3deg) translateX(2px);
  }
  100% {
    transform: rotate(0deg) translateX(0px);
  }
}
</style>
