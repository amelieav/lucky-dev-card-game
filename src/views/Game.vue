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
          <p class="text-xs text-muted">Tier Coverage</p>
          <p class="text-xl font-semibold">T1-T6</p>
        </article>
        <article class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs text-muted">Auto Rate</p>
          <p class="text-xl font-semibold">{{ autoRateLabel }}</p>
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
            <p class="text-xs uppercase tracking-wide text-muted">Auto Roll</p>
            <h1 class="mt-1 text-xl font-semibold">Continuous Card Pack Loop</h1>
            <p class="mt-1 text-sm text-muted">
              Packs now appear, open, reveal, and loop automatically.
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs text-muted">Loop Cadence</p>
            <p class="text-sm font-semibold">{{ loopCadenceLabel }}</p>
          </div>
        </div>

        <div
          class="manual-pack mt-4"
          :class="`manual-pack--${manualPackPhase}`"
          role="status"
          aria-live="polite"
        >
          <template v-if="manualPackPhase === 'ready'">
            <div class="manual-pack__card" aria-hidden="true"></div>
            <p class="manual-pack__eyebrow">Incoming pack</p>
            <p class="manual-pack__title">Preparing next roll...</p>
            <p class="manual-pack__hint">Looping automatically</p>
          </template>

          <template v-else-if="manualPackPhase === 'opening'">
            <div class="manual-pack__card manual-pack__card--opening" aria-hidden="true"></div>
            <div class="manual-pack__spinner" aria-hidden="true"></div>
            <p class="manual-pack__title">Opening pack...</p>
            <p class="manual-pack__hint">Rolling tier, rarity, and mutation</p>
          </template>

          <template v-else-if="manualRevealDraw">
            <p class="manual-pack__eyebrow">{{ packName(manualRevealDraw.tier) }}</p>
            <p class="manual-pack__title">{{ termName(manualRevealDraw.term_key) }}</p>
            <p class="manual-pack__hint">{{ manualRevealDraw.rarity }} · {{ manualRevealDraw.mutation }}</p>
            <p class="manual-pack__reward">+{{ formatNumber(manualRevealDraw.reward) }} coins</p>
          </template>
        </div>

        <div v-if="recentDraws.length && manualPackPhase === 'ready'" class="mt-3 rounded-lg border border-soft bg-panel-soft p-2">
          <p class="text-[11px] uppercase tracking-wide text-muted">Recent opened cards</p>
          <div class="mt-2 space-y-1.5">
            <div
              v-for="(draw, index) in recentDraws"
              :key="`recent-${index}-${draw.term_key}-${draw.copies}-${draw.level}-${draw.reward}`"
              class="rounded-md border border-soft bg-white/70 px-2 py-1.5"
            >
              <p class="text-xs font-semibold">{{ termName(draw.term_key) }}</p>
              <p class="text-[11px] text-muted">
                {{ draw.rarity }} · {{ draw.mutation }} · {{ packName(draw.tier) }} · +{{ formatNumber(draw.reward) }} coins
              </p>
            </div>
          </div>
        </div>

        <div class="mt-3 rounded-lg border border-soft bg-panel-soft p-2">
          <label class="reset-tools__toggle">
            <input
              v-model="showResetButton"
              type="checkbox"
              class="h-4 w-4"
              @change="persistResetButtonPreference"
            />
            <span>Show reset button (testing)</span>
          </label>

          <button
            v-if="showResetButton"
            class="btn-danger mt-2"
            type="button"
            :disabled="!canResetAccount"
            @click="resetAccount"
          >
            Reset Profile
          </button>

          <p v-if="showResetButton" class="mt-1 text-[11px] text-muted">
            Resets coins, cards, upgrades, and progress back to a fresh profile.
          </p>
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
  getRarityWeightsForTier,
  getUpgradeCost,
  getUpgradePreview,
} from '../lib/packLogic.mjs'

const LOCAL_ECONOMY_ENABLED = import.meta.env.VITE_LOCAL_ECONOMY === '1'
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
const manualPackPhase = ref('ready')
const manualRevealDraw = ref(null)
const showResetButton = ref(false)

const PACK_OPENING_ANIMATION_MS = 600
const PACK_REVEAL_MS = 1500
const RESET_BUTTON_PREF_KEY = 'lucky_agent_show_reset_button'

let autoRollTimer = null
let syncTimer = null
let viewActive = true

const snapshot = computed(() => store.state.game.snapshot)
const playerState = computed(() => snapshot.value?.state || null)
const playerTerms = computed(() => snapshot.value?.terms || [])
const gameError = computed(() => store.state.game.error)
const actionLoading = computed(() => store.state.game.actionLoading)
const recentDraws = computed(() => store.state.game.recentDraws || [])

const debugEnabled = computed(() => store.state.debug.enabled)
const debugPanelOpen = computed(() => store.state.debug.panelOpen)
const debugLastError = computed(() => store.state.debug.lastError)
const debugLastResult = computed(() => store.state.debug.lastResult)
const debugAllowed = computed(() => store.state.game.debugAllowed)

const playerCoins = computed(() => Number(playerState.value?.coins || 0))
const playerPacksOpened = computed(() => Number(playerState.value?.packs_opened || 0))
const playerManualOpens = computed(() => Number(playerState.value?.manual_opens || 0))
const playerAutoOpens = computed(() => Number(playerState.value?.auto_opens || 0))

const autoRate = computed(() => getAutoOpensPerSecond(playerState.value || {}))
const autoRateLabel = computed(() => (autoRate.value > 0 ? `${autoRate.value.toFixed(2)} packs/sec` : 'Locked'))
const loopCadenceLabel = computed(() => `1 pack / ${(BALANCE_CONFIG.manualOpenCooldownMs / 1000).toFixed(1)}s`)

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
  for (let tier = 1; tier <= 6; tier += 1) {
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

const canRunAutoRoll = computed(() => {
  return !!playerState.value
    && !actionLoading.value
    && manualPackPhase.value === 'ready'
})
const canResetAccount = computed(() => !!playerState.value && !actionLoading.value)

const termOptions = TERMS.map((term) => ({ key: term.key, name: term.name }))

onMounted(async () => {
  viewActive = true
  await store.dispatch('auth/initAuth')
  if (!store.state.game.snapshot) {
    await store.dispatch('game/bootstrapPlayer')
  }

  showResetButton.value = readResetButtonPreference()
  scheduleAutoRoll(350)

  if (LOCAL_ECONOMY_ENABLED) {
    syncTimer = window.setInterval(async () => {
      if (!store.state.game.actionLoading) {
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

function scheduleAutoRoll(delayMs = BALANCE_CONFIG.manualOpenCooldownMs) {
  if (!viewActive) return

  if (autoRollTimer) {
    window.clearTimeout(autoRollTimer)
  }

  autoRollTimer = window.setTimeout(() => {
    void runAutoRollTick()
  }, delayMs)
}

async function runAutoRollTick() {
  if (!viewActive) return

  if (!canRunAutoRoll.value) {
    scheduleAutoRoll(250)
    return
  }

  await runAutoRollCycle()
  scheduleAutoRoll(BALANCE_CONFIG.manualOpenCooldownMs)
}

async function runAutoRollCycle() {
  if (!canRunAutoRoll.value) return

  const previousDraw = store.state.game.openResult
  manualPackPhase.value = 'opening'
  manualRevealDraw.value = null
  await sleep(PACK_OPENING_ANIMATION_MS)
  await store.dispatch('game/openPack', { source: 'manual' })

  const draw = store.state.game.openResult
  const hasFreshDraw = !store.state.game.error && draw && draw !== previousDraw

  if (!hasFreshDraw) {
    manualPackPhase.value = 'ready'
    return
  }

  manualRevealDraw.value = draw
  manualPackPhase.value = 'reveal'
  await sleep(PACK_REVEAL_MS)
  manualPackPhase.value = 'ready'
}

async function buyUpgrade(upgradeKey) {
  await store.dispatch('game/buyUpgrade', { upgradeKey })
}

async function resetAccount() {
  if (!canResetAccount.value) return

  const confirmed = window.confirm('Reset your profile to a fresh new state? This cannot be undone.')
  if (!confirmed) return

  manualPackPhase.value = 'ready'
  manualRevealDraw.value = null
  await store.dispatch('game/resetAccount')
  scheduleAutoRoll(500)
}

function persistResetButtonPreference() {
  if (typeof window === 'undefined' || !window.localStorage) return
  window.localStorage.setItem(RESET_BUTTON_PREF_KEY, showResetButton.value ? '1' : '0')
}

function readResetButtonPreference() {
  if (typeof window === 'undefined' || !window.localStorage) return false
  return window.localStorage.getItem(RESET_BUTTON_PREF_KEY) === '1'
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

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
</script>

<style scoped>
.manual-pack {
  width: min(250px, 100%);
  min-height: 340px;
  margin: 0 auto;
  border-radius: 1.1rem;
  border: 1px solid var(--border-soft);
  padding: 1.1rem 0.9rem;
  text-align: center;
  box-shadow: 0 16px 28px rgba(31, 56, 128, 0.18);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
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
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.16));
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

.manual-pack__spinner {
  width: 40px;
  height: 40px;
  margin-bottom: 0.6rem;
  border-radius: 9999px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  animation: pack-spin 0.9s linear infinite;
}

.reset-tools__toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: var(--text-main);
}

.btn-danger {
  border-radius: 0.75rem;
  border: 1px solid #f7b0b7;
  background: #d8404f;
  color: #ffffff;
  padding: 0.5rem 0.8rem;
  font-weight: 700;
  font-size: 0.82rem;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
