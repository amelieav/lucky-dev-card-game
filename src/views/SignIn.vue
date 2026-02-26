<template>
  <section class="signin-wrap mx-auto w-full max-w-4xl px-4 sm:px-6">
    <div class="signin-bg" aria-hidden="true">
      <div
        v-for="card in decoCards"
        :key="card.id"
        :class="['signin-bg-card', { 'signin-bg-card--foil': card.isFoil }]"
        :style="{
          top: card.top,
          left: card.left,
          '--card-color-a': card.colorA,
          '--card-color-b': card.colorB,
          '--card-highlight': card.highlight,
          '--card-rotation': `${card.rotate}deg`,
          '--card-spin-z': `${card.spinZ}deg`,
          '--card-flip-y': `${card.flipY}deg`,
          '--card-flip-x': `${card.flipX}deg`,
          '--card-drift-x': `${card.driftX}px`,
          '--card-start-y': `${card.startY}vh`,
          '--card-end-y': `${card.endY}vh`,
          animationDuration: card.duration,
          animationDelay: card.delay,
        }"
      >
        <span class="signin-bg-card__tier">T{{ card.tier }}</span>
        <span class="signin-bg-card__name">{{ card.name }}</span>
      </div>
    </div>

    <div class="signin-panel card relative z-10 mx-auto p-6 sm:p-8">
      <p class="text-xs uppercase text-muted" style="letter-spacing:0.18em;">Lucky Dev</p>
      <h1 class="mt-2 text-2xl font-semibold">Magic link sign in</h1>
      <p class="mt-2 text-base text-muted">
        Sign in to save your progression, upgrades, and leaderboard identity.
      </p>

      <form class="mt-5 space-y-3" @submit.prevent="handleSubmit">
        <label class="block text-sm font-medium">Email</label>
        <input v-model="email" class="form-input" type="email" required placeholder="you@example.com" />
        <button class="btn-primary w-full" type="submit" :disabled="loading">Send magic link</button>
      </form>

      <p v-if="magicLinkSent" class="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
        Check your inbox for the sign-in link.
        Open the magic link on the device where you want to play.
      </p>

      <p v-if="error" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {{ error }}
      </p>

      <p class="mt-4 text-xs text-muted">
        This app uses Supabase Auth with email OTP magic links.
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'

const store = useStore()
const router = useRouter()
const email = ref('')

const loading = computed(() => store.state.auth.loading)
const magicLinkSent = computed(() => store.state.auth.magicLinkSent)
const error = computed(() => store.state.auth.error)
const decoNames = [
  'Null Pointer', 'Cache Ghost', 'Loop Mage', 'Merge Warden', 'Ship Titan', 'Lint Sprite',
  'Test Oracle', 'Hook Runner', 'State Smith', 'Deploy Archon', 'Branch Whisper', 'Heap Ranger',
]
const TOTAL_DECO_CARDS = 24
const cardPalettes = [
  { a: 'rgba(133, 71, 40, 0.74)', b: 'rgba(44, 20, 66, 0.74)', h: 'rgba(255, 236, 204, 0.34)' },
  { a: 'rgba(48, 91, 156, 0.74)', b: 'rgba(32, 49, 109, 0.74)', h: 'rgba(224, 238, 255, 0.3)' },
  { a: 'rgba(46, 128, 104, 0.74)', b: 'rgba(22, 70, 69, 0.74)', h: 'rgba(214, 255, 243, 0.3)' },
  { a: 'rgba(122, 62, 146, 0.74)', b: 'rgba(56, 23, 88, 0.74)', h: 'rgba(241, 223, 255, 0.32)' },
  { a: 'rgba(152, 54, 74, 0.74)', b: 'rgba(73, 24, 45, 0.74)', h: 'rgba(255, 220, 230, 0.3)' },
]

function seededUnit(index, salt = 0) {
  const x = Math.sin((index + 1) * 12.9898 + (salt * 78.233)) * 43758.5453
  return x - Math.floor(x)
}

const decoCards = Array.from({ length: TOTAL_DECO_CARDS }, (_, i) => {
  const duration = 42 + ((i * 7) % 18) // 42s..59s (slower)
  const phase = (((i * 11) % TOTAL_DECO_CARDS) / TOTAL_DECO_CARDS) * duration // spread across full cycle
  const laneBase = ((i + 0.5) / TOTAL_DECO_CARDS) * 96 // even lanes across width
  const laneJitter = (seededUnit(i, 1) - 0.5) * 3.6 // +/-1.8%
  const left = Math.max(2, Math.min(98, 2 + laneBase + laneJitter))
  const palette = cardPalettes[i % cardPalettes.length]
  return {
    id: `card-${i + 1}`,
    tier: (i % 6) + 1,
    name: decoNames[i % decoNames.length],
    top: `${-14 - ((i * 5) % 12)}%`,
    left: `${left.toFixed(2)}%`,
    rotate: -18 + ((i * 13) % 36),
    spinZ: (i % 2 === 0 ? 1 : -1) * (260 + ((i * 17) % 180)),
    flipY: (i % 2 === 0 ? 1 : -1) * (420 + ((i * 23) % 420)),
    flipX: (i % 2 === 0 ? 1 : -1) * (45 + ((i * 19) % 70)),
    driftX: -14 + (seededUnit(i, 2) * 28),
    startY: -96 - ((i * 3) % 28),
    endY: 188 + ((i * 5) % 26),
    duration: `${duration}s`,
    delay: `-${phase.toFixed(2)}s`,
    colorA: palette.a,
    colorB: palette.b,
    highlight: palette.h,
    isFoil: i === 7,
  }
})

onMounted(async () => {
  await store.dispatch('debug/hydrate')
  await store.dispatch('auth/initAuth')

  if (store.state.auth.user) {
    router.replace('/game')
  }
})

async function handleSubmit() {
  await store.dispatch('auth/sendMagicLink', email.value.trim())
}
</script>

<style scoped>
.signin-wrap {
  position: relative;
  overflow: visible;
  isolation: isolate;
  min-height: calc(100vh - 9rem);
  padding-top: 18px;
}

.signin-bg {
  position: fixed;
  inset: 0;
  width: 100vw;
  pointer-events: none;
  z-index: 0;
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
}

.signin-bg-card {
  position: absolute;
  width: 126px;
  height: 164px;
  border-radius: 14px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.9);
  background:
    radial-gradient(circle at 18% 20%, var(--card-highlight), transparent 40%),
    linear-gradient(155deg, var(--card-color-a), var(--card-color-b));
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.36);
  opacity: 0.28;
  transform: translate3d(0, var(--card-start-y), 0) rotateZ(var(--card-rotation)) rotateY(0deg) rotateX(0deg);
  transform-style: preserve-3d;
  will-change: transform;
  animation-name: card-fall-spin;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.signin-bg-card--foil {
  background:
    linear-gradient(115deg, rgba(250, 208, 110, 0.74), rgba(182, 120, 40, 0.76), rgba(242, 210, 146, 0.72)),
    radial-gradient(circle at 24% 22%, rgba(255, 250, 214, 0.56), transparent 42%);
  border-color: rgba(255, 230, 160, 0.5);
  box-shadow:
    0 14px 36px rgba(133, 90, 21, 0.34),
    inset 0 0 0 1px rgba(255, 242, 201, 0.38);
}

.signin-bg-card--foil::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: linear-gradient(130deg, transparent 18%, rgba(255, 252, 220, 0.66) 48%, transparent 72%);
  mix-blend-mode: screen;
  opacity: 0.5;
  animation: foil-shimmer 3.6s ease-in-out infinite;
}

.signin-panel {
  max-width: 42rem;
}

.signin-bg-card__tier {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.signin-bg-card__name {
  font-size: 0.7rem;
  line-height: 1.15;
}

@media (max-width: 640px) {
  .signin-bg-card {
    width: 88px;
    height: 116px;
    opacity: 0.17;
  }
}

@keyframes card-fall-spin {
  0% {
    transform: translate3d(0, var(--card-start-y), 0)
      rotateZ(var(--card-rotation))
      rotateY(0deg)
      rotateX(0deg);
  }
  100% {
    transform: translate3d(var(--card-drift-x), var(--card-end-y), 0)
      rotateZ(calc(var(--card-rotation) + var(--card-spin-z)))
      rotateY(var(--card-flip-y))
      rotateX(var(--card-flip-x));
  }
}

@keyframes foil-shimmer {
  0% { transform: translateX(-16%) translateY(-2%) rotate(0deg); opacity: 0.35; }
  50% { transform: translateX(12%) translateY(2%) rotate(2deg); opacity: 0.62; }
  100% { transform: translateX(-16%) translateY(-2%) rotate(0deg); opacity: 0.35; }
}
</style>
