<template>
  <section class="space-y-4">
    <div class="card p-4">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
          <p class="text-xs text-muted">Highest Tier</p>
          <p class="text-xl font-semibold">Tier {{ highestTierUnlocked }}</p>
        </article>
        <article class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs text-muted">Auto Rate</p>
          <p class="text-xl font-semibold">{{ autoRateLabel }}</p>
        </article>
      </div>

      <div class="mt-3 rounded-xl border border-soft bg-panel-soft p-3 text-xs text-muted">
        <p>
          Next unlock:
          <span v-if="progression.nextTier">
            Tier {{ progression.nextTier }} requires {{ progression.requirement?.packsOpened }} packs and Tier Boost Lv {{ progression.requirement?.tierBoostLevel }}.
            Remaining: {{ progression.remainingPacks }} packs, {{ progression.remainingTierBoost }} Tier Boost.
          </span>
          <span v-else>All tiers unlocked.</span>
        </p>
      </div>
    </div>

    <div v-if="gameError" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ gameError }}
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <section class="card p-6 lg:col-span-2">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-wide text-muted">Manual Open</p>
            <h1 class="mt-1 text-xl font-semibold">Starter Card Pack</h1>
            <p class="mt-1 text-sm text-muted">
              Free to open. Rolls tier, rarity, mutation, then rewards coins.
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs text-muted">Manual Cadence</p>
            <p class="text-sm font-semibold">1 pack / 1.2s</p>
          </div>
        </div>

        <button
          class="btn-primary mt-4"
          type="button"
          :disabled="!canOpenManual"
          @click="openManualPack"
        >
          <span v-if="actionLoading">Opening...</span>
          <span v-else-if="manualCooldownRemainingMs > 0">Cooldown {{ (manualCooldownRemainingMs / 1000).toFixed(1) }}s</span>
          <span v-else>Open Pack</span>
        </button>

        <div v-if="lastDraw" class="mt-4 rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs uppercase tracking-wide text-muted">Latest Draw</p>
          <p class="mt-1 text-base font-semibold">
            {{ packName(lastDraw.tier) }} · {{ termName(lastDraw.term_key) }}
          </p>
          <p class="mt-1 text-xs text-muted">
            {{ lastDraw.rarity }} · {{ lastDraw.mutation }} · +{{ formatNumber(lastDraw.reward) }} coins
          </p>
          <p class="mt-1 text-xs text-muted">Copies {{ lastDraw.copies }} · Level {{ lastDraw.level }} · {{ lastDraw.source }}</p>
        </div>
      </section>

      <aside class="card p-4 text-sm">
        <p class="text-xs uppercase tracking-wide text-muted">Pack Odds</p>
        <p class="mt-1 text-xs text-muted">Current calculated rates</p>

        <div class="mt-3 space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Tier</p>
          <div v-for="tier in tierRows" :key="`tier-${tier.tier}`" class="flex items-center justify-between rounded-lg border border-soft bg-panel-soft px-3 py-2">
            <span>{{ packName(tier.tier) }}</span>
            <span>{{ percent(tier.weight) }}</span>
          </div>
        </div>

        <div class="mt-3 space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Rarity by Draw Tier</p>
          <div v-for="rarityRow in rarityRows" :key="`rarity-${rarityRow.tier}`" class="rounded-lg border border-soft bg-panel-soft p-2">
            <p class="text-xs font-semibold">{{ packName(rarityRow.tier) }}</p>
            <p class="text-xs text-muted">
              C {{ percent(rarityRow.weights.common) }} · R {{ percent(rarityRow.weights.rare) }} · E {{ percent(rarityRow.weights.epic) }} · L {{ percent(rarityRow.weights.legendary) }}
            </p>
          </div>
        </div>

        <div class="mt-3 space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Mutation</p>
          <div class="rounded-lg border border-soft bg-panel-soft p-2 text-xs text-muted">
            None {{ percent(mutationWeights.none) }} · Foil {{ percent(mutationWeights.foil) }} · Holo {{ percent(mutationWeights.holo) }}
            · Glitched {{ percent(mutationWeights.glitched) }} · Prismatic {{ percent(mutationWeights.prismatic) }}
          </div>
          <div class="rounded-lg border border-soft bg-panel-soft p-2 text-xs text-muted">
            <p class="mb-1 font-semibold text-main">Mutation coin multiplier</p>
            <p>
              <span
                v-for="entry in mutationMultiplierRows"
                :key="entry.mutation"
                class="mr-2 inline-block"
              >
                {{ entry.label }} x{{ entry.multiplier.toFixed(2) }}
              </span>
            </p>
          </div>
        </div>

        <details class="mt-3 rounded-lg border border-soft bg-panel-soft p-2 text-xs text-muted">
          <summary class="cursor-pointer font-semibold">Why these odds?</summary>
          <p class="mt-2">Luck Lv {{ playerState?.luck_level || 0 }} shifts rarity. Mutation Lv {{ playerState?.mutation_level || 0 }} shifts mutation quality.</p>
          <p class="mt-1">Tier odds come from Tier Boost Lv {{ playerState?.tier_boost_level || 0 }} with lock redistribution to unlocked tiers.</p>
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
        <h2 class="text-lg font-semibold">Card Collection</h2>
        <p class="text-xs text-muted">Collection is secondary; cards are your reward generator.</p>
      </div>

      <div v-if="cards.length === 0" class="rounded-xl border border-dashed border-soft p-6 text-sm text-muted">
        No cards yet. Open your first pack.
      </div>

      <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="item in cards"
          :key="item.termKey"
          class="rounded-xl border border-soft bg-white p-4"
          :style="cardMutationStyle(item.bestMutation)"
        >
          <div class="flex items-start justify-between gap-3">
            <h3 class="text-sm font-semibold">{{ item.name }}</h3>
            <div class="flex items-center gap-1.5">
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                :style="mutationBadgeStyle(item.bestMutation)"
              >
                {{ mutationLabel(item.bestMutation) }}
              </span>
              <span class="rounded-full px-2 py-0.5 text-xs text-white" :style="{ background: rarityColor(item.rarity) }">{{ item.rarity }}</span>
            </div>
          </div>

          <p class="mt-1 text-xs text-muted">{{ packName(item.tier) }}</p>
          <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <p class="text-xs text-muted">Copies</p>
              <p class="font-medium">{{ item.copies }}</p>
            </div>
            <div>
              <p class="text-xs text-muted">Level</p>
              <p class="font-medium">Lv {{ item.level }}</p>
            </div>
          </div>
        </article>
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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useStore } from 'vuex'
import DebugPanel from '../components/game/DebugPanel.vue'
import { RARITY_COLORS, TERMS, TERMS_BY_KEY } from '../data/terms'
import { BALANCE_CONFIG } from '../lib/balanceConfig.mjs'
import {
  PACK_NAMES_BY_TIER,
  SHOP_UPGRADES,
  canBuyUpgrade,
  getAutoOpensPerSecond,
  getEffectiveTierWeights,
  getMutationWeights,
  getNextTierOddsChangeLevel,
  getProgressToNextTier,
  getRarityWeightsForTier,
  getUpgradeCost,
  getUpgradePreview,
} from '../lib/packLogic.mjs'

const LOCAL_ECONOMY_ENABLED = import.meta.env.VITE_LOCAL_ECONOMY !== '0'
const MUTATION_ORDER = ['none', 'foil', 'holo', 'glitched', 'prismatic']
const MUTATION_STYLE_MAP = {
  none: {
    badgeText: '#5f6f93',
    badgeBg: 'rgba(95, 111, 147, 0.1)',
    badgeBorder: 'rgba(95, 111, 147, 0.24)',
    cardBorder: 'var(--border-soft)',
    cardBg: 'linear-gradient(140deg, rgba(255,255,255,1), rgba(255,255,255,1))',
  },
  foil: {
    badgeText: '#1b5fb8',
    badgeBg: 'rgba(64, 150, 246, 0.14)',
    badgeBorder: 'rgba(64, 150, 246, 0.35)',
    cardBorder: 'rgba(64, 150, 246, 0.3)',
    cardBg: 'linear-gradient(140deg, rgba(64,150,246,0.08), rgba(255,255,255,1) 55%)',
  },
  holo: {
    badgeText: '#1f7f89',
    badgeBg: 'rgba(53, 189, 206, 0.14)',
    badgeBorder: 'rgba(53, 189, 206, 0.35)',
    cardBorder: 'rgba(53, 189, 206, 0.33)',
    cardBg: 'linear-gradient(140deg, rgba(53,189,206,0.08), rgba(255,255,255,1) 55%)',
  },
  glitched: {
    badgeText: '#6d31bf',
    badgeBg: 'rgba(145, 70, 245, 0.14)',
    badgeBorder: 'rgba(145, 70, 245, 0.35)',
    cardBorder: 'rgba(145, 70, 245, 0.35)',
    cardBg: 'linear-gradient(140deg, rgba(145,70,245,0.09), rgba(255,255,255,1) 55%)',
  },
  prismatic: {
    badgeText: '#9e4f10',
    badgeBg: 'rgba(236, 146, 56, 0.16)',
    badgeBorder: 'rgba(236, 146, 56, 0.4)',
    cardBorder: 'rgba(236, 146, 56, 0.42)',
    cardBg: 'linear-gradient(140deg, rgba(236,146,56,0.12), rgba(255,255,255,1) 55%)',
  },
}

const store = useStore()
const nowMs = ref(Date.now())
const manualLockedUntilMs = ref(0)

let clockTimer = null
let syncTimer = null

const snapshot = computed(() => store.state.game.snapshot)
const playerState = computed(() => snapshot.value?.state || null)
const playerTerms = computed(() => snapshot.value?.terms || [])
const gameError = computed(() => store.state.game.error)
const actionLoading = computed(() => store.state.game.actionLoading)
const lastDraw = computed(() => store.state.game.openResult)

const debugEnabled = computed(() => store.state.debug.enabled)
const debugPanelOpen = computed(() => store.state.debug.panelOpen)
const debugLastError = computed(() => store.state.debug.lastError)
const debugLastResult = computed(() => store.state.debug.lastResult)
const debugAllowed = computed(() => store.state.game.debugAllowed)

const playerCoins = computed(() => Number(playerState.value?.coins || 0))
const playerPacksOpened = computed(() => Number(playerState.value?.packs_opened || 0))
const playerManualOpens = computed(() => Number(playerState.value?.manual_opens || 0))
const playerAutoOpens = computed(() => Number(playerState.value?.auto_opens || 0))
const highestTierUnlocked = computed(() => Number(playerState.value?.highest_tier_unlocked || 1))

const autoRate = computed(() => getAutoOpensPerSecond(playerState.value || {}))
const autoRateLabel = computed(() => (autoRate.value > 0 ? `${autoRate.value.toFixed(2)} packs/sec` : 'Locked'))

const progression = computed(() => getProgressToNextTier(playerState.value || {}))
const tierWeights = computed(() => getEffectiveTierWeights(playerState.value || {}))
const mutationWeights = computed(() => getMutationWeights(playerState.value?.mutation_level || 0))
const mutationMultiplierRows = computed(() => {
  return MUTATION_ORDER.map((mutation) => ({
    mutation,
    label: mutationLabel(mutation),
    multiplier: Number(BALANCE_CONFIG.mutationRewardMultipliers?.[mutation] || 1),
  }))
})

const tierRows = computed(() => {
  return Object.entries(tierWeights.value)
    .map(([tier, weight]) => ({ tier: Number(tier), weight: Number(weight) }))
    .sort((a, b) => a.tier - b.tier)
})

const rarityRows = computed(() => {
  const rows = []
  for (let tier = 1; tier <= highestTierUnlocked.value; tier += 1) {
    rows.push({
      tier,
      weights: getRarityWeightsForTier(tier, playerState.value?.luck_level || 0),
    })
  }
  return rows
})

const cards = computed(() => {
  return playerTerms.value
    .map((row) => {
      const term = TERMS_BY_KEY[row.term_key]
      if (!term) return null
      return {
        termKey: row.term_key,
        name: term.name,
        tier: term.tier,
        rarity: term.rarity,
        copies: Number(row.copies || 0),
        level: Number(row.level || 1),
        bestMutation: normalizeMutation(row.best_mutation || 'none'),
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.tier !== a.tier) return b.tier - a.tier
      if (b.level !== a.level) return b.level - a.level
      return a.name.localeCompare(b.name)
    })
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

const manualCooldownRemainingMs = computed(() => Math.max(0, manualLockedUntilMs.value - nowMs.value))
const canOpenManual = computed(() => {
  return !!playerState.value && !actionLoading.value && manualCooldownRemainingMs.value <= 0
})

const termOptions = TERMS.map((term) => ({ key: term.key, name: term.name }))

onMounted(async () => {
  await store.dispatch('auth/initAuth')
  if (!store.state.game.snapshot) {
    await store.dispatch('game/bootstrapPlayer')
  }

  clockTimer = window.setInterval(() => {
    nowMs.value = Date.now()
  }, 120)

  if (LOCAL_ECONOMY_ENABLED) {
    syncTimer = window.setInterval(async () => {
      if (!store.state.game.actionLoading) {
        await store.dispatch('game/syncPlayer')
      }
    }, 1000)
  }
})

onUnmounted(() => {
  if (clockTimer) {
    window.clearInterval(clockTimer)
  }

  if (syncTimer) {
    window.clearInterval(syncTimer)
  }
})

async function openManualPack() {
  if (!canOpenManual.value) return

  manualLockedUntilMs.value = Date.now() + BALANCE_CONFIG.manualOpenCooldownMs
  await store.dispatch('game/openPack', { source: 'manual' })
}

async function buyUpgrade(upgradeKey) {
  await store.dispatch('game/buyUpgrade', { upgradeKey })
}

async function toggleDebugPanel() {
  await store.dispatch('debug/togglePanel')
}

async function applyDebugAction(action) {
  await store.dispatch('game/debugApply', action)
}

function packName(tier) {
  return PACK_NAMES_BY_TIER[Number(tier)] || `Tier ${tier} Pack`
}

function termName(termKey) {
  return TERMS_BY_KEY[termKey]?.name || termKey
}

function percent(value) {
  return `${Number(value || 0).toFixed(2)}%`
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function normalizeMutation(mutation) {
  const key = String(mutation || '').trim().toLowerCase()
  return MUTATION_ORDER.includes(key) ? key : 'none'
}

function mutationLabel(mutation) {
  const normalized = normalizeMutation(mutation)
  if (normalized === 'none') return 'Base'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function mutationStyle(mutation) {
  return MUTATION_STYLE_MAP[normalizeMutation(mutation)] || MUTATION_STYLE_MAP.none
}

function mutationBadgeStyle(mutation) {
  const style = mutationStyle(mutation)
  return {
    color: style.badgeText,
    backgroundColor: style.badgeBg,
    border: `1px solid ${style.badgeBorder}`,
  }
}

function cardMutationStyle(mutation) {
  const style = mutationStyle(mutation)
  return {
    borderColor: style.cardBorder,
    background: style.cardBg,
  }
}

function rarityColor(rarity) {
  return RARITY_COLORS[rarity] || 'var(--rarity-common)'
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
</script>
