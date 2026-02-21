<template>
  <article
    class="term-card"
    :class="[
      `term-card--tier-${safeTier}`,
      `term-card--mutation-${safeMutation}`,
      { 'term-card--unknown': unknown },
    ]"
    :style="cardCssVars"
  >
    <div class="term-card__section term-card__mutation">
      <span v-if="safeMutation === 'foil'" class="term-card__mutation-label term-card__mutation-label--foil">FOIL</span>
      <span v-else-if="safeMutation === 'holo'" class="term-card__mutation-label term-card__mutation-label--holo">HOLO</span>
    </div>

    <div class="term-card__section term-card__icon">
      <vue-feather :type="iconName" class="term-card__icon-feather" stroke-width="2.3" aria-hidden="true"></vue-feather>
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
  icon: { type: String, default: 'help-circle' },
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

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(Number(value || 0))))
}

function normalizeHexColor(value) {
  const raw = String(value || '').trim()
  if (/^#([0-9a-f]{6})$/i.test(raw)) return raw
  if (/^#([0-9a-f]{3})$/i.test(raw)) {
    const parts = raw.slice(1).split('')
    return `#${parts.map((part) => `${part}${part}`).join('')}`
  }
  return '#5f6f93'
}

function hexToRgb(hex) {
  const normalized = normalizeHexColor(hex).slice(1)
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ]
}

function mixRgb(a, b, ratio) {
  const t = Math.max(0, Math.min(1, Number(ratio || 0)))
  return [
    clampChannel((a[0] * (1 - t)) + (b[0] * t)),
    clampChannel((a[1] * (1 - t)) + (b[1] * t)),
    clampChannel((a[2] * (1 - t)) + (b[2] * t)),
  ]
}

function rgbVar(rgb) {
  return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`
}

const cardCssVars = computed(() => {
  const base = hexToRgb(tierColor.value)
  const foilHighlight = mixRgb(base, [240, 198, 112], 0.72)
  const foilMid = mixRgb(base, [165, 102, 52], 0.6)
  const holoA = mixRgb(base, [178, 232, 255], 0.7)
  const holoB = mixRgb(base, [232, 186, 255], 0.66)
  const holoC = mixRgb(base, [198, 255, 238], 0.62)

  return {
    '--term-card-base': tierColor.value,
    '--term-card-base-rgb': rgbVar(base),
    '--term-card-foil-hi-rgb': rgbVar(foilHighlight),
    '--term-card-foil-mid-rgb': rgbVar(foilMid),
    '--term-card-holo-a-rgb': rgbVar(holoA),
    '--term-card-holo-b-rgb': rgbVar(holoB),
    '--term-card-holo-c-rgb': rgbVar(holoC),
  }
})

const iconName = computed(() => {
  if (props.unknown) return 'help-circle'
  return String(props.icon || 'help-circle')
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
  --term-card-base-rgb: 95, 111, 147;
  --term-card-foil-hi-rgb: 233, 194, 122;
  --term-card-foil-mid-rgb: 163, 104, 58;
  --term-card-holo-a-rgb: 176, 228, 255;
  --term-card-holo-b-rgb: 230, 188, 255;
  --term-card-holo-c-rgb: 200, 255, 238;
  position: relative;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 5 / 7;
  border-radius: 0.95rem;
  border: 1px solid rgba(20, 30, 55, 0.22);
  background: linear-gradient(165deg, var(--term-card-base), rgba(255, 255, 255, 0.9) 140%);
  box-shadow: 0 8px 18px rgba(20, 30, 55, 0.16);
  display: grid;
  grid-template-rows: 0.64fr 1.46fr 1.46fr 1.72fr 0.72fr 0.5fr 0.5fr;
}

.term-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  z-index: 0;
}

.term-card::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.04)),
    repeating-linear-gradient(
      180deg,
      transparent 0%,
      transparent calc((100% / 7) - 1px),
      rgba(255, 255, 255, 0.13) calc((100% / 7) - 1px),
      rgba(255, 255, 255, 0.13) calc(100% / 7)
    );
}

.term-card--mutation-foil::before {
  opacity: 0.82;
  background:
    linear-gradient(
      120deg,
      rgba(var(--term-card-foil-hi-rgb), 0.36),
      rgba(var(--term-card-foil-mid-rgb), 0.62),
      rgba(var(--term-card-base-rgb), 0.36)
    ),
    radial-gradient(circle at 20% 15%, rgba(var(--term-card-foil-hi-rgb), 0.76), transparent 42%),
    linear-gradient(135deg, rgba(var(--term-card-foil-mid-rgb), 0.52), rgba(var(--term-card-foil-hi-rgb), 0.45)),
    repeating-linear-gradient(
      -28deg,
      rgba(var(--term-card-foil-mid-rgb), 0.44) 0px,
      rgba(var(--term-card-foil-mid-rgb), 0.44) 1px,
      transparent 1px,
      transparent 6px
    );
  background-size: 200% 200%, auto, auto, auto;
  animation: foil-sheen 3.2s ease-in-out infinite;
  filter: saturate(1.25) brightness(1.12);
}

.term-card--mutation-holo::before {
  opacity: 0.86;
  background:
    linear-gradient(
      118deg,
      rgba(var(--term-card-holo-a-rgb), 0.44),
      rgba(var(--term-card-holo-b-rgb), 0.58),
      rgba(var(--term-card-holo-c-rgb), 0.5)
    ),
    radial-gradient(circle at 16% 18%, rgba(var(--term-card-holo-a-rgb), 0.68), transparent 38%),
    radial-gradient(circle at 82% 70%, rgba(var(--term-card-holo-a-rgb), 0.58), transparent 42%),
    radial-gradient(circle at 32% 72%, rgba(var(--term-card-holo-b-rgb), 0.44), transparent 46%),
    linear-gradient(
      140deg,
      rgba(var(--term-card-base-rgb), 0.22),
      rgba(var(--term-card-holo-a-rgb), 0.56),
      rgba(var(--term-card-holo-b-rgb), 0.48)
    ),
    radial-gradient(circle, rgba(255, 255, 255, 0.52) 0.8px, transparent 1px);
  background-size: 220% 220%, auto, auto, auto, auto, 14px 14px;
  animation: holo-sheen 2.8s ease-in-out infinite;
  filter: saturate(1.28) brightness(1.16);
}

.term-card__section {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0.22rem 0.52rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  transform: translateY(-2px);
}

.term-card__mutation {
  font-size: clamp(1.08rem, 2.4vw, 1.38rem);
  letter-spacing: 0.12em;
  font-weight: 900;
  opacity: 1;
}

.term-card__mutation-label--foil {
  color: #6f3a10;
  text-shadow: 0 0 12px rgba(255, 220, 166, 1), 0 0 24px rgba(208, 146, 79, 0.82);
  background: linear-gradient(120deg, #8d5423 0%, #f5d58b 44%, #a7612f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.72);
}

.term-card__mutation-label--holo {
  background: linear-gradient(120deg, #d5ecff 0%, #ffd8f2 35%, #d8f8ff 65%, #f9e4ff 100%);
  text-shadow: 0 0 12px rgba(228, 247, 255, 1), 0 0 24px rgba(204, 170, 255, 0.84);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.72);
}

.term-card__icon {
  grid-row: 2 / span 2;
}

.term-card__icon-feather {
  width: 2.35rem;
  height: 2.35rem;
  color: rgba(22, 34, 63, 0.88);
  filter: drop-shadow(0 2px 1px rgba(255, 255, 255, 0.35));
}

.term-card__name {
  grid-row: 4;
  font-size: clamp(1.28rem, 3vw, 1.72rem);
  font-weight: 900;
  line-height: 1;
  color: #19233d;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
  letter-spacing: 0.01em;
  word-break: break-word;
}

.term-card__rarity {
  grid-row: 5;
  opacity: 0.88;
}

.term-card__rarity-pill {
  border-radius: 9999px;
  padding: 0.18rem 0.52rem;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.16);
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
  gap: 0.03rem;
  opacity: 0.82;
  align-self: start;
  padding-top: 0.18rem;
}

.term-card__coins-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: #18223b;
}

.term-card__coins-label {
  font-size: 0.62rem;
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

@keyframes foil-sheen {
  0% {
    background-position:
      0% 0%,
      20% 15%,
      0% 0%,
      0% 0%;
  }
  50% {
    background-position:
      100% 100%,
      26% 20%,
      20% 10%,
      0% 0%;
  }
  100% {
    background-position:
      0% 0%,
      20% 15%,
      0% 0%,
      0% 0%;
  }
}

@keyframes holo-sheen {
  0% {
    background-position:
      0% 10%,
      16% 18%,
      82% 70%,
      32% 72%,
      0% 0%,
      0 0;
  }
  50% {
    background-position:
      100% 90%,
      20% 24%,
      76% 64%,
      36% 76%,
      100% 100%,
      7px 5px;
  }
  100% {
    background-position:
      0% 10%,
      16% 18%,
      82% 70%,
      32% 72%,
      0% 0%,
      0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .term-card--mutation-foil::before,
  .term-card--mutation-holo::before {
    animation: none;
  }
}
</style>
