<template>
  <section class="signin-wrap mx-auto w-full max-w-4xl px-4 sm:px-6">
    <div class="signin-bg" aria-hidden="true">
      <div
        v-for="card in decoCards"
        :key="card.id"
        class="signin-bg-card"
        :style="{
          top: card.top,
          left: card.left,
          transform: `rotate(${card.rotate}deg)`,
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
const decoCards = [
  { id: 'a', tier: 2, name: 'Null Pointer', top: '8%', left: '-2%', rotate: -18, delay: '0s' },
  { id: 'b', tier: 4, name: 'Cache Ghost', top: '12%', left: '78%', rotate: 14, delay: '0.8s' },
  { id: 'c', tier: 3, name: 'Loop Mage', top: '54%', left: '-4%', rotate: -10, delay: '1.3s' },
  { id: 'd', tier: 5, name: 'Merge Warden', top: '62%', left: '82%', rotate: 16, delay: '1.9s' },
  { id: 'e', tier: 6, name: 'Ship Titan', top: '76%', left: '18%', rotate: -8, delay: '2.4s' },
]

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
  overflow: clip;
  isolation: isolate;
  min-height: 460px;
  padding-top: 18px;
}

.signin-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
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
    radial-gradient(circle at 18% 20%, rgba(255, 255, 255, 0.28), transparent 40%),
    linear-gradient(155deg, rgba(153, 62, 31, 0.72), rgba(43, 16, 60, 0.72));
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.36);
  opacity: 0.28;
  animation: float-card 7s ease-in-out infinite alternate;
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
    opacity: 0.2;
  }
}

@keyframes float-card {
  0% { translate: 0 0; }
  100% { translate: 0 -10px; }
}
</style>
