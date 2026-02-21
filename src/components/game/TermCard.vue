<template>
  <article
    class="term-card"
    :class="[
      `term-card--tier-${safeTier}`,
      `term-card--mutation-${safeMutation}`,
      { 'term-card--unknown': unknown },
    ]"
    :style="{ '--term-card-base': tierColor }"
  >
    <div class="term-card__section term-card__mutation">
      <span v-if="safeMutation === 'foil'" class="term-card__mutation-label term-card__mutation-label--foil">FOIL</span>
      <span v-else-if="safeMutation === 'holo'" class="term-card__mutation-label term-card__mutation-label--holo">HOLO</span>
    </div>

    <div class="term-card__section term-card__icon">
      <i v-if="isFontAwesomeIcon" :class="[iconClass, 'term-card__icon-fa']" aria-hidden="true"></i>
      <span v-else class="term-card__icon-fallback">{{ iconGlyph }}</span>
    </div>

    <div class="term-card__section term-card__name">
      {{ displayName }}
    </div>

    <div class="term-card__section term-card__rarity">
      <span class="term-card__rarity-pill" :class="`term-card__rarity-pill--${safeRarity}`">
        {{ unknown ? '?' : safeRarity }}
      </span>
    </div>

    <div class="term-card__section term-card__coins">
      <span class="term-card__coins-value">{{ unknown ? '--' : `+${formattedCoins}` }}</span>
      <span class="term-card__coins-label">coins</span>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { BALANCE_CONFIG } from '../../lib/balanceConfig.mjs'

const props = defineProps({
  name: { type: String, default: '' },
  tier: { type: Number, default: 1 },
  rarity: { type: String, default: 'common' },
  mutation: { type: String, default: 'none' },
  icon: { type: String, default: 'fa-solid fa-circle-question' },
  coins: { type: Number, default: 0 },
  unknown: { type: Boolean, default: false },
})

const safeTier = computed(() => {
  const tier = Math.max(1, Math.min(6, Number(props.tier || 1)))
  return tier
})

const safeMutation = computed(() => {
  const key = String(props.mutation || '').trim().toLowerCase()
  if (key === 'holo' || key === 'foil') return key
  if (key === 'glitched' || key === 'prismatic') return 'holo'
  return 'none'
})

const safeRarity = computed(() => {
  const key = String(props.rarity || '').trim().toLowerCase()
  if (key === 'legendary' || key === 'rare') return key
  return 'common'
})

const tierColor = computed(() => {
  return BALANCE_CONFIG.tierColors?.[safeTier.value] || '#5f6f93'
})

const iconClass = computed(() => {
  if (props.unknown) return 'fa-solid fa-circle-question'
  return String(props.icon || 'fa-solid fa-circle-question')
})

const isFontAwesomeIcon = computed(() => iconClass.value.includes('fa-'))

const iconGlyph = computed(() => {
  if (props.unknown) return '?'
  return String(props.icon || '?')
})

const displayName = computed(() => {
  if (props.unknown) return 'Unknown Card'
  return String(props.name || 'Unknown Card')
})

const formattedCoins = computed(() => {
  return Number(props.coins || 0).toLocaleString()
})
</script>

<style scoped>
.term-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 5 / 7;
  border-radius: 0.95rem;
  border: 1px solid rgba(20, 30, 55, 0.22);
  background: linear-gradient(165deg, var(--term-card-base), rgba(255, 255, 255, 0.9) 140%);
  box-shadow: 0 8px 18px rgba(20, 30, 55, 0.16);
  display: grid;
  grid-template-rows: repeat(7, minmax(0, 1fr));
}

.term-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
}

.term-card::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0.04));
}

.term-card--mutation-foil::before {
  opacity: 0.34;
  background:
    radial-gradient(circle at 20% 15%, rgba(255, 217, 158, 0.4), transparent 42%),
    linear-gradient(135deg, rgba(181, 118, 54, 0.2), rgba(255, 210, 138, 0.15)),
    repeating-linear-gradient(
      -28deg,
      rgba(167, 108, 58, 0.2) 0px,
      rgba(167, 108, 58, 0.2) 1px,
      transparent 1px,
      transparent 6px
    );
}

.term-card--mutation-holo::before {
  opacity: 0.38;
  background:
    radial-gradient(circle at 16% 18%, rgba(255, 255, 255, 0.35), transparent 38%),
    radial-gradient(circle at 82% 70%, rgba(187, 224, 255, 0.3), transparent 42%),
    radial-gradient(circle at 32% 72%, rgba(230, 182, 255, 0.18), transparent 46%),
    linear-gradient(140deg, rgba(255, 255, 255, 0.08), rgba(173, 234, 255, 0.22), rgba(245, 201, 255, 0.18)),
    radial-gradient(circle, rgba(255, 255, 255, 0.28) 0.8px, transparent 1px);
  background-size: auto, auto, auto, auto, 14px 14px;
}

.term-card__section {
  position: relative;
  z-index: 1;
  margin: 0.2rem 0.34rem;
  padding: 0.22rem 0.34rem;
  border-radius: 0.42rem;
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.term-card__mutation {
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  font-weight: 800;
}

.term-card__mutation-label--foil {
  color: #6f3a10;
  text-shadow: 0 0 6px rgba(255, 220, 166, 0.85);
  background: linear-gradient(120deg, #8d5423 0%, #f5d58b 44%, #a7612f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.term-card__mutation-label--holo {
  background: linear-gradient(120deg, #d5ecff 0%, #ffd8f2 35%, #d8f8ff 65%, #f9e4ff 100%);
  text-shadow: 0 0 6px rgba(228, 247, 255, 0.8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.term-card__icon {
  grid-row: 2 / span 2;
}

.term-card__icon-fa {
  font-size: 1.15rem;
  color: rgba(22, 34, 63, 0.88);
}

.term-card__icon-fallback {
  font-size: 0.9rem;
  font-weight: 700;
  color: rgba(22, 34, 63, 0.88);
}

.term-card__name {
  grid-row: 4;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.2;
  color: #19233d;
}

.term-card__rarity {
  grid-row: 5;
}

.term-card__rarity-pill {
  border-radius: 9999px;
  padding: 0.14rem 0.4rem;
  font-size: 0.54rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #ffffff;
}

.term-card__rarity-pill--common {
  background: #f08a24;
}

.term-card__rarity-pill--rare {
  background: #d64242;
}

.term-card__rarity-pill--legendary {
  background: #7e4bc9;
}

.term-card__coins {
  grid-row: 6 / span 2;
  flex-direction: column;
  gap: 0.05rem;
}

.term-card__coins-value {
  font-size: 0.78rem;
  font-weight: 800;
  color: #18223b;
}

.term-card__coins-label {
  font-size: 0.52rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #32466f;
}

.term-card--unknown {
  filter: saturate(0.22);
}

.term-card--unknown .term-card__section {
  background: rgba(255, 255, 255, 0.32);
}
</style>
