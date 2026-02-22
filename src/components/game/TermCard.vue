<template>
  <article
    class="term-card"
    :class="[
      `term-card--tier-${safeTier}`,
      `term-card--mutation-${safeMutation}`,
      `term-card--size-${safeSize}`,
      { 'term-card--stolen': stolen },
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
        {{ stolen ? 'stolen' : unknown ? '?' : safeRarity }}
      </span>
    </div>

    <div class="term-card__section term-card__coins">
      <span class="term-card__coins-value">{{ stolen || unknown ? '--' : `+${formattedCoins}` }}</span>
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
  stolen: { type: Boolean, default: false },
  unknown: { type: Boolean, default: false },
  size: { type: String, default: 'medium' },
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

const safeSize = computed(() => {
  const key = String(props.size || '').trim().toLowerCase()
  if (key === 'opening' || key === 'medium' || key === 'mini') return key
  return 'medium'
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
  const brightBase = mixRgb(base, [255, 255, 255], 0.12)
  const foilHighlight = mixRgb(brightBase, [240, 198, 112], 0.72)
  const foilMid = mixRgb(brightBase, [165, 102, 52], 0.6)
  const holoA = mixRgb(brightBase, [178, 232, 255], 0.7)
  const holoB = mixRgb(brightBase, [232, 186, 255], 0.66)
  const holoC = mixRgb(brightBase, [198, 255, 238], 0.62)

  return {
    '--term-card-base': `rgb(${rgbVar(brightBase)})`,
    '--term-card-base-rgb': rgbVar(brightBase),
    '--term-card-foil-hi-rgb': rgbVar(foilHighlight),
    '--term-card-foil-mid-rgb': rgbVar(foilMid),
    '--term-card-holo-a-rgb': rgbVar(holoA),
    '--term-card-holo-b-rgb': rgbVar(holoB),
    '--term-card-holo-c-rgb': rgbVar(holoC),
  }
})

const iconName = computed(() => {
  if (props.stolen) return 'alert-triangle'
  if (props.unknown) return 'help-circle'
  return String(props.icon || 'help-circle')
})

const displayName = computed(() => {
  if (props.stolen) return 'Stolen! 🦆'
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
  --term-card-grid-rows: 0.7fr 1.6fr 1.32fr 0.78fr 0.85fr;
  --term-card-section-pad-y: 0.2rem;
  --term-card-section-pad-x: 0.45rem;
  --term-card-section-offset-y: -1px;
  --term-card-mutation-size: clamp(0.86rem, 1.3vw, 1.02rem);
  --term-card-icon-size: 2rem;
  --term-card-name-size: clamp(0.96rem, 1.38vw, 1.14rem);
  --term-card-name-line: 1.05;
  --term-card-rarity-size: 0.58rem;
  --term-card-rarity-pad-y: 0.14rem;
  --term-card-rarity-pad-x: 0.42rem;
  --term-card-coins-value-size: 0.82rem;
  --term-card-coins-label-size: 0.53rem;
  --term-card-mutation-stroke: 0.86px;
  position: relative;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 5 / 7;
  border-radius: 0.95rem;
  border: 1px solid rgba(20, 30, 55, 0.22);
  background: linear-gradient(165deg, var(--term-card-base), rgba(255, 255, 255, 0.9) 140%);
  box-shadow: 0 8px 18px rgba(20, 30, 55, 0.16);
  display: grid;
  grid-template-rows: var(--term-card-grid-rows);
}

.term-card--size-opening {
  --term-card-grid-rows: 0.72fr 1.7fr 1.45fr 0.8fr 0.9fr;
  --term-card-section-pad-y: 0.22rem;
  --term-card-section-pad-x: 0.52rem;
  --term-card-section-offset-y: -2px;
  --term-card-mutation-size: clamp(1.02rem, 2.2vw, 1.3rem);
  --term-card-icon-size: 2.35rem;
  --term-card-name-size: clamp(1.18rem, 2.7vw, 1.56rem);
  --term-card-name-line: 1.02;
  --term-card-rarity-size: 0.66rem;
  --term-card-rarity-pad-y: 0.18rem;
  --term-card-rarity-pad-x: 0.52rem;
  --term-card-coins-value-size: 0.95rem;
  --term-card-coins-label-size: 0.62rem;
  --term-card-mutation-stroke: 1px;
}

.term-card--size-medium {
  --term-card-grid-rows: 0.7fr 1.6fr 1.32fr 0.78fr 0.85fr;
}

.term-card--size-mini {
  --term-card-grid-rows: 0.62fr 1.38fr 1.26fr 0.68fr 0.74fr;
  --term-card-section-pad-y: 0.14rem;
  --term-card-section-pad-x: 0.32rem;
  --term-card-section-offset-y: 0;
  --term-card-mutation-size: clamp(0.48rem, 0.9vw, 0.58rem);
  --term-card-icon-size: 1.04rem;
  --term-card-name-size: clamp(0.76rem, 0.96vw, 0.9rem);
  --term-card-name-line: 1.08;
  --term-card-rarity-size: 0.46rem;
  --term-card-rarity-pad-y: 0.11rem;
  --term-card-rarity-pad-x: 0.34rem;
  --term-card-coins-value-size: 0.72rem;
  --term-card-coins-label-size: 0.44rem;
  --term-card-mutation-stroke: 0.55px;
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
    linear-gradient(160deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.05) 45%, rgba(255, 255, 255, 0)),
    radial-gradient(circle at 22% 12%, rgba(255, 255, 255, 0.35), transparent 38%);
  mix-blend-mode: soft-light;
}

.term-card--mutation-foil::before {
  opacity: 0.94;
  background:
    linear-gradient(
      124deg,
      rgba(var(--term-card-foil-hi-rgb), 0.56) 0%,
      rgba(var(--term-card-foil-mid-rgb), 0.58) 34%,
      rgba(var(--term-card-foil-hi-rgb), 0.52) 68%,
      rgba(var(--term-card-base-rgb), 0.42) 100%
    ),
    radial-gradient(circle at 20% 12%, rgba(var(--term-card-foil-hi-rgb), 0.9), transparent 36%),
    radial-gradient(circle at 82% 80%, rgba(var(--term-card-foil-hi-rgb), 0.42), transparent 42%),
    linear-gradient(154deg, rgba(var(--term-card-base-rgb), 0.36), rgba(var(--term-card-foil-mid-rgb), 0.26));
  background-size: 230% 230%, auto, auto, auto;
  animation: foil-spectrum 3.2s ease-in-out infinite;
  filter: saturate(1.45) brightness(1.2);
}

.term-card--mutation-foil::after {
  opacity: 0.88;
  background:
    linear-gradient(
      112deg,
      transparent 22%,
      rgba(255, 255, 255, 0.02) 28%,
      rgba(255, 246, 221, 0.8) 43%,
      rgba(255, 255, 255, 0.96) 50%,
      rgba(255, 222, 168, 0.58) 57%,
      rgba(255, 255, 255, 0.03) 66%,
      transparent 76%
    );
  background-size: 240% 100%;
  mix-blend-mode: screen;
  animation: foil-glint 2.6s ease-in-out infinite;
}

.term-card--mutation-holo::before {
  opacity: 0.94;
  background:
    linear-gradient(
      122deg,
      rgba(var(--term-card-holo-a-rgb), 0.62) 0%,
      rgba(var(--term-card-holo-b-rgb), 0.64) 24%,
      rgba(var(--term-card-holo-c-rgb), 0.62) 48%,
      rgba(var(--term-card-holo-b-rgb), 0.64) 74%,
      rgba(var(--term-card-holo-a-rgb), 0.62) 100%
    ),
    radial-gradient(circle at 14% 14%, rgba(var(--term-card-holo-a-rgb), 0.82), transparent 36%),
    radial-gradient(circle at 86% 72%, rgba(var(--term-card-holo-b-rgb), 0.78), transparent 38%),
    radial-gradient(circle at 26% 84%, rgba(var(--term-card-holo-c-rgb), 0.72), transparent 42%),
    radial-gradient(circle at 74% 26%, rgba(var(--term-card-holo-b-rgb), 0.66), transparent 40%),
    linear-gradient(
      142deg,
      rgba(var(--term-card-base-rgb), 0.34),
      rgba(var(--term-card-holo-a-rgb), 0.56),
      rgba(var(--term-card-holo-b-rgb), 0.52)
    );
  background-size: 260% 260%, auto, auto, auto, auto, auto;
  animation: holo-spectrum 3.4s ease-in-out infinite;
  filter: saturate(1.7) brightness(1.16);
}

.term-card--mutation-holo::after {
  opacity: 0.86;
  background:
    linear-gradient(
      118deg,
      transparent 20%,
      rgba(255, 255, 255, 0.04) 28%,
      rgba(226, 255, 255, 0.62) 40%,
      rgba(255, 255, 255, 0.85) 50%,
      rgba(255, 216, 255, 0.58) 58%,
      rgba(210, 255, 239, 0.5) 64%,
      rgba(255, 255, 255, 0.04) 72%,
      transparent 82%
    ),
    linear-gradient(
      32deg,
      rgba(147, 235, 255, 0.24),
      rgba(255, 157, 236, 0.24),
      rgba(155, 255, 217, 0.24)
    );
  background-size: 240% 100%, 220% 220%;
  mix-blend-mode: screen;
  animation: holo-glint 2.9s ease-in-out infinite;
}

.term-card__section {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: var(--term-card-section-pad-y) var(--term-card-section-pad-x);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  transform: translateY(var(--term-card-section-offset-y));
}

.term-card__mutation {
  grid-row: 1;
  font-size: var(--term-card-mutation-size);
  letter-spacing: 0.12em;
  font-weight: 900;
  opacity: 1;
  line-height: 1;
}

.term-card__mutation-label--foil {
  color: #6f3a10;
  text-shadow: 0 0 12px rgba(255, 220, 166, 1), 0 0 24px rgba(208, 146, 79, 0.82);
  background: linear-gradient(120deg, #8d5423 0%, #f5d58b 44%, #a7612f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: var(--term-card-mutation-stroke) rgba(0, 0, 0, 0.72);
}

.term-card__mutation-label--holo {
  background: linear-gradient(120deg, #d5ecff 0%, #ffd8f2 35%, #d8f8ff 65%, #f9e4ff 100%);
  text-shadow: 0 0 12px rgba(228, 247, 255, 1), 0 0 24px rgba(204, 170, 255, 0.84);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: var(--term-card-mutation-stroke) rgba(0, 0, 0, 0.72);
}

.term-card__icon {
  grid-row: 2;
}

.term-card__icon-feather {
  width: var(--term-card-icon-size);
  height: var(--term-card-icon-size);
  color: rgba(22, 34, 63, 0.88);
  filter: drop-shadow(0 2px 1px rgba(255, 255, 255, 0.35));
}

.term-card__name {
  grid-row: 3;
  font-size: var(--term-card-name-size);
  font-weight: 900;
  line-height: var(--term-card-name-line);
  color: #19233d;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
  letter-spacing: 0.01em;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-wrap: balance;
}

.term-card__rarity {
  grid-row: 4;
  opacity: 0.88;
}

.term-card__rarity-pill {
  border-radius: 9999px;
  padding: var(--term-card-rarity-pad-y) var(--term-card-rarity-pad-x);
  font-size: var(--term-card-rarity-size);
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
  grid-row: 5;
  flex-direction: column;
  gap: 0.04rem;
  opacity: 0.82;
  align-self: center;
  padding-top: 0;
}

.term-card__coins-value {
  font-size: var(--term-card-coins-value-size);
  font-weight: 700;
  color: #18223b;
}

.term-card__coins-label {
  font-size: var(--term-card-coins-label-size);
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

.term-card--stolen {
  border-color: rgba(210, 85, 82, 0.5);
  box-shadow: 0 8px 18px rgba(146, 46, 40, 0.2);
}

.term-card--stolen .term-card__section {
  background: rgba(255, 242, 241, 0.64);
}

.term-card--stolen .term-card__name {
  color: #8a2525;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.42);
}

.term-card--stolen .term-card__icon-feather {
  color: #8a2525;
}

.term-card--stolen .term-card__rarity-pill {
  background: #cf4d4d;
}

@keyframes foil-spectrum {
  0% {
    background-position:
      0% 20%,
      20% 12%,
      82% 80%,
      0% 0%;
  }
  50% {
    background-position:
      100% 80%,
      24% 18%,
      76% 74%,
      100% 100%;
  }
  100% {
    background-position:
      0% 20%,
      20% 12%,
      82% 80%,
      0% 0%;
  }
}

@keyframes foil-glint {
  0% {
    background-position: 0% 0%;
    opacity: 0.74;
  }
  50% {
    background-position: 100% 0%;
    opacity: 0.96;
  }
  100% {
    background-position: 0% 0%;
    opacity: 0.74;
  }
}

@keyframes holo-spectrum {
  0% {
    background-position:
      0% 12%,
      14% 14%,
      86% 72%,
      26% 84%,
      74% 26%,
      0% 0%;
    filter: saturate(1.6) brightness(1.12) hue-rotate(0deg);
  }
  50% {
    background-position:
      100% 88%,
      20% 22%,
      80% 64%,
      34% 76%,
      68% 32%,
      100% 100%;
    filter: saturate(1.9) brightness(1.2) hue-rotate(22deg);
  }
  100% {
    background-position:
      0% 12%,
      14% 14%,
      86% 72%,
      26% 84%,
      74% 26%,
      0% 0%;
    filter: saturate(1.6) brightness(1.12) hue-rotate(0deg);
  }
}

@keyframes holo-glint {
  0% {
    background-position:
      0% 0%,
      0% 0%;
    opacity: 0.72;
  }
  50% {
    background-position:
      100% 100%,
      100% 100%;
    opacity: 0.92;
  }
  100% {
    background-position:
      0% 0%,
      0% 0%;
    opacity: 0.72;
  }
}

@media (prefers-reduced-motion: reduce) {
  .term-card--mutation-foil::before,
  .term-card--mutation-foil::after,
  .term-card--mutation-holo::before,
  .term-card--mutation-holo::after {
    animation: none;
  }
}
</style>
