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

      <div class="grid gap-2 sm:grid-cols-3">
        <input v-model.number="setValueLevel" class="form-input" type="number" min="0" placeholder="Value level" />
        <input v-model.number="setMutationLevel" class="form-input" type="number" min="0" placeholder="Mutation level" />
        <input v-model.number="setTierBoostLevel" class="form-input" type="number" min="0" placeholder="Tier boost level" />
      </div>
      <div class="grid gap-2 sm:grid-cols-3">
        <button class="btn-secondary" type="button" :disabled="loading" @click="emitApply({ type: 'set_value_level', level: setValueLevel })">Set Value</button>
        <button class="btn-secondary" type="button" :disabled="loading" @click="emitApply({ type: 'set_mutation_level', level: setMutationLevel })">Set Mutation</button>
        <button class="btn-secondary" type="button" :disabled="loading" @click="emitApply({ type: 'set_tier_boost_level', level: setTierBoostLevel })">Set Tier Boost</button>
      </div>

      <div class="grid gap-2 sm:grid-cols-3">
        <select v-model="grantTermKey" class="form-select">
          <option disabled value="">Select term</option>
          <option v-for="term in termOptions" :key="term.key" :value="term.key">{{ term.name }}</option>
        </select>
        <input v-model.number="grantCopies" class="form-input" type="number" min="1" placeholder="Copies" />
        <button class="btn-secondary" type="button" :disabled="loading || !grantTermKey" @click="emitApply({ type: 'grant_term', term_key: grantTermKey, copies: grantCopies })">Grant Card</button>
      </div>

      <div class="grid gap-2 sm:grid-cols-5">
        <input v-model.number="forcedTier" class="form-input" type="number" min="1" max="6" placeholder="Tier" />
        <select v-model="forcedRarity" class="form-select">
          <option value="">Any rarity</option>
          <option value="common">Common</option>
          <option value="rare">Rare</option>
          <option value="legendary">Legendary</option>
        </select>
        <select v-model="forcedMutation" class="form-select">
          <option value="">Any mutation</option>
          <option value="none">None</option>
          <option value="foil">Foil</option>
          <option value="holo">Holo</option>
        </select>
        <select v-model="forcedTermKey" class="form-select">
          <option value="">Any term</option>
          <option v-for="term in termOptions" :key="term.key" :value="term.key">{{ term.name }}</option>
        </select>
        <button class="btn-secondary" type="button" :disabled="loading" @click="emitApply({ type: 'set_next_reward', tier: forcedTier, rarity: forcedRarity || null, mutation: forcedMutation || null, term_key: forcedTermKey || null })">Force Next Draw</button>
      </div>

      <button class="btn-secondary" type="button" :disabled="loading" @click="emitApply({ type: 'reset_account' })">Reset Account</button>

      <pre v-if="lastError" class="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{{ lastError }}</pre>
      <pre v-else-if="lastResult" class="max-h-40 overflow-auto rounded-xl border border-soft bg-panel-soft p-3 text-xs text-main">{{ pretty(lastResult) }}</pre>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
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
const setValueLevel = ref(0)
const setMutationLevel = ref(0)
const setTierBoostLevel = ref(0)
const grantTermKey = ref('')
const grantCopies = ref(1)
const forcedTier = ref(1)
const forcedRarity = ref('')
const forcedMutation = ref('')
const forcedTermKey = ref('')

function emitApply(payload) {
  emit('apply', payload)
}

function pretty(value) {
  return JSON.stringify(value, null, 2)
}
</script>
