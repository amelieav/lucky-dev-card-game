<template>
  <section class="space-y-4">
    <div class="card p-4 status-strip">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <article class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs text-muted">Coins</p>
          <p class="text-2xl font-semibold">{{ formatNumber(playerCoins) }}</p>
        </article>
        <article class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs text-muted">Packs Opened</p>
          <p class="text-xl font-semibold">{{ formatNumber(playerPacksOpened) }}</p>
        </article>
        <article class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs text-muted">Manual / Auto</p>
          <p class="text-xl font-semibold">{{ formatNumber(playerManualOpens) }} / {{ formatNumber(playerAutoOpens) }}</p>
        </article>
        <article class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs text-muted">Tier Coverage</p>
          <p class="text-xl font-semibold">{{ tierCoverageLabel }}</p>
        </article>
        <article class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs text-muted">Auto Rate</p>
          <p class="text-xl font-semibold">{{ autoRateLabel }}</p>
        </article>
        <article class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs text-muted">Passive Income</p>
          <p class="text-xl font-semibold" :title="passiveIncomeTooltip">+{{ passiveIncomeSummary.totalRate }}/sec</p>
        </article>
      </div>
    </div>

    <div v-if="gameError" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ gameError }}
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <section class="card p-6 lg:col-span-2">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-wide text-muted">{{ autoUnlocked ? 'Auto Roll' : 'Manual Open' }}</p>
            <h1 class="mt-1 text-xl font-semibold">Lucky Agent Card Pack</h1>
            <p class="mt-1 text-sm text-muted">
              {{ autoUnlocked ? 'Single pack opens on a loop. Card tier is rolled by your current odds.' : 'Open the single pack manually until Auto Opener is unlocked.' }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs text-muted">{{ autoUnlocked ? 'Loop Cadence' : 'Open Mode' }}</p>
            <p class="text-sm font-semibold">{{ loopCadenceLabel }}</p>
            <button
              v-if="autoUnlocked"
              class="btn-secondary mt-2"
              type="button"
              :disabled="actionLoading"
              @click="toggleAutoRoll"
            >
              {{ autoRollEnabled ? 'Pause Auto' : 'Resume Auto' }}
            </button>
          </div>
        </div>

        <div
          v-if="autoUnlocked && autoRollEnabled"
          class="manual-pack mt-4"
          :class="`manual-pack--${manualPackPhase}`"
          role="status"
          aria-live="polite"
        >
          <template v-if="manualPackPhase === 'ready'">
            <div class="manual-pack__card" aria-hidden="true"></div>
            <p class="manual-pack__eyebrow">{{ autoRollEnabled ? 'Card pack ready' : 'Auto roll paused' }}</p>
            <p class="manual-pack__title">{{ autoRollEnabled ? 'Waiting for next roll...' : 'Press Resume Auto' }}</p>
            <p class="manual-pack__hint">{{ autoRollEnabled ? 'Tier is decided by probability' : 'Auto opener is unlocked but paused' }}</p>
          </template>

          <template v-else-if="manualPackPhase === 'opening'">
            <div class="manual-pack__card manual-pack__card--opening" aria-hidden="true"></div>
            <div class="manual-pack__spinner" aria-hidden="true"></div>
            <p class="manual-pack__title">Opening card pack...</p>
            <p class="manual-pack__hint">Rolling card tier, rarity, and mutation</p>
          </template>

          <term-card
            v-else-if="manualRevealCard"
            class="manual-pack__preview-card"
            :name="manualRevealCard.name"
            :tier="manualRevealCard.tier"
            :rarity="manualRevealCard.rarity"
            :mutation="manualRevealCard.mutation"
            :icon="manualRevealCard.icon"
            :coins="manualRevealCard.coins"
          />
        </div>

        <button
          v-else
          class="manual-pack manual-pack--interactive mt-4"
          :class="`manual-pack--${manualPackPhase}`"
          type="button"
          :disabled="!canOpenManual"
          @click="openManualPack"
        >
          <template v-if="manualPackPhase === 'ready'">
            <div class="manual-pack__card" aria-hidden="true"></div>
            <p class="manual-pack__eyebrow">{{ autoUnlocked ? 'Auto roll paused' : 'Card pack ready' }}</p>
            <p class="manual-pack__title">{{ autoUnlocked ? 'Tap to open manually' : 'Tap to open' }}</p>
            <p class="manual-pack__hint">{{ autoUnlocked ? 'Resume auto anytime from the button above' : 'Tier is decided by probability' }}</p>
          </template>

          <template v-else-if="manualPackPhase === 'opening'">
            <div class="manual-pack__card manual-pack__card--opening" aria-hidden="true"></div>
            <div class="manual-pack__spinner" aria-hidden="true"></div>
            <p class="manual-pack__title">Opening card pack...</p>
            <p class="manual-pack__hint">Rolling card tier, rarity, and mutation</p>
          </template>

          <term-card
            v-else-if="manualRevealCard"
            class="manual-pack__preview-card"
            :name="manualRevealCard.name"
            :tier="manualRevealCard.tier"
            :rarity="manualRevealCard.rarity"
            :mutation="manualRevealCard.mutation"
            :icon="manualRevealCard.icon"
            :coins="manualRevealCard.coins"
          />
        </button>

        <div v-if="recentDraws.length" class="mt-3 rounded-lg border border-soft bg-panel-soft p-2">
          <p class="text-[11px] uppercase tracking-wide text-muted">Recently opened cards</p>
          <div class="recent-mini-strip mt-2">
            <div
              v-for="(draw, index) in recentDraws"
              :key="`recent-${index}-${draw.term_key}-${draw.copies}-${draw.level}-${draw.reward}`"
              class="recent-mini-card"
              :class="`recent-mini-card--${normalizeMutation(draw.mutation)}`"
            >
              <vue-feather :type="termIcon(draw.term_key)" class="recent-mini-card__icon" stroke-width="2.4" aria-hidden="true"></vue-feather>
              <p class="recent-mini-card__rarity" :class="`recent-mini-card__rarity--${normalizeRarity(draw.rarity)}`">
                {{ normalizeRarity(draw.rarity) }}
              </p>
              <p class="recent-mini-card__mutation">
                {{ mutationStateLabel(draw.mutation) }}
              </p>
            </div>
          </div>
        </div>

      </section>

      <aside class="card p-4 text-sm">
        <p class="text-xs uppercase tracking-wide text-muted">Pack Odds</p>
        <p class="mt-1 text-xs text-muted">Current calculated rates</p>

        <div class="mt-3 space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Tier + Rarity</p>
          <div v-for="rarityRow in rarityRows" :key="`rarity-${rarityRow.tier}`" class="rounded-lg border border-soft bg-panel-soft p-2">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold" :style="{ color: tierColor(rarityRow.tier) }">{{ packName(rarityRow.tier) }}</p>
              <p class="text-xs font-semibold text-main">{{ percent(tierWeightByTier[rarityRow.tier]) }}</p>
            </div>
            <p class="mt-1 text-xs text-muted">
              C {{ percent(rarityRow.weights.common) }} · R {{ percent(rarityRow.weights.rare) }} · L {{ percent(rarityRow.weights.legendary) }}
            </p>
          </div>
        </div>

        <div class="mt-3 space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Mutation</p>
          <div class="rounded-lg border border-soft bg-panel-soft p-2 text-xs text-muted">
            None {{ percent(mutationWeights.none) }} · Foil {{ percent(mutationWeights.foil) }} · Holo {{ percent(mutationWeights.holo) }}
          </div>
          <div class="rounded-lg border border-soft bg-panel-soft p-2 text-xs text-muted">
            <p class="mb-1 font-semibold text-main">Mutation passive bonus</p>
            <p>Foil: +1 coin/sec each card · Holo: +3 coins/sec each card</p>
          </div>
        </div>

        <details class="mt-3 rounded-lg border border-soft bg-panel-soft p-2 text-xs text-muted">
          <summary class="cursor-pointer font-semibold">Why these odds?</summary>
          <p class="mt-2">Value Lv {{ playerState?.value_level || 0 }} shifts rarity. Mutation Lv {{ playerState?.mutation_level || 0 }} shifts mutation quality.</p>
          <p class="mt-1">Tier odds come directly from Tier Boost Lv {{ playerState?.tier_boost_level || 0 }}.</p>
        </details>
      </aside>
    </div>

    <section class="card p-5">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">Shop</h2>
          <p class="text-xs text-muted">Spend coins to improve auto opening, odds, and value.</p>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article v-for="upgrade in shopRows" :key="upgrade.key" class="rounded-xl border border-soft bg-panel-soft p-4">
          <p class="text-xs text-muted">{{ upgrade.label }}</p>
          <p class="mt-1 text-xs text-muted">{{ upgrade.description }}</p>

          <p class="mt-2 text-sm"><span class="font-semibold">Current:</span> {{ upgrade.currentEffect }}</p>
          <p class="text-sm text-muted"><span class="font-semibold text-main">Next:</span> {{ upgrade.nextEffect || 'Maxed' }}</p>
          <div v-if="upgrade.key === 'tier_boost'" class="mt-2 rounded-lg border border-soft bg-white/70 p-2 text-xs text-muted">
            <p><span class="font-semibold text-main">Effective now:</span> {{ upgrade.tierOddsNow }}</p>
            <p v-if="upgrade.tierOddsAfterBuy"><span class="font-semibold text-main">After buy:</span> {{ upgrade.tierOddsAfterBuy }}</p>
            <p v-if="upgrade.tierOddsUnchangedNextLevel">
              No immediate odds change at next level.
              <span v-if="upgrade.nextTierOddsChangeLevel">Next odds shift at Tier Boost Lv {{ upgrade.nextTierOddsChangeLevel }}.</span>
            </p>
            <p class="mt-1">This directly updates the Pack Odds tier panel.</p>
          </div>

          <div class="mt-3 flex items-center justify-between">
            <p class="text-sm font-semibold">{{ upgrade.cost == null ? 'MAX' : `${formatNumber(upgrade.cost)} coins` }}</p>
            <button class="btn-primary" type="button" :disabled="!upgrade.canBuy || actionLoading" @click="buyUpgrade(upgrade.key)">
              {{ upgrade.cost == null ? 'Maxed' : 'Buy' }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="card p-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Card Book</h2>
        <p class="text-xs text-muted">{{ totalCollectedCards }}/{{ TERMS.length }} discovered</p>
      </div>

      <div class="space-y-4">
        <section
          v-for="tierRow in cardBookByTier"
          :key="`tier-book-${tierRow.tier}`"
          class="rounded-xl border border-soft bg-panel-soft p-3"
        >
          <div class="mb-2 flex items-center justify-between">
            <p class="text-sm font-semibold" :style="{ color: tierColor(tierRow.tier) }">{{ packName(tierRow.tier) }}</p>
            <p class="text-xs text-muted">{{ tierRow.collected }}/{{ tierRow.items.length }} found</p>
          </div>

          <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div v-for="item in tierRow.items" :key="item.termKey" class="space-y-1">
              <term-card
                :name="item.name"
                :tier="item.tier"
                :rarity="item.rarity"
                :mutation="item.bestMutation"
                :icon="item.icon"
                :coins="item.value"
                :unknown="!item.owned"
              />
              <div class="rounded-md border border-soft bg-white/70 px-2 py-1 text-[11px] text-muted">
                <p>Slot {{ item.slot }} · Copies {{ item.copies }}</p>
                <p>Best Mutation: {{ mutationLabel(item.bestMutation) }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>

    <debug-panel
      v-if="debugEnabled"
      :open="debugPanelOpen"
      :loading="actionLoading"
      :debug-allowed="debugAllowed"
      :term-options="termOptions"
      :last-error="debugLastError"
      :last-result="debugLastResult"
      @toggle="toggleDebugPanel"
      @apply="applyDebugAction"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import DebugPanel from '../components/game/DebugPanel.vue'
import TermCard from '../components/game/TermCard.vue'
import { TERMS, TERMS_BY_KEY } from '../data/terms'
import { BALANCE_CONFIG } from '../lib/balanceConfig.mjs'
import {
  SHOP_UPGRADES,
  getAutoOpenIntervalMs,
  canBuyUpgrade,
  computeCardReward,
  getEffectiveTierWeights,
  getMutationWeights,
  getNextTierOddsChangeLevel,
  getPassiveIncomeSummaryFromTerms,
  getRarityWeightsForTier,
  getUpgradeCost,
  getUpgradePreview,
} from '../lib/packLogic.mjs'

const LOCAL_ECONOMY_ENABLED = import.meta.env.VITE_LOCAL_ECONOMY === '1'
const MUTATION_ORDER = ['none', 'foil', 'holo']
const TIER_COLOR_MAP = BALANCE_CONFIG.tierColors || {}

const store = useStore()
const manualPackPhase = ref('ready')
const manualRevealDraw = ref(null)
const displayedRecentDraws = ref([])
const autoRollEnabled = ref(true)

const REVEAL_READ_MS = 2750
const MANUAL_OPENING_EXTRA_MS = 500
const AUTO_OPENING_MS = 420

let autoRollTimer = null
let syncTimer = null
let viewActive = true

const snapshot = computed(() => store.state.game.snapshot)
const playerState = computed(() => snapshot.value?.state || null)
const playerTerms = computed(() => snapshot.value?.terms || [])
const gameError = computed(() => store.state.game.error)
const actionLoading = computed(() => store.state.game.actionLoading)
const recentDraws = computed(() => displayedRecentDraws.value)

const debugEnabled = computed(() => store.state.debug.enabled)
const debugPanelOpen = computed(() => store.state.debug.panelOpen)
const debugLastError = computed(() => store.state.debug.lastError)
const debugLastResult = computed(() => store.state.debug.lastResult)
const debugAllowed = computed(() => store.state.game.debugAllowed)

const playerCoins = computed(() => Number(playerState.value?.coins || 0))
const playerPacksOpened = computed(() => Number(playerState.value?.packs_opened || 0))
const playerManualOpens = computed(() => Number(playerState.value?.manual_opens || 0))
const playerAutoOpens = computed(() => Number(playerState.value?.auto_opens || 0))
const autoUnlocked = computed(() => Boolean(playerState.value?.auto_unlocked))

const autoLoopDelayMs = computed(() => {
  return autoUnlocked.value
    ? Number(getAutoOpenIntervalMs(playerState.value || {}) || 2500)
    : BALANCE_CONFIG.manualOpenCooldownMs
})
const autoRateLabel = computed(() => {
  if (!autoUnlocked.value) return 'Locked'
  if (!autoRollEnabled.value) return `Paused (${(autoLoopDelayMs.value / 1000).toFixed(1)}s wait)`
  return `1 pack / ${(autoLoopDelayMs.value / 1000).toFixed(1)}s`
})
const loopCadenceLabel = computed(() => {
  if (!autoUnlocked.value) return `1 click / ${(BALANCE_CONFIG.manualOpenCooldownMs / 1000).toFixed(1)}s`
  if (!autoRollEnabled.value) return `Paused · ${(autoLoopDelayMs.value / 1000).toFixed(1)}s wait`
  return `1 pack / ${(autoLoopDelayMs.value / 1000).toFixed(1)}s`
})

const tierWeights = computed(() => getEffectiveTierWeights(playerState.value || {}))
const mutationWeights = computed(() => getMutationWeights(playerState.value?.mutation_level || 0))
const passiveIncomeSummary = computed(() => getPassiveIncomeSummaryFromTerms(playerTerms.value))
const passiveIncomeTooltip = computed(() => {
  return `Foil cards (${passiveIncomeSummary.value.foilCards}) +${passiveIncomeSummary.value.foilRate}/sec\nHolo cards (${passiveIncomeSummary.value.holoCards}) +${passiveIncomeSummary.value.holoRate}/sec`
})

const tierRows = computed(() => {
  return Object.entries(tierWeights.value)
    .map(([tier, weight]) => ({ tier: Number(tier), weight: Number(weight) }))
    .sort((a, b) => a.tier - b.tier)
})
const tierWeightByTier = computed(() => {
  return tierRows.value.reduce((acc, row) => {
    acc[row.tier] = Number(row.weight || 0)
    return acc
  }, {})
})
const tierCoverageLabel = computed(() => {
  const available = tierRows.value
    .filter((row) => Number(row.weight || 0) > 0)
    .map((row) => row.tier)

  if (available.length === 0) return 'T1'
  if (available.length === 1) return `T${available[0]}`
  return `T${available[0]}-T${available[available.length - 1]}`
})

const rarityRows = computed(() => {
  const rows = []
  for (let tier = 1; tier <= 6; tier += 1) {
    rows.push({
      tier,
      weights: getRarityWeightsForTier(tier, playerState.value?.value_level || 0),
    })
  }
  return rows
})

const manualRevealCard = computed(() => {
  if (!manualRevealDraw.value) return null
  const term = TERMS_BY_KEY[manualRevealDraw.value.term_key]

  return {
    name: term?.name || manualRevealDraw.value.term_name || manualRevealDraw.value.term_key || 'Unknown Card',
    tier: Number(manualRevealDraw.value.tier || term?.tier || 1),
    rarity: manualRevealDraw.value.rarity || term?.rarity || 'common',
    mutation: normalizeMutation(manualRevealDraw.value.mutation || 'none'),
    icon: term?.icon || 'help-circle',
    coins: Number(manualRevealDraw.value.reward || 0),
  }
})

const ownedTermsByKey = computed(() => {
  return playerTerms.value.reduce((acc, row) => {
    acc[row.term_key] = row
    return acc
  }, {})
})

const cardBookRows = computed(() => {
  return TERMS.map((term, index) => {
    const owned = ownedTermsByKey.value[term.key]
    const copies = Math.max(0, Number(owned?.copies || 0))
    const bestMutation = normalizeMutation(owned?.best_mutation || 'none')

    return {
      termKey: term.key,
      slot: index + 1,
      icon: term.icon || 'help-circle',
      name: term.name,
      tier: Number(term.tier || 1),
      rarity: term.rarity,
      value: computeCardReward({
        baseBp: term.baseBp,
        rarity: term.rarity,
        mutation: 'none',
        valueLevel: 0,
      }),
      copies,
      owned: copies > 0,
      bestMutation,
    }
  })
})

const totalCollectedCards = computed(() => {
  return cardBookRows.value.filter((row) => row.owned).length
})

const cardBookByTier = computed(() => {
  const rows = []
  for (let tier = 1; tier <= 6; tier += 1) {
    const items = cardBookRows.value
      .filter((row) => row.tier === tier)
      .map((row, index) => ({
        ...row,
        slot: index + 1,
      }))
    rows.push({
      tier,
      items,
      collected: items.filter((row) => row.owned).length,
    })
  }
  return rows
})

const shopRows = computed(() => {
  const state = playerState.value || {}

  return SHOP_UPGRADES.map((upgrade) => {
    const preview = getUpgradePreview(state, upgrade.key)
    const cost = getUpgradeCost(state, upgrade.key)
    const baseRow = {
      ...upgrade,
      cost,
      currentEffect: preview.current,
      nextEffect: preview.next,
      canBuy: canBuyUpgrade(state, upgrade.key),
    }

    if (upgrade.key !== 'tier_boost') {
      return baseRow
    }

    const currentLevel = Math.max(0, Number(state.tier_boost_level || 0))
    const nextLevel = currentLevel + 1
    const currentTierWeights = getEffectiveTierWeights({ ...state, tier_boost_level: currentLevel })
    const nextTierWeights = getEffectiveTierWeights({ ...state, tier_boost_level: nextLevel })
    const unchanged = areTierWeightsEqual(currentTierWeights, nextTierWeights)

    return {
      ...baseRow,
      tierOddsNow: formatTierOdds(currentTierWeights),
      tierOddsAfterBuy: cost == null ? null : formatTierOdds(nextTierWeights),
      tierOddsUnchangedNextLevel: cost != null && unchanged,
      nextTierOddsChangeLevel: getNextTierOddsChangeLevel(currentLevel),
    }
  })
})

const canRunAutoRoll = computed(() => {
  return autoUnlocked.value
    && autoRollEnabled.value
    && !!playerState.value
    && !actionLoading.value
    && manualPackPhase.value === 'ready'
})
const canOpenManual = computed(() => {
  return (!autoUnlocked.value || !autoRollEnabled.value)
    && !!playerState.value
    && !actionLoading.value
    && manualPackPhase.value === 'ready'
})

const termOptions = TERMS.map((term) => ({ key: term.key, name: term.name }))

onMounted(async () => {
  viewActive = true
  await store.dispatch('auth/initAuth')
  if (!store.state.game.snapshot) {
    await store.dispatch('game/bootstrapPlayer')
  }

  displayedRecentDraws.value = [...(store.state.game.recentDraws || [])]

  if (autoUnlocked.value && autoRollEnabled.value) {
    scheduleAutoRoll(120)
  }

  if (LOCAL_ECONOMY_ENABLED) {
    syncTimer = window.setInterval(async () => {
      if (!store.state.game.actionLoading && !autoUnlocked.value) {
        await store.dispatch('game/syncPlayer')
      }
    }, 1000)
  }
})

onUnmounted(() => {
  viewActive = false
  if (autoRollTimer) {
    window.clearTimeout(autoRollTimer)
  }

  if (syncTimer) {
    window.clearInterval(syncTimer)
  }
})

watch(autoUnlocked, (enabled) => {
  if (!enabled) {
    autoRollEnabled.value = true
    if (autoRollTimer) {
      window.clearTimeout(autoRollTimer)
      autoRollTimer = null
    }
    return
  }

  if (manualPackPhase.value === 'ready' && autoRollEnabled.value) {
    scheduleAutoRoll(120)
  }
})

watch(autoLoopDelayMs, () => {
  if (!autoUnlocked.value || !autoRollEnabled.value) return
  if (manualPackPhase.value === 'ready') {
    scheduleAutoRoll(120)
  }
})

watch(autoRollEnabled, (enabled) => {
  if (!enabled) {
    if (autoRollTimer) {
      window.clearTimeout(autoRollTimer)
      autoRollTimer = null
    }
    return
  }

  if (autoUnlocked.value && manualPackPhase.value === 'ready') {
    scheduleAutoRoll(120)
  }
})

function scheduleAutoRoll(delayMs = 120) {
  if (!viewActive) return

  if (autoRollTimer) {
    window.clearTimeout(autoRollTimer)
  }

  if (!autoUnlocked.value || !autoRollEnabled.value) return

  autoRollTimer = window.setTimeout(() => {
    void runAutoRollTick()
  }, delayMs)
}

async function runAutoRollTick() {
  if (!viewActive) return

  if (!canRunAutoRoll.value) {
    scheduleAutoRoll(180)
    return
  }

  await runAutoRollCycle()
  scheduleAutoRoll(80)
}

async function runAutoRollCycle() {
  if (!canRunAutoRoll.value) return

  const waitMs = Math.max(0, Number(autoLoopDelayMs.value || 0))
  if (waitMs > 0) {
    await sleep(waitMs)
    if (!canRunAutoRoll.value) return
  }

  const previousDraw = store.state.game.openResult
  manualRevealDraw.value = null
  await store.dispatch('game/openPack', { source: 'auto' })

  const draw = store.state.game.openResult
  const hasFreshDraw = !store.state.game.error && draw && draw !== previousDraw

  if (!hasFreshDraw) {
    manualPackPhase.value = 'ready'
    if (autoUnlocked.value && autoRollEnabled.value) {
      scheduleAutoRoll(120)
    }
    return
  }

  manualPackPhase.value = 'opening'
  await sleep(AUTO_OPENING_MS)
  if (!viewActive) return
  manualRevealDraw.value = draw
  manualPackPhase.value = 'reveal'
  await sleep(REVEAL_READ_MS)
  manualPackPhase.value = 'ready'
  appendRecentDraw(draw)
  if (autoUnlocked.value && autoRollEnabled.value) {
    scheduleAutoRoll(120)
  }
}

async function openManualPack() {
  if (!canOpenManual.value) return

  const cycle = getCycleDurations(BALANCE_CONFIG.manualOpenCooldownMs)
  const previousDraw = store.state.game.openResult
  manualRevealDraw.value = null
  await store.dispatch('game/openPack', {
    source: 'manual',
    pauseAutoProgress: autoUnlocked.value && !autoRollEnabled.value,
  })

  const draw = store.state.game.openResult
  const hasFreshDraw = !store.state.game.error && draw && draw !== previousDraw

  if (!hasFreshDraw) {
    manualPackPhase.value = 'ready'
    if (autoUnlocked.value && autoRollEnabled.value) {
      scheduleAutoRoll(120)
    }
    return
  }

  manualPackPhase.value = 'opening'
  await sleep(cycle.openingMs + MANUAL_OPENING_EXTRA_MS)
  manualRevealDraw.value = draw
  manualPackPhase.value = 'reveal'
  await sleep(REVEAL_READ_MS)
  manualPackPhase.value = 'ready'
  appendRecentDraw(draw)
  if (autoUnlocked.value && autoRollEnabled.value) {
    scheduleAutoRoll(120)
  }
}

async function buyUpgrade(upgradeKey) {
  await store.dispatch('game/buyUpgrade', { upgradeKey })
}

function toggleAutoRoll() {
  if (!autoUnlocked.value) return
  autoRollEnabled.value = !autoRollEnabled.value
}

function appendRecentDraw(draw) {
  if (!draw) return
  displayedRecentDraws.value = [draw, ...displayedRecentDraws.value]
    .slice(0, 5)
}

async function toggleDebugPanel() {
  await store.dispatch('debug/togglePanel')
}

async function applyDebugAction(action) {
  await store.dispatch('game/debugApply', action)
}

function packName(tier) {
  const normalized = Number(tier || 1)
  return BALANCE_CONFIG.packTierNames?.[normalized] || `Tier ${normalized}`
}

function tierColor(tier) {
  return TIER_COLOR_MAP[Number(tier || 1)] || 'var(--text-main)'
}

function termName(termKey) {
  return TERMS_BY_KEY[termKey]?.name || termKey
}

function termIcon(termKey) {
  return TERMS_BY_KEY[termKey]?.icon || 'help-circle'
}

function percent(value) {
  return `${Number(value || 0).toFixed(2)}%`
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function normalizeMutation(mutation) {
  const key = String(mutation || '').trim().toLowerCase()
  if (key === 'glitched' || key === 'prismatic') return 'holo'
  return MUTATION_ORDER.includes(key) ? key : 'none'
}

function mutationLabel(mutation) {
  const normalized = normalizeMutation(mutation)
  if (normalized === 'none') return 'None'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function mutationStateLabel(mutation) {
  const normalized = normalizeMutation(mutation)
  if (normalized === 'foil') return 'FOIL'
  if (normalized === 'holo') return 'HOLO'
  return 'NO EFFECT'
}

function normalizeRarity(rarity) {
  const key = String(rarity || '').trim().toLowerCase()
  if (key === 'rare' || key === 'legendary') return key
  return 'common'
}

function areTierWeightsEqual(a, b) {
  for (const tier of [1, 2, 3, 4, 5, 6]) {
    if (Math.abs(Number(a?.[tier] || 0) - Number(b?.[tier] || 0)) > 0.0001) {
      return false
    }
  }
  return true
}

function formatTierOdds(weights) {
  return [1, 2, 3, 4, 5, 6]
    .filter((tier) => Number(weights?.[tier] || 0) > 0)
    .map((tier) => `${packName(tier)} ${Number(weights[tier]).toFixed(1)}%`)
    .join(' · ')
}

function getCycleDurations(totalMs) {
  const total = Math.max(500, Number(totalMs || 1500))
  const openingMs = Math.max(220, Math.round(total * 0.45))
  const revealMs = Math.max(220, total - openingMs)
  return { openingMs, revealMs }
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
</script>

<style scoped>
.status-strip {
  position: sticky;
  top: 0.5rem;
  z-index: 30;
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(120, 143, 194, 0.35);
  box-shadow: 0 10px 24px rgba(23, 42, 94, 0.14);
}

.manual-pack {
  width: min(250px, 100%);
  min-height: 340px;
  margin: 0 auto;
  border-radius: 1.1rem;
  border: 1px solid var(--border-soft);
  padding: 1.1rem 0.9rem;
  text-align: center;
  box-shadow: 0 16px 28px rgba(31, 56, 128, 0.2);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.manual-pack--interactive {
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.manual-pack--interactive:disabled {
  opacity: 0.78;
  cursor: not-allowed;
}

.manual-pack--interactive:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 32px rgba(31, 56, 128, 0.24);
}

.manual-pack--ready {
  color: #ffffff;
  background: linear-gradient(145deg, #4a6fe8, #3858c7);
}

.manual-pack--opening {
  color: #ffffff;
  background: linear-gradient(145deg, #324279, #24335f);
}

.manual-pack--reveal {
  color: var(--text-main);
  background: linear-gradient(145deg, #ffffff, #ecf3ff);
}

.manual-pack__card {
  width: 122px;
  height: 168px;
  margin-bottom: 0.8rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.44), rgba(255, 255, 255, 0.18));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 10px 20px rgba(19, 33, 89, 0.28);
  animation: pack-bob 1.8s ease-in-out infinite;
}

.manual-pack__card--opening {
  animation: pack-bob 0.8s ease-in-out infinite;
}

.manual-pack__eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.68rem;
  font-weight: 600;
  opacity: 0.85;
}

.manual-pack__title {
  margin: 0.35rem 0 0;
  font-size: 1.35rem;
  line-height: 1.2;
  font-weight: 700;
}

.manual-pack__hint {
  margin: 0.45rem 0 0;
  font-size: 0.82rem;
  opacity: 0.88;
}

.manual-pack__reward {
  margin: 0.5rem 0 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.manual-pack__preview-card {
  width: min(228px, 96%);
}

.recent-mini-strip {
  display: flex;
  gap: 0.45rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.recent-mini-card {
  min-width: 76px;
  border-radius: 0.7rem;
  border: 1px solid var(--border-soft);
  background: rgba(255, 255, 255, 0.82);
  padding: 0.38rem 0.34rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.14rem;
}

.recent-mini-card__icon {
  width: 1rem;
  height: 1rem;
  color: #172342;
}

.recent-mini-card__rarity {
  font-size: 0.56rem;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 800;
}

.recent-mini-card__rarity--common {
  color: #f08a24;
}

.recent-mini-card__rarity--rare {
  color: #d64242;
}

.recent-mini-card__rarity--legendary {
  color: #7e4bc9;
}

.recent-mini-card__mutation {
  font-size: 0.52rem;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #4a5f8c;
  font-weight: 700;
}

.recent-mini-card--foil {
  background:
    linear-gradient(145deg, rgba(255, 230, 190, 0.9), rgba(255, 255, 255, 0.88)),
    rgba(255, 255, 255, 0.82);
}

.recent-mini-card--holo {
  background:
    linear-gradient(145deg, rgba(218, 246, 255, 0.9), rgba(247, 224, 255, 0.82), rgba(255, 255, 255, 0.86)),
    rgba(255, 255, 255, 0.82);
}

.manual-pack__spinner {
  width: 40px;
  height: 40px;
  margin-bottom: 0.6rem;
  border-radius: 9999px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  animation: pack-spin 0.9s linear infinite;
}

@keyframes pack-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pack-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
</style>
