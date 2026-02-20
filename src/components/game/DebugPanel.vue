<template>
  <section class="card p-5">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Debug Panel</h2>
      <button class="btn-secondary" type="button" @click="$emit('toggle')">
        {{ open ? 'Collapse' : 'Expand' }}
      </button>
    </div>

    <p class="mt-2 text-xs text-muted">
      Debug mode is enabled in this browser. Server-side allowlist still controls mutating actions.
    </p>
    <p class="mt-1 text-xs" :class="debugAllowed ? 'text-green-700' : 'text-amber-700'">
      {{ debugAllowed ? 'Allowlisted for debug actions.' : 'Not allowlisted. Mutating actions will fail.' }}
    </p>

    <div v-if="open" class="mt-4 grid gap-3">
      <div class="grid gap-2 sm:grid-cols-2">
        <input v-model.number="addCoinsAmount" class="form-input" type="number" min="1" placeholder="Add coins" />
        <button class="btn-secondary" type="button" :disabled="loading" @click="emitApply({ type: 'add_coins', amount: addCoinsAmount })">Add Coins</button>
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        <input v-model.number="setCoinsAmount" class="form-input" type="number" min="0" placeholder="Set coins" />
        <button class="btn-secondary" type="button" :disabled="loading" @click="emitApply({ type: 'set_coins', amount: setCoinsAmount })">Set Coins</button>
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        <input v-model.number="setLuckLevel" class="form-input" type="number" min="0" placeholder="Set luck level" />
        <button class="btn-secondary" type="button" :disabled="loading" @click="emitApply({ type: 'set_luck_level', level: setLuckLevel })">Set Luck</button>
      </div>

      <div class="grid gap-2 sm:grid-cols-3">
        <select v-model="grantTermKey" class="form-select">
          <option disabled value="">Select term</option>
          <option v-for="term in termOptions" :key="term.key" :value="term.key">{{ term.name }}</option>
        </select>
        <input v-model.number="grantCopies" class="form-input" type="number" min="1" placeholder="Copies" />
        <button class="btn-secondary" type="button" :disabled="loading || !grantTermKey" @click="emitApply({ type: 'grant_term', term_key: grantTermKey, copies: grantCopies })">Grant Term</button>
      </div>

      <div class="grid gap-2 sm:grid-cols-4">
        <input v-model.number="forcedTier" class="form-input" type="number" min="1" max="5" placeholder="Tier" />
        <select v-model="forcedRarity" class="form-select">
          <option value="">Any rarity</option>
          <option value="common">Common</option>
          <option value="rare">Rare</option>
          <option value="epic">Epic</option>
          <option value="legendary">Legendary</option>
        </select>
        <select v-model="forcedTermKey" class="form-select">
          <option value="">Any term</option>
          <option v-for="term in termOptions" :key="term.key" :value="term.key">{{ term.name }}</option>
        </select>
        <button class="btn-secondary" type="button" :disabled="loading" @click="emitApply({ type: 'set_next_reward', tier: forcedTier, rarity: forcedRarity || null, term_key: forcedTermKey || null })">Force Next Reward</button>
      </div>

      <button class="btn-secondary" type="button" :disabled="loading" @click="emitApply({ type: 'reset_account' })">Reset Account</button>

      <pre v-if="lastError" class="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{{ lastError }}</pre>
      <pre v-else-if="lastResult" class="rounded-xl border border-soft bg-panel-soft p-3 text-xs text-main max-h-40 overflow-auto">{{ pretty(lastResult) }}</pre>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  open: { type: Boolean, required: true },
  loading: { type: Boolean, default: false },
  debugAllowed: { type: Boolean, default: false },
  termOptions: { type: Array, required: true },
  lastError: { type: String, default: null },
  lastResult: { type: [Object, Array, String, Number, Boolean], default: null },
})

const emit = defineEmits(['toggle', 'apply'])

const addCoinsAmount = ref(1000)
const setCoinsAmount = ref(0)
const setLuckLevel = ref(0)
const grantTermKey = ref('')
const grantCopies = ref(1)
const forcedTier = ref(1)
const forcedRarity = ref('')
const forcedTermKey = ref('')

function emitApply(payload) {
  emit('apply', payload)
}

function pretty(value) {
  return JSON.stringify(value, null, 2)
}
</script>
