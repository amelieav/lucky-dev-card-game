<template>
  <section class="space-y-4">
    <div v-if="chickRaid.active" class="duck-raid" aria-live="polite">
      <p class="duck-raid__note">{{ chickRaid.message }}</p>
      <article v-if="showDuckRaidCard" class="duck-raid__card" :style="duckRaidCardStyle" aria-hidden="true">
        <p class="duck-raid__card-name">{{ duckRaidCardTitle }}</p>
        <p class="duck-raid__card-meta">{{ duckRaidCardMeta }}</p>
      </article>
      <button
        ref="duckRaidActorRef"
        class="duck-raid__actor"
        type="button"
        :style="duckRaidStyle"
        title="Click the duck before it escapes with your card"
        @click="scareDuck"
      >
        <img :src="duckRaidFrameSrc" alt="Duck raider" class="duck-raid__img" @error="handleDuckFrameError" />
      </button>
    </div>

    <div class="card p-4 status-strip">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <article class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs text-muted">Coins</p>
          <p class="text-2xl font-semibold">{{ formatNumber(playerCoinsDisplay) }}</p>
        </article>
        <article class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs text-muted">Manual / Auto</p>
          <p class="text-xl font-semibold">{{ formatNumber(playerManualOpens) }} / {{ formatNumber(playerAutoOpens) }}</p>
        </article>
        <article
          class="rounded-xl border border-soft bg-panel-soft p-3"
          :class="leaderboardPositionToneClass"
        >
          <p class="text-xs text-muted">Leaderboard Position</p>
          <p class="text-xl font-semibold">{{ leaderboardPositionLabel }}</p>
        </article>
        <article class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs text-muted">Passive Income</p>
          <p class="text-xl font-semibold" :title="passiveIncomeTooltip">+{{ passiveIncomeSummary.totalRate }}/sec</p>
        </article>
        <article class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs text-muted">Rebirths</p>
          <p class="text-xl font-semibold">{{ rebirthCount }}</p>
        </article>
        <article class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs text-muted">Season Ends</p>
          <p class="text-sm font-semibold">{{ seasonCountdownLabel }}</p>
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
          class="manual-pack mt-8"
          :class="`manual-pack--${manualPackPhase}`"
          role="status"
          aria-live="polite"
        >
          <div v-if="legendarySparkleActive" class="legendary-sparkle" aria-hidden="true">
            <div class="legendary-sparkle__layer legendary-sparkle__layer--a"></div>
            <div class="legendary-sparkle__layer legendary-sparkle__layer--b"></div>
          </div>

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
            size="opening"
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
          class="manual-pack manual-pack--interactive mt-8"
          :class="`manual-pack--${manualPackPhase}`"
          type="button"
          :disabled="!canOpenManual"
          @click="openManualPack"
        >
          <div v-if="legendarySparkleActive" class="legendary-sparkle" aria-hidden="true">
            <div class="legendary-sparkle__layer legendary-sparkle__layer--a"></div>
            <div class="legendary-sparkle__layer legendary-sparkle__layer--b"></div>
          </div>

          <template v-if="manualPackPhase === 'ready'">
            <div class="manual-pack__card" aria-hidden="true"></div>
            <p class="manual-pack__eyebrow">{{ autoUnlocked ? 'Auto roll paused' : 'Card pack ready' }}</p>
            <p class="manual-pack__title">{{ manualOpenTitle }}</p>
            <p class="manual-pack__hint">{{ manualOpenHint }}</p>
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
            size="opening"
            :name="manualRevealCard.name"
            :tier="manualRevealCard.tier"
            :rarity="manualRevealCard.rarity"
            :mutation="manualRevealCard.mutation"
            :icon="manualRevealCard.icon"
            :coins="manualRevealCard.coins"
          />
        </button>

        <div v-if="recentDraws.length" class="mt-6 rounded-lg border border-soft bg-panel-soft p-2">
          <p class="text-[11px] uppercase tracking-wide text-muted">Recently opened cards</p>
          <div class="recent-mini-strip mt-2">
            <div
              v-for="(draw, index) in recentDraws"
              :key="`recent-${index}-${draw.term_key}-${draw.copies}-${draw.level}-${draw.reward}`"
              class="recent-mini-card"
              :class="`recent-mini-card--${normalizeMutation(draw.mutation)}`"
            >
              <vue-feather :type="termIcon(draw.term_key, draw.layer)" class="recent-mini-card__icon" stroke-width="2.4" aria-hidden="true"></vue-feather>
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

      </aside>
    </div>

    <section ref="cardBookSectionRef" class="card p-5">
      <div class="mb-4">
        <h2 class="text-lg font-semibold">Shop</h2>
        <p class="text-xs text-muted">Spend coins to improve auto opening, odds, and value.</p>
      </div>

      <article class="mb-4 rounded-xl border border-soft bg-panel-soft p-4 rebirth-shop-panel">
        <div class="rebirth-shop-panel__inner">
          <div>
            <p class="text-xs uppercase tracking-wide text-muted">Rebirth</p>
            <p class="mt-1 text-sm font-semibold">{{ currentCollectionCount }}/{{ TERMS.length }} cards in current collection</p>
            <p class="mt-1 text-[11px] text-muted">
              {{ rebirthReady ? 'Ready: full collection complete.' : rebirthLockLabel }}
            </p>
          </div>
          <button
            class="rebirth-cta-btn"
            type="button"
            :disabled="!rebirthReady || actionLoading"
            @click="rebirthPlayer"
          >
            Rebirth
          </button>
        </div>
      </article>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article v-for="upgrade in shopRows" :key="upgrade.key" class="rounded-xl border border-soft bg-panel-soft p-4 shop-upgrade-card">
          <div class="shop-upgrade-card__body">
            <p class="text-xs text-muted">{{ upgrade.label }}</p>
            <p class="mt-1 text-xs text-muted">{{ upgrade.description }}</p>

            <p class="mt-2 text-sm"><span class="font-semibold">Current:</span> {{ upgrade.currentEffect }}</p>
            <p class="text-sm text-muted"><span class="font-semibold text-main">Next:</span> {{ upgrade.nextEffect || 'Maxed' }}</p>
            <div v-if="upgrade.key === 'tier_boost'" class="mt-2 rounded-lg border border-soft bg-white/70 p-2 text-xs text-muted shop-upgrade-card__tier-note">
              <p><span class="font-semibold text-main">Effective now:</span> {{ upgrade.tierOddsNow }}</p>
              <p v-if="upgrade.tierOddsAfterBuy"><span class="font-semibold text-main">After buy:</span> {{ upgrade.tierOddsAfterBuy }}</p>
              <p v-if="upgrade.tierOddsUnchangedNextLevel">
                No immediate odds change at next level.
                <span v-if="upgrade.nextTierOddsChangeLevel">Next odds shift at Tier Boost Lv {{ upgrade.nextTierOddsChangeLevel }}.</span>
              </p>
              <p class="mt-1">This directly updates the Pack Odds tier panel.</p>
            </div>
          </div>

          <div class="flex items-center justify-between shop-upgrade-card__actions">
            <p class="text-sm font-semibold">{{ upgrade.cost == null ? 'MAX' : `${formatNumber(upgrade.cost)} coins` }}</p>
            <button class="btn-primary" type="button" :disabled="!upgrade.canBuy || actionLoading" @click="buyUpgrade(upgrade.key)">
              {{ upgrade.cost == null ? 'Maxed' : 'Buy' }}
            </button>
          </div>
        </article>

        <article class="rounded-xl border border-soft bg-panel-soft p-4 shop-upgrade-card">
          <div class="shop-upgrade-card__body">
            <p class="text-xs text-muted">Missing Card Gift</p>
            <p class="mt-1 text-xs text-muted">Spend coins to receive one random missing card from your current collection.</p>

            <p class="mt-2 text-sm"><span class="font-semibold">Remaining:</span> {{ missingCardsRemaining }} card{{ missingCardsRemaining === 1 ? '' : 's' }}</p>
            <p class="text-sm text-muted"><span class="font-semibold text-main">Effect:</span> +1 missing card</p>
          </div>

          <div class="flex items-center justify-between shop-upgrade-card__actions">
            <p class="text-sm font-semibold">{{ formatNumber(MISSING_CARD_GIFT_COST) }} coins</p>
            <button class="btn-primary" type="button" :disabled="!canBuyMissingCardGiftAction || actionLoading" @click="buyMissingCardGift">
              {{ canBuyMissingCardGiftAction ? 'Buy' : missingCardGiftButtonLabel }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="card p-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Card Book · {{ activePackLabel }}</h2>
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

          <div class="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            <div
              v-for="item in tierRow.items"
              :key="item.termKey"
              :ref="(el) => setCardBookItemRef(item.termKey, el)"
              class="space-y-1 card-book-slot"
              :class="{
                'card-book-slot--targeted': chickRaid.targetTermKey === item.termKey,
                'card-book-slot--snatched': chickRaid.targetTermKey === item.termKey && (chickRaid.stage === 'bite' || chickRaid.stage === 'drag'),
              }"
            >
              <term-card
                size="medium"
                :name="item.name"
                :tier="item.tier"
                :rarity="item.rarity"
                :mutation="item.bestMutation"
                :icon="item.icon"
                :coins="item.value"
                :stolen="item.stolen"
                :unknown="!item.owned && !item.stolen"
              />
              <div class="card-book-meta">
                <div class="card-book-meta__top">
                  <p class="card-book-metric">
                    <span class="card-book-metric__label">Slot</span>
                    <span class="card-book-metric__value">{{ item.slot }}</span>
                  </p>
                  <p class="card-book-metric">
                    <span class="card-book-metric__label">Copies</span>
                    <span class="card-book-metric__value">{{ item.copies }}</span>
                  </p>
                </div>
                <div class="card-book-meta__bottom">
                  <p class="card-book-metric card-book-metric--best">
                    <span class="card-book-metric__label">Best</span>
                    <span class="card-book-metric__value">{{ mutationLabel(item.bestMutation) }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>

  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import TermCard from '../components/game/TermCard.vue'
import { getTermPresentation } from '../data/boosterTerms.mjs'
import { TERMS, TERMS_BY_KEY } from '../data/terms'
import { BALANCE_CONFIG } from '../lib/balanceConfig.mjs'
import {
  SHOP_UPGRADES,
  MISSING_CARD_GIFT_COST,
  getAutoOpenIntervalMs,
  getBaseTierFromEffectiveTier,
  canBuyMissingCardGift,
  canBuyUpgrade,
  computeCardReward,
  getEffectiveTierWeights,
  getEffectiveTierForLayer,
  getMutationWeights,
  getNextTierOddsChangeLevel,
  getPassiveIncomeSummaryFromTerms,
  getRarityWeightsForTier,
  getUpgradeCost,
  getUpgradePreview,
  normalizeLayer,
} from '../lib/packLogic.mjs'

const LOCAL_ECONOMY_ENABLED = import.meta.env.VITE_LOCAL_ECONOMY === '1'
const MUTATION_ORDER = ['none', 'foil', 'holo']
const TIER_COLOR_MAP = BALANCE_CONFIG.tierColors || {}
const BASE_TIER_LABELS = {
  1: 'Common',
  2: 'Uncommon',
  3: 'Rare',
  4: 'Epic',
  5: 'Legendary',
  6: 'Mythic',
}

const store = useStore()
const manualPackPhase = ref('ready')
const manualRevealDraw = ref(null)
const displayedRecentDraws = ref([])
const autoRollEnabled = ref(true)

const REVEAL_READ_MS = 2750
const MANUAL_OPENING_EXTRA_MS = 500
const AUTO_OPENING_MS = 420
const LEGENDARY_SPARKLE_MS = 3000
const LEADERBOARD_REFRESH_MS = 15000
const LIVE_METRICS_TICK_MS = 500
const CHICK_MID_TIER_INACTIVITY_MIN_MS = 180_000
const CHICK_MID_TIER_INACTIVITY_MAX_MS = 480_000
const CHICK_HIGH_TIER_INACTIVITY_MIN_MS = 30_000
const CHICK_HIGH_TIER_INACTIVITY_MAX_MS = 150_000
const CHICK_MONITOR_MS = 1000
const CHICK_COOLDOWN_MS = 20_000
const DUCK_RAID_FRAMES = {
  walk: [duckAsset('walk1.png'), duckAsset('walk2.png'), duckAsset('walk3.png'), duckAsset('walk4.png')],
  drag: [duckAsset('drag1.png'), duckAsset('drag2.png'), duckAsset('drag3.png'), duckAsset('drag4.png')],
  cry: [duckAsset('cry1.png'), duckAsset('cry2.png')],
  runaway: [duckAsset('runaway1.png'), duckAsset('runaway2.png'), duckAsset('runaway3.png'), duckAsset('runaway4.png')],
}
const DUCK_FALLBACK_FRAME = DUCK_RAID_FRAMES.walk[0]
const CHICK_APPROACH_MS = 10500
const CHICK_DRAG_MS = 7000
const CHICK_ESCAPE_MS = 7000
const CHICK_FLEE_MS = 5000
const CHICK_SCARED_MS = 2000
const CHICK_ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel']

let autoRollTimer = null
let syncTimer = null
let viewActive = true
let legendarySparkleTimer = null
let leaderboardRefreshTimer = null
let metricsTickTimer = null
let chickMonitorTimer = null
let chickFailTimer = null
let chickPhaseTimer = null
let duckFrameTimer = null
const cardBookItemRefs = new Map()
const cardBookSectionRef = ref(null)
const lastMouseActivityMs = ref(Date.now())
const chickInactivityTargetMs = ref(null)
const lastChickRaidMs = ref(0)
const duckFrameIndex = ref({
  walk: 0,
  drag: 0,
  cry: 0,
  runaway: 0,
})
const failedDuckFrameSrcSet = ref(new Set())
const duckRaidActorRef = ref(null)
const chickRaid = ref({
  active: false,
  stage: 'idle',
  message: '',
  targetTermKey: null,
  targetName: '',
  x: 105,
  y: 14,
  transitionMs: 300,
})

const snapshot = computed(() => store.state.game.snapshot)
const playerState = computed(() => snapshot.value?.state || null)
const playerTerms = computed(() => snapshot.value?.terms || [])
const seasonInfo = computed(() => snapshot.value?.season || null)
const stolenTermKeys = computed(() => {
  return new Set(Array.isArray(snapshot.value?.stolen_terms) ? snapshot.value.stolen_terms : [])
})
const gameError = computed(() => store.state.game.error)
const actionLoading = computed(() => store.state.game.actionLoading)
const recentDraws = computed(() => displayedRecentDraws.value)
const legendarySparkleActive = ref(false)
const liveNowMs = ref(Date.now())

const leaderboardRows = computed(() => store.state.leaderboard.rows || [])
const leaderboardLoading = computed(() => Boolean(store.state.leaderboard.loading))
const currentUserId = computed(() => store.state.auth.user?.id || null)
const rebirthCount = computed(() => Number(playerState.value?.rebirth_count || 0))
const activeLayer = computed(() => normalizeLayer(playerState.value?.active_layer || 1))
const activePackLabel = computed(() => (activeLayer.value > 1 ? 'Booster Pack' : 'Base Pack'))

const playerCoins = computed(() => Number(playerState.value?.coins || 0))
const playerManualOpens = computed(() => Number(playerState.value?.manual_opens || 0))
const playerAutoOpens = computed(() => Number(playerState.value?.auto_opens || 0))
const autoUnlocked = computed(() => Boolean(playerState.value?.auto_unlocked))
const passiveRateCps = computed(() => Number(playerState.value?.passive_rate_cps || 0))
const playerCoinsDisplay = computed(() => {
  const baseCoins = Number(playerCoins.value || 0)
  if (passiveRateCps.value <= 0) return baseCoins

  const lastTickMs = Date.parse(playerState.value?.last_tick_at || '')
  if (!Number.isFinite(lastTickMs)) return baseCoins

  const activeUntilMs = Date.parse(playerState.value?.active_until_at || '')
  const effectiveNowMs = Number.isFinite(activeUntilMs)
    ? Math.min(liveNowMs.value, activeUntilMs)
    : liveNowMs.value
  const elapsedSeconds = Math.max(0, Math.floor((effectiveNowMs - lastTickMs) / 1000))
  return baseCoins + (elapsedSeconds * passiveRateCps.value)
})
const shopAffordabilityState = computed(() => {
  return {
    ...(playerState.value || {}),
    coins: Math.max(0, Number(playerCoinsDisplay.value || 0)),
  }
})
const leaderboardPosition = computed(() => {
  const rowByFlag = leaderboardRows.value.find((row) => row?.is_you)
  const rowById = rowByFlag || leaderboardRows.value.find((row) => row?.user_id && row.user_id === currentUserId.value)
  const rank = Number(rowById?.rank || 0)
  return rank > 0 ? rank : null
})
const leaderboardPositionLabel = computed(() => {
  if (!leaderboardPosition.value) {
    return leaderboardLoading.value ? '...' : 'Unranked'
  }
  return toOrdinal(leaderboardPosition.value)
})
const leaderboardPositionToneClass = computed(() => {
  const rank = Number(leaderboardPosition.value || 999)
  if (rank === 1) return 'leaderboard-tile--first'
  if (rank === 2) return 'leaderboard-tile--second'
  if (rank === 3) return 'leaderboard-tile--third'
  if (rank === 4 || rank === 5) return 'leaderboard-tile--fourth-fifth'
  return 'leaderboard-tile--other'
})
const duckRaidStyle = computed(() => ({
  left: `${Number(chickRaid.value.x || 50)}%`,
  top: `${Number(chickRaid.value.y || 50)}%`,
  '--duck-raid-transition-ms': `${Math.max(80, Number(chickRaid.value.transitionMs || 300))}ms`,
  '--duck-raid-facing-scale': chickRaid.value.stage === 'flee' ? '-1' : '1',
}))
const duckRaidFrameKey = computed(() => {
  if (chickRaid.value.stage === 'scared') return 'cry'
  if (chickRaid.value.stage === 'flee') return 'walk'
  if (chickRaid.value.stage === 'escaped') return 'runaway'
  if (chickRaid.value.stage === 'bite' || chickRaid.value.stage === 'drag') return 'drag'
  return 'walk'
})
const duckRaidFrameSrc = computed(() => {
  const key = duckRaidFrameKey.value
  const allFrames = DUCK_RAID_FRAMES[key] || []
  const failedSet = failedDuckFrameSrcSet.value
  const frames = allFrames.filter((src) => !failedSet.has(src))
  if (!frames.length) return DUCK_FALLBACK_FRAME || ''
  const idx = Number(duckFrameIndex.value[key] || 0) % frames.length
  return frames[idx] || DUCK_FALLBACK_FRAME || ''
})
const duckRaidTargetCard = computed(() => {
  if (!chickRaid.value.targetTermKey) return null
  return cardBookRows.value.find((item) => item.termKey === chickRaid.value.targetTermKey) || null
})
const showDuckRaidCard = computed(() => {
  return ['drag', 'escaped'].includes(chickRaid.value.stage) && !!duckRaidTargetCard.value
})
const duckRaidCardStyle = computed(() => ({
  left: `${Number(chickRaid.value.x || 50)}%`,
  top: `${Number(chickRaid.value.y || 50)}%`,
  '--duck-raid-transition-ms': `${Math.max(80, Number(chickRaid.value.transitionMs || 300))}ms`,
}))
const duckRaidCardTitle = computed(() => {
  return duckRaidTargetCard.value?.name || chickRaid.value.targetName || 'Unknown Card'
})
const duckRaidCardMeta = computed(() => {
  const tier = Number(duckRaidTargetCard.value?.displayTier || duckRaidTargetCard.value?.tier || 0)
  const rarity = normalizeRarity(duckRaidTargetCard.value?.rarity || 'common')
  return `T${tier || '?'} · ${rarity}`
})

const autoLoopDelayMs = computed(() => {
  return autoUnlocked.value
    ? Number(getAutoOpenIntervalMs(playerState.value || {}) || 2500)
    : BALANCE_CONFIG.manualOpenCooldownMs
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
const duckStealMaxTierCoverage = computed(() => {
  const baseLayerWeights = getEffectiveTierWeights({
    ...(playerState.value || {}),
    active_layer: 1,
  })

  const available = tierRows.value
    .map((row) => ({
      tier: Number(row.tier || 0),
      weight: Number(baseLayerWeights[row.tier] || row.weight || 0),
    }))
    .filter((row) => Number(row.weight || 0) > 0)
    .map((row) => Number(row.tier || 0))
  if (!available.length) return 1
  return Math.max(...available)
})
const seasonCountdownLabel = computed(() => {
  const endMs = Date.parse(seasonInfo.value?.ends_at || '')
  if (!Number.isFinite(endMs)) return 'Unknown'
  const remainingMs = Math.max(0, endMs - liveNowMs.value)
  const totalSeconds = Math.floor(remainingMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${Math.max(0, totalSeconds)}s`
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
  const baseTier = Number(term?.tier || 1)
  const drawLayer = normalizeLayer(manualRevealDraw.value.layer || activeLayer.value || 1)
  const presentation = getTermPresentation(manualRevealDraw.value.term_key, drawLayer)
  const drawTier = Number(manualRevealDraw.value.tier || 0)
  const displayTier = drawTier > 6
    ? drawTier
    : getEffectiveTierForLayer(drawTier || baseTier, drawLayer)

  return {
    name: presentation.name || term?.name || manualRevealDraw.value.term_name || manualRevealDraw.value.term_key || 'Unknown Card',
    tier: baseTier,
    displayTier,
    rarity: manualRevealDraw.value.rarity || term?.rarity || 'common',
    mutation: normalizeMutation(manualRevealDraw.value.mutation || 'none'),
    icon: presentation.icon || term?.icon || 'help-circle',
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
    const isStolen = copies <= 0 && stolenTermKeys.value.has(term.key)
    const presentation = getTermPresentation(term.key, activeLayer.value)

    return {
      termKey: term.key,
      slot: index + 1,
      icon: presentation.icon || term.icon || 'help-circle',
      name: presentation.name || term.name,
      tier: Number(term.tier || 1),
      displayTier: getEffectiveTierForLayer(Number(term.tier || 1), activeLayer.value),
      rarity: term.rarity,
      value: computeCardReward({
        baseBp: term.baseBp,
        rarity: term.rarity,
        mutation: 'none',
        valueLevel: 0,
      }),
      copies,
      owned: copies > 0,
      stolen: isStolen,
      bestMutation,
    }
  })
})

const currentCollectionCount = computed(() => {
  return cardBookRows.value.filter((row) => row.owned).length
})
const totalCollectedCards = currentCollectionCount
const missingCardsRemaining = computed(() => Math.max(0, TERMS.length - currentCollectionCount.value))
const canBuyMissingCardGiftAction = computed(() => {
  if (missingCardsRemaining.value <= 0) return false
  return canBuyMissingCardGift(shopAffordabilityState.value)
})
const missingCardGiftButtonLabel = computed(() => {
  if (missingCardsRemaining.value <= 0) return 'Complete'
  if (!canBuyMissingCardGift(shopAffordabilityState.value)) return 'Not enough coins'
  return 'Buy'
})
const rebirthReady = computed(() => currentCollectionCount.value >= TERMS.length)
const rebirthLockLabel = computed(() => {
  const remaining = Math.max(0, TERMS.length - currentCollectionCount.value)
  if (remaining <= 0) return 'Ready: full collection complete.'
  return `Collect ${currentCollectionCount.value}/${TERMS.length} to rebirth (${remaining} remaining).`
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
  const affordabilityState = shopAffordabilityState.value

  return SHOP_UPGRADES.map((upgrade) => {
    const preview = getUpgradePreview(state, upgrade.key)
    const cost = getUpgradeCost(state, upgrade.key)
    const baseRow = {
      ...upgrade,
      cost,
      currentEffect: preview.current,
      nextEffect: preview.next,
      canBuy: canBuyUpgrade(affordabilityState, upgrade.key),
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
const manualOpenTitle = computed(() => {
  if (!playerState.value) return 'Reconnecting...'
  if (actionLoading.value) return 'Syncing...'
  return autoUnlocked.value ? 'Tap to open manually' : 'Tap to open'
})
const manualOpenHint = computed(() => {
  if (!playerState.value) return 'Re-establishing session and player state'
  if (actionLoading.value) return 'Please wait for the current action to finish'
  return autoUnlocked.value ? 'Resume auto anytime from the button above' : 'Tier is decided by probability'
})

async function recoverGameIfStale() {
  if (!viewActive) return
  if (store.state.game.actionLoading || store.state.game.loading || store.state.auth.loading) return

  await store.dispatch('auth/initAuth')
  if (!viewActive) return
  if (!store.state.auth.user) return

  if (!store.state.game.snapshot) {
    await store.dispatch('game/bootstrapPlayer')
  }
}

function handleWindowFocus() {
  void recoverGameIfStale()
}

function handleVisibilityChange() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  void recoverGameIfStale()
}

onMounted(async () => {
  viewActive = true
  await store.dispatch('auth/initAuth')
  if (!viewActive) return
  if (!store.state.game.snapshot) {
    await store.dispatch('game/bootstrapPlayer')
    if (!viewActive) return
  }
  await store.dispatch('leaderboard/fetch', { force: true, limit: 100 })
  if (!viewActive) return
  await store.dispatch('leaderboard/fetchSeasonHistory', { limit: 200 })
  if (!viewActive) return

  displayedRecentDraws.value = [...(store.state.game.recentDraws || [])]
  lastMouseActivityMs.value = Date.now()
  resetChickInactivityTarget()
  bindActivityListeners()
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleWindowFocus)
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  metricsTickTimer = window.setInterval(() => {
    liveNowMs.value = Date.now()
  }, LIVE_METRICS_TICK_MS)

  leaderboardRefreshTimer = window.setInterval(() => {
    if (!viewActive || !currentUserId.value) return
    void store.dispatch('leaderboard/fetch', { force: true, limit: 100 })
  }, LEADERBOARD_REFRESH_MS)

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

  chickMonitorTimer = window.setInterval(() => {
    void maybeStartChickRaid()
  }, CHICK_MONITOR_MS)

  duckFrameTimer = window.setInterval(() => {
    duckFrameIndex.value = {
      walk: (duckFrameIndex.value.walk + 1) % DUCK_RAID_FRAMES.walk.length,
      drag: (duckFrameIndex.value.drag + 1) % DUCK_RAID_FRAMES.drag.length,
      cry: (duckFrameIndex.value.cry + 1) % DUCK_RAID_FRAMES.cry.length,
      runaway: (duckFrameIndex.value.runaway + 1) % DUCK_RAID_FRAMES.runaway.length,
    }
  }, 180)
})

onUnmounted(() => {
  viewActive = false
  unbindActivityListeners()
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', handleWindowFocus)
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
  if (autoRollTimer) {
    window.clearTimeout(autoRollTimer)
    autoRollTimer = null
  }

  if (syncTimer) {
    window.clearInterval(syncTimer)
    syncTimer = null
  }

  if (legendarySparkleTimer) {
    window.clearTimeout(legendarySparkleTimer)
    legendarySparkleTimer = null
  }

  if (leaderboardRefreshTimer) {
    window.clearInterval(leaderboardRefreshTimer)
    leaderboardRefreshTimer = null
  }

  if (metricsTickTimer) {
    window.clearInterval(metricsTickTimer)
    metricsTickTimer = null
  }

  clearChickRaidTimers()
  if (chickMonitorTimer) {
    window.clearInterval(chickMonitorTimer)
    chickMonitorTimer = null
  }

  if (duckFrameTimer) {
    window.clearInterval(duckFrameTimer)
    duckFrameTimer = null
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

watch(duckStealMaxTierCoverage, () => {
  resetChickInactivityTarget()
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

  try {
    await runAutoRollCycle()
  } catch (_) {
    manualPackPhase.value = 'ready'
  } finally {
    if (viewActive && autoUnlocked.value && autoRollEnabled.value) {
      scheduleAutoRoll(80)
    }
  }
}

async function runAutoRollCycle() {
  if (!viewActive) return
  if (!canRunAutoRoll.value) return

  const waitMs = Math.max(0, Number(autoLoopDelayMs.value || 0))
  if (waitMs > 0) {
    await sleep(waitMs)
    if (!viewActive) return
    if (!canRunAutoRoll.value) return
  }

  if (!viewActive) return
  const previousDraw = store.state.game.openResult
  manualRevealDraw.value = null
  await store.dispatch('game/openPack', { source: 'auto' })
  if (!viewActive) return

  const draw = store.state.game.openResult
  const hasFreshDraw = !store.state.game.error && draw && draw !== previousDraw

  if (!hasFreshDraw) {
    manualPackPhase.value = 'ready'
    if (autoUnlocked.value && autoRollEnabled.value) {
      scheduleAutoRoll(120)
    }
    return
  }

  triggerLegendarySparkle(draw)
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

  triggerLegendarySparkle(draw)
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

async function buyMissingCardGift() {
  if (!canBuyMissingCardGiftAction.value || actionLoading.value) return
  await store.dispatch('game/buyMissingCardGift')
}

async function rebirthPlayer() {
  if (!rebirthReady.value || actionLoading.value) return
  await store.dispatch('game/rebirth')
  await store.dispatch('leaderboard/fetch', { force: true, limit: 100 })
  await store.dispatch('leaderboard/fetchSeasonHistory', { limit: 200 })
}

function toggleAutoRoll() {
  if (!autoUnlocked.value) return
  autoRollEnabled.value = !autoRollEnabled.value
}

function setCardBookItemRef(termKey, el) {
  if (!termKey) return
  if (el) {
    cardBookItemRefs.set(termKey, el)
    return
  }

  cardBookItemRefs.delete(termKey)
}

function noteUserActivity() {
  lastMouseActivityMs.value = Date.now()
  resetChickInactivityTarget()
}

function bindActivityListeners() {
  if (typeof window === 'undefined') return

  for (const eventName of CHICK_ACTIVITY_EVENTS) {
    window.addEventListener(eventName, noteUserActivity, { passive: true })
  }
}

function unbindActivityListeners() {
  if (typeof window === 'undefined') return

  for (const eventName of CHICK_ACTIVITY_EVENTS) {
    window.removeEventListener(eventName, noteUserActivity)
  }
}

function clearChickRaidTimers() {
  if (chickFailTimer) {
    window.clearTimeout(chickFailTimer)
    chickFailTimer = null
  }

  if (chickPhaseTimer) {
    window.clearTimeout(chickPhaseTimer)
    chickPhaseTimer = null
  }
}

function getDuckActorViewportPoint() {
  if (!duckRaidActorRef.value || typeof window === 'undefined') return null
  const rect = duckRaidActorRef.value.getBoundingClientRect()
  if (!rect.width || !rect.height || !window.innerWidth || !window.innerHeight) return null

  const x = ((rect.left + (rect.width / 2)) / window.innerWidth) * 100
  const y = ((rect.top + (rect.height / 2)) / window.innerHeight) * 100
  return {
    x: Math.max(-20, Math.min(120, x)),
    y: Math.max(-10, Math.min(110, y)),
  }
}

function resetChickRaid() {
  clearChickRaidTimers()
  lastMouseActivityMs.value = Date.now()
  resetChickInactivityTarget()
  chickRaid.value = {
    active: false,
    stage: 'idle',
    message: '',
    targetTermKey: null,
    targetName: '',
    x: 105,
    y: 14,
    transitionMs: 300,
  }
}

function updateChickRaid(patch) {
  chickRaid.value = {
    ...chickRaid.value,
    ...patch,
  }
}

function pickChickTargetCard() {
  for (let tier = 6; tier >= 1; tier -= 1) {
    const tierRow = cardBookByTier.value.find((row) => row.tier === tier)
    if (!tierRow) continue

    const tierIsCompleted = tierRow.items.length > 0 && tierRow.collected === tierRow.items.length
    if (!tierIsCompleted) continue

    const completedCards = tierRow.items.filter((item) => item.owned && Number(item.copies || 0) > 0)
    if (completedCards.length === 0) continue

    return {
      card: completedCards[Math.floor(Math.random() * completedCards.length)],
      source: 'completed',
      tier,
    }
  }

  // Fallback so the feature remains testable before any tier is fully completed.
  for (let tier = 6; tier >= 1; tier -= 1) {
    const tierRow = cardBookByTier.value.find((row) => row.tier === tier)
    if (!tierRow) continue

    const ownedCards = tierRow.items.filter((item) => item.owned && Number(item.copies || 0) > 0)
    if (ownedCards.length === 0) continue

    return {
      card: ownedCards[Math.floor(Math.random() * ownedCards.length)],
      source: 'fallback-owned',
      tier,
    }
  }

  return null
}

async function maybeStartChickRaid() {
  if (!viewActive || !currentUserId.value) return
  if (chickRaid.value.active) return

  const inactivityTargetMs = Number(chickInactivityTargetMs.value || 0)
  if (inactivityTargetMs <= 0) return

  const now = Date.now()
  if ((now - lastMouseActivityMs.value) < inactivityTargetMs) return
  if ((now - lastChickRaidMs.value) < CHICK_COOLDOWN_MS) return

  const targetChoice = pickChickTargetCard()
  if (!targetChoice?.card) return

  await launchChickRaid(targetChoice.card, targetChoice)
}

async function launchChickRaid(targetCard, targetChoice = { source: 'completed', tier: Number(targetCard?.tier || 1) }) {
  if (!targetCard || chickRaid.value.active) return

  lastChickRaidMs.value = Date.now()
  updateChickRaid({
    active: true,
    stage: 'spawn',
    message: 'A duck appears...',
    targetTermKey: targetCard.termKey,
    targetName: targetCard.name,
    x: -12,
    y: 20,
    transitionMs: 120,
  })

  await nextTick()
  await scrollToTargetCard(targetCard.termKey)
  if (!chickRaid.value.active) return

  const targetEl = cardBookItemRefs.get(targetCard.termKey)
  const targetPoint = getElementViewportPoint(targetEl) || { x: 55, y: 76 }
  const spawnY = Math.max(10, Math.min(88, targetPoint.y - 8))
  const targetLabel = targetChoice.source === 'completed'
    ? `highest completed tier (T${targetChoice.tier})`
    : `highest available owned tier (fallback T${targetChoice.tier})`

  updateChickRaid({
    stage: 'spawn',
    message: `Duck found target in ${targetLabel}.`,
    x: -12,
    y: spawnY,
    transitionMs: 140,
  })
  await sleep(100)
  if (!chickRaid.value.active) return

  updateChickRaid({
    stage: 'approach',
    message: `Duck waddling toward ${targetCard.name}...`,
    x: Math.max(6, targetPoint.x - 2),
    y: targetPoint.y,
    transitionMs: CHICK_APPROACH_MS,
  })
  await sleep(CHICK_APPROACH_MS)
  if (!chickRaid.value.active) return

  updateChickRaid({
    stage: 'drag',
    message: `Duck bites and drags ${targetCard.name} back left! Click the duck!`,
    x: Math.max(6, targetPoint.x - 2),
    y: targetPoint.y,
    transitionMs: 120,
  })
  await sleep(30)
  if (!chickRaid.value.active) return

  updateChickRaid({
    stage: 'drag',
    message: `Duck bites and drags ${targetCard.name} back left! Click the duck!`,
    x: -16,
    y: Math.min(92, targetPoint.y + 12),
    transitionMs: CHICK_DRAG_MS,
  })

  chickFailTimer = window.setTimeout(() => {
    void completeChickTheft(targetCard)
  }, CHICK_DRAG_MS + 40)
}

async function completeChickTheft(targetCard) {
  if (!chickRaid.value.active) return

  clearChickRaidTimers()
  try {
    await store.dispatch('game/loseCard', { termKey: targetCard.termKey })
    await store.dispatch('game/recordDuckTheft', {
      termKey: targetCard.termKey,
      name: targetCard.name,
      value: Number(targetCard.value || 0),
      tier: Number(targetCard.tier || 0),
      rarity: normalizeRarity(targetCard.rarity),
      mutation: normalizeMutation(targetCard.bestMutation),
    })
  } catch (_) {
    // Ignore: UI already surfaces an error via game store.
  }

  updateChickRaid({
    stage: 'escaped',
    message: `${targetCard.name} was stolen!`,
    x: -24,
    y: Math.min(96, Number(chickRaid.value.y || 70) + 3),
    transitionMs: CHICK_ESCAPE_MS,
  })

  chickPhaseTimer = window.setTimeout(() => {
    resetChickRaid()
  }, CHICK_ESCAPE_MS + 120)
}

function scareDuck() {
  if (!chickRaid.value.active) return

  clearChickRaidTimers()
  const actorPoint = getDuckActorViewportPoint()
  const holdX = Number(actorPoint?.x ?? chickRaid.value.x ?? 50)
  const holdY = Number(actorPoint?.y ?? chickRaid.value.y ?? 50)
  updateChickRaid({
    stage: 'scared',
    message: 'Duck is crying...',
    x: holdX,
    y: holdY,
    transitionMs: 0,
  })

  chickPhaseTimer = window.setTimeout(() => {
    updateChickRaid({
      stage: 'flee',
      message: 'Duck is waddling away.',
      x: -24,
      y: Math.max(2, holdY - 10),
      transitionMs: CHICK_FLEE_MS,
    })
    chickPhaseTimer = window.setTimeout(() => {
      resetChickRaid()
    }, CHICK_FLEE_MS + 80)
  }, CHICK_SCARED_MS)
}

async function scrollToTargetCard(termKey) {
  const sectionEl = cardBookSectionRef.value
  if (sectionEl?.scrollIntoView) {
    sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    await sleep(520)
  }

  await nextTick()
  const targetEl = cardBookItemRefs.get(termKey)
  if (targetEl?.scrollIntoView) {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await sleep(520)
  }
}

function getElementViewportPoint(el) {
  if (!el || typeof window === 'undefined') return null

  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0 || window.innerWidth <= 0 || window.innerHeight <= 0) {
    return null
  }

  const x = ((rect.left + (rect.width / 2)) / window.innerWidth) * 100
  const y = ((rect.top + (rect.height / 2)) / window.innerHeight) * 100

  return {
    x: Math.max(4, Math.min(96, x)),
    y: Math.max(6, Math.min(94, y)),
  }
}

function appendRecentDraw(draw) {
  if (!draw) return
  displayedRecentDraws.value = [draw, ...displayedRecentDraws.value]
    .slice(0, 5)
}

function triggerLegendarySparkle(draw) {
  if (normalizeRarity(draw?.rarity) !== 'legendary') return

  legendarySparkleActive.value = true
  if (legendarySparkleTimer) {
    window.clearTimeout(legendarySparkleTimer)
  }

  legendarySparkleTimer = window.setTimeout(() => {
    legendarySparkleActive.value = false
    legendarySparkleTimer = null
  }, LEGENDARY_SPARKLE_MS)
}

function packName(tier) {
  const normalized = Math.max(1, Number(tier || 1))
  const effectiveTier = normalized > 6
    ? normalized
    : getEffectiveTierForLayer(normalized, activeLayer.value)
  const baseTier = normalized > 6 ? getBaseTierFromEffectiveTier(normalized) : normalized
  const tierLabel = BASE_TIER_LABELS[baseTier] || 'Common'
  return `Tier ${effectiveTier} ${tierLabel}`
}

function tierColor(tier) {
  const normalized = Math.max(1, Number(tier || 1))
  const baseTier = normalized > 6 ? getBaseTierFromEffectiveTier(normalized) : normalized
  return TIER_COLOR_MAP[baseTier] || 'var(--text-main)'
}

function termName(termKey, layer = activeLayer.value) {
  const presentation = getTermPresentation(termKey, layer)
  return presentation.name || TERMS_BY_KEY[termKey]?.name || termKey
}

function termIcon(termKey, layer = activeLayer.value) {
  const presentation = getTermPresentation(termKey, layer)
  return presentation.icon || TERMS_BY_KEY[termKey]?.icon || 'help-circle'
}

function percent(value) {
  return `${Number(value || 0).toFixed(2)}%`
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function toOrdinal(value) {
  const n = Math.max(0, Number(value || 0))
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  const mod10 = n % 10
  if (mod10 === 1) return `${n}st`
  if (mod10 === 2) return `${n}nd`
  if (mod10 === 3) return `${n}rd`
  return `${n}th`
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

function getChickInactivityWindowMs(maxTierCoverage) {
  const tier = Math.max(0, Number(maxTierCoverage || 0))
  if (tier <= 1) return null
  if (tier <= 3) {
    return {
      min: CHICK_MID_TIER_INACTIVITY_MIN_MS,
      max: CHICK_MID_TIER_INACTIVITY_MAX_MS,
    }
  }

  return {
    min: CHICK_HIGH_TIER_INACTIVITY_MIN_MS,
    max: CHICK_HIGH_TIER_INACTIVITY_MAX_MS,
  }
}

function getRandomChickInactivityMs(maxTierCoverage) {
  const window = getChickInactivityWindowMs(maxTierCoverage)
  if (!window) return null
  const min = Math.max(0, Number(window.min || 0))
  const max = Math.max(min, Number(window.max || min))
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function resetChickInactivityTarget() {
  chickInactivityTargetMs.value = getRandomChickInactivityMs(duckStealMaxTierCoverage.value)
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

function handleDuckFrameError(event) {
  const target = event?.target
  if (!target || !target.src) return

  failedDuckFrameSrcSet.value = new Set([
    ...failedDuckFrameSrcSet.value,
    target.src,
  ])

  if (DUCK_FALLBACK_FRAME && target.src !== DUCK_FALLBACK_FRAME) {
    target.src = DUCK_FALLBACK_FRAME
  }
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

.leaderboard-tile--first {
  background: #e9f8ec;
  border-color: #9fcea8;
}

.leaderboard-tile--second {
  background: #fff8df;
  border-color: #e3cf88;
}

.leaderboard-tile--third {
  background: #fff0e2;
  border-color: #e9be90;
}

.leaderboard-tile--fourth-fifth {
  background: #ffeaec;
  border-color: #ebb4bc;
}

.leaderboard-tile--other {
  background: #eaf2ff;
  border-color: #adbfeb;
}

.duck-raid {
  position: fixed;
  inset: 0;
  z-index: 78;
  pointer-events: none;
}

.duck-raid__note {
  position: fixed;
  right: 1rem;
  top: 4.8rem;
  margin: 0;
  padding: 0.35rem 0.58rem;
  border-radius: 0.6rem;
  border: 1px solid rgba(120, 143, 194, 0.35);
  background: rgba(255, 255, 255, 0.93);
  box-shadow: 0 8px 18px rgba(26, 44, 91, 0.15);
  font-size: 0.72rem;
  font-weight: 600;
  color: #243a6d;
  pointer-events: none;
}

.duck-raid__actor {
  position: fixed;
  transform: translate(-50%, -50%) scaleX(var(--duck-raid-facing-scale, 1));
  transition:
    left var(--duck-raid-transition-ms) linear,
    top var(--duck-raid-transition-ms) linear,
    transform 0.12s ease,
    filter 0.15s ease;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  pointer-events: auto;
  filter: drop-shadow(0 6px 12px rgba(26, 46, 94, 0.36));
}

.duck-raid__actor:hover {
  transform: translate(-50%, -50%) scaleX(var(--duck-raid-facing-scale, 1)) scale(1.06);
}

.duck-raid__img {
  display: block;
  width: 128px;
  height: auto;
  image-rendering: auto;
}

.duck-raid__card {
  position: fixed;
  transform: translate(-50%, -50%) translate(48px, -16px) rotate(-12deg);
  transition:
    left var(--duck-raid-transition-ms) linear,
    top var(--duck-raid-transition-ms) linear,
    transform 0.18s ease;
  z-index: 79;
  width: 112px;
  min-height: 70px;
  border-radius: 0.62rem;
  border: 1px solid rgba(39, 65, 102, 0.35);
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.95), rgba(236, 244, 255, 0.96));
  box-shadow:
    0 8px 16px rgba(35, 52, 104, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
  padding: 0.4rem 0.48rem;
  pointer-events: none;
}

.duck-raid__card-name {
  margin: 0;
  color: #1f3558;
  font-size: 0.66rem;
  line-height: 1.2;
  font-weight: 700;
}

.duck-raid__card-meta {
  margin: 0.25rem 0 0;
  color: #46638f;
  font-size: 0.57rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
}

.shop-upgrade-card {
  --shop-upgrade-card-height: 20.8rem;
  height: var(--shop-upgrade-card-height);
  display: flex;
  flex-direction: column;
}

.rebirth-shop-panel {
  border-color: rgba(106, 149, 246, 0.45);
  background: linear-gradient(160deg, rgba(239, 246, 255, 0.98), rgba(228, 240, 255, 0.96));
}

.rebirth-shop-panel__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.rebirth-cta-btn {
  min-width: clamp(200px, 24vw, 300px);
  border: none;
  border-radius: 0.72rem;
  padding: 0.7rem 1.05rem;
  background: linear-gradient(140deg, #3b82f6, #2563eb);
  color: #f7fbff;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.25);
  transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
}

.rebirth-cta-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.28);
  filter: brightness(1.03);
}

.rebirth-cta-btn:disabled {
  cursor: not-allowed;
  background: #9baccc;
  color: #e8eefc;
  box-shadow: none;
}

.shop-upgrade-card__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-right: 0.1rem;
  scrollbar-width: thin;
}

.shop-upgrade-card__actions {
  margin-top: auto;
  padding-top: 0.55rem;
}

@media (min-width: 640px) {
  .shop-upgrade-card {
    --shop-upgrade-card-height: 19.6rem;
  }
}

@media (max-width: 820px) {
  .rebirth-shop-panel__inner {
    flex-direction: column;
    align-items: stretch;
  }

  .rebirth-cta-btn {
    width: 100%;
    min-width: 0;
  }
}

@media (min-width: 1280px) {
  .shop-upgrade-card {
    --shop-upgrade-card-height: 18.6rem;
  }
}

.card-book-slot {
  border-radius: 0.72rem;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.card-book-slot :deep(.term-card) {
  max-width: clamp(128px, 12vw, 168px);
  margin-inline: auto;
}

.card-book-meta {
  display: grid;
  gap: 0.24rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(120, 143, 194, 0.3);
  background: rgba(255, 255, 255, 0.76);
  padding: 0.28rem 0.3rem;
  min-height: 2.2rem;
}

.card-book-meta__top {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.24rem;
}

.card-book-meta__bottom {
  display: flex;
  justify-content: center;
}

.card-book-metric {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.28rem;
  border-radius: 999px;
  border: 1px solid rgba(120, 143, 194, 0.35);
  background: rgba(233, 242, 255, 0.95);
  padding: 0.08rem 0.34rem;
  font-size: 0.6rem;
  line-height: 1.1;
  min-width: 0;
}

.card-book-metric--best {
  min-width: 5.8rem;
}

.card-book-metric__label {
  color: #60759d;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.card-book-metric__value {
  color: #203d68;
  font-weight: 700;
}

.card-book-slot--targeted {
  box-shadow: 0 0 0 2px rgba(246, 192, 90, 0.82), 0 10px 20px rgba(35, 52, 104, 0.18);
  transform: translateY(-1px);
}

.card-book-slot--snatched {
  box-shadow: 0 0 0 2px rgba(239, 103, 84, 0.92), 0 12px 24px rgba(136, 42, 23, 0.22);
}

.legendary-sparkle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: clamp(480px, 66vw, 750px);
  height: clamp(660px, 90vw, 1020px);
  transform: translate(-50%, -50%);
  z-index: 1;
  pointer-events: none;
  overflow: visible;
}

.legendary-sparkle::before {
  content: '';
  position: absolute;
  inset: 28% 24%;
  border-radius: 999px;
  background:
    radial-gradient(circle, rgba(195, 126, 255, 0.88) 0%, rgba(155, 91, 247, 0.46) 46%, rgba(129, 74, 230, 0) 80%);
  animation: legendary-origin-burst 1.8s ease-out infinite;
  filter: blur(1.6px);
}

.legendary-sparkle__layer {
  position: absolute;
  inset: 0;
  border-radius: 1rem;
}

.legendary-sparkle__layer--a {
  background:
    radial-gradient(circle at 12% 10%, rgba(233, 192, 255, 0.95) 0 2px, transparent 3px),
    radial-gradient(circle at 24% 34%, rgba(201, 149, 255, 0.82) 0 1.6px, transparent 2.5px),
    radial-gradient(circle at 42% 18%, rgba(178, 119, 249, 0.84) 0 1.7px, transparent 2.7px),
    radial-gradient(circle at 58% 52%, rgba(244, 204, 255, 0.82) 0 2px, transparent 3px),
    radial-gradient(circle at 74% 24%, rgba(188, 128, 255, 0.84) 0 1.7px, transparent 2.7px),
    radial-gradient(circle at 88% 44%, rgba(224, 173, 255, 0.84) 0 1.9px, transparent 2.9px),
    radial-gradient(circle at 34% 78%, rgba(196, 136, 255, 0.8) 0 1.7px, transparent 2.6px),
    radial-gradient(circle at 66% 82%, rgba(177, 118, 250, 0.82) 0 1.8px, transparent 2.8px);
  animation: legendary-sparkle-shift 1.8s ease-in-out infinite;
  opacity: 0.84;
}

.legendary-sparkle__layer--b {
  background:
    radial-gradient(circle at 16% 84%, rgba(248, 224, 255, 0.84) 0 2px, transparent 3.1px),
    radial-gradient(circle at 30% 56%, rgba(201, 144, 255, 0.78) 0 1.6px, transparent 2.5px),
    radial-gradient(circle at 46% 72%, rgba(231, 183, 255, 0.82) 0 1.8px, transparent 2.8px),
    radial-gradient(circle at 62% 16%, rgba(170, 112, 247, 0.8) 0 1.5px, transparent 2.3px),
    radial-gradient(circle at 78% 66%, rgba(220, 166, 255, 0.78) 0 1.7px, transparent 2.6px),
    radial-gradient(circle at 92% 30%, rgba(243, 202, 255, 0.8) 0 1.8px, transparent 2.8px),
    radial-gradient(circle at 54% 40%, rgba(139, 86, 229, 0.38), transparent 46%);
  mix-blend-mode: screen;
  animation: legendary-sparkle-twinkle 1.15s ease-in-out infinite;
  opacity: 0.74;
}

.manual-pack {
  position: relative;
  z-index: 2;
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
  width: min(212px, 94%);
  position: relative;
  z-index: 3;
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

@keyframes legendary-origin-burst {
  0% {
    transform: scale(0.72);
    opacity: 0.72;
  }
  55% {
    transform: scale(1.04);
    opacity: 0.95;
  }
  100% {
    transform: scale(1.16);
    opacity: 0.2;
  }
}

@keyframes legendary-sparkle-shift {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.66;
  }
  50% {
    transform: translate3d(-1.2%, 1.4%, 0) scale(1.02);
    opacity: 0.82;
  }
  100% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.66;
  }
}

@keyframes legendary-sparkle-twinkle {
  0% {
    transform: translate3d(0, 0, 0);
    opacity: 0.56;
  }
  35% {
    opacity: 0.9;
  }
  70% {
    transform: translate3d(1.1%, -1.2%, 0);
    opacity: 0.62;
  }
  100% {
    transform: translate3d(0, 0, 0);
    opacity: 0.56;
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

@media (prefers-reduced-motion: reduce) {
  .legendary-sparkle::before,
  .legendary-sparkle__layer--a,
  .legendary-sparkle__layer--b {
    animation: none;
  }
}
</style>
