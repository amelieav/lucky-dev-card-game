<template>
  <section class="grid gap-4 lg:grid-cols-3">
    <article class="card p-5 lg:col-span-2">
      <h1 class="text-xl font-semibold">Profile</h1>
      <p class="mt-1 text-sm text-muted">Customize your leaderboard display name.</p>

      <div class="mt-4 rounded-xl border border-soft bg-panel-soft p-4">
        <p class="text-xs uppercase tracking-wide text-muted">Current Name</p>
        <p class="mt-1 text-lg font-semibold">{{ displayName }}</p>
      </div>

      <form class="mt-4 grid gap-3" @submit.prevent="saveName">
        <div class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs uppercase tracking-wide text-muted">Word 1</p>
          <div class="mt-2 grid gap-2 sm:grid-cols-2">
            <select v-model="categoryA" class="form-select">
              <option v-for="option in categoryOptions" :key="`a-${option.key}`" :value="option.key">{{ option.label }}</option>
            </select>
            <input v-model.trim="searchA" class="form-input" type="text" placeholder="Search words..." />
          </div>
          <select v-model="partA" class="form-select mt-2">
            <option v-for="item in filteredPartsA" :key="`a-word-${item}`" :value="item">{{ item }}</option>
          </select>
        </div>

        <div class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs uppercase tracking-wide text-muted">Word 2</p>
          <div class="mt-2 grid gap-2 sm:grid-cols-2">
            <select v-model="categoryB" class="form-select">
              <option v-for="option in categoryOptions" :key="`b-${option.key}`" :value="option.key">{{ option.label }}</option>
            </select>
            <input v-model.trim="searchB" class="form-input" type="text" placeholder="Search words..." />
          </div>
          <select v-model="partB" class="form-select mt-2">
            <option v-for="item in filteredPartsB" :key="`b-word-${item}`" :value="item">{{ item }}</option>
          </select>
        </div>

        <div class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs uppercase tracking-wide text-muted">Word 3</p>
          <div class="mt-2 grid gap-2 sm:grid-cols-2">
            <select v-model="categoryC" class="form-select">
              <option v-for="option in categoryOptions" :key="`c-${option.key}`" :value="option.key">{{ option.label }}</option>
            </select>
            <input v-model.trim="searchC" class="form-input" type="text" placeholder="Search words..." />
          </div>
          <select v-model="partC" class="form-select mt-2">
            <option v-for="item in filteredPartsC" :key="`c-word-${item}`" :value="item">{{ item }}</option>
          </select>
        </div>

        <div class="flex gap-2">
          <button class="btn-secondary" type="button" @click="randomize">Randomize</button>
          <button class="btn-primary" type="submit" :disabled="loading">Save</button>
        </div>
      </form>

      <p v-if="saveMessage" class="mt-3 text-sm text-green-700">{{ saveMessage }}</p>
      <p v-if="error" class="mt-3 text-sm text-red-700">{{ error }}</p>
    </article>

    <article class="card p-5">
      <h2 class="text-lg font-semibold">Tips</h2>
      <ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
        <li>Your name updates immediately on the next leaderboard refresh.</li>
        <li>Use randomize to quickly generate variants.</li>
        <li>Progress is tied to your signed-in email account.</li>
      </ul>
    </article>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { NICK_PARTS_A, NICK_PARTS_B, NICK_PARTS_C, NICK_WORD_CATEGORIES } from '../data/nicknameParts'

const store = useStore()
const saveMessage = ref('')

const partsA = NICK_PARTS_A
const partsB = NICK_PARTS_B
const partsC = NICK_PARTS_C

const categoryOptions = [
  { key: 'all', label: 'All Categories' },
  { key: 'colors', label: 'Colors' },
  { key: 'adjectives', label: 'Adjectives' },
  { key: 'animals', label: 'Animals' },
  { key: 'objects', label: 'Objects' },
  { key: 'coding', label: 'Coding Concepts' },
]

const categoryWordSets = {
  colors: new Set(NICK_WORD_CATEGORIES.colors),
  adjectives: new Set(NICK_WORD_CATEGORIES.adjectives),
  animals: new Set(NICK_WORD_CATEGORIES.animals),
  objects: new Set(NICK_WORD_CATEGORIES.objects),
  coding: new Set(NICK_WORD_CATEGORIES.coding),
}

const partA = ref(partsA[0])
const partB = ref(partsB[0])
const partC = ref(partsC[0])
const categoryA = ref('all')
const categoryB = ref('all')
const categoryC = ref('all')
const searchA = ref('')
const searchB = ref('')
const searchC = ref('')

const snapshot = computed(() => store.state.game.snapshot)
const profile = computed(() => snapshot.value?.profile || {})
const loading = computed(() => store.state.game.actionLoading)
const error = computed(() => store.state.game.error)

const displayName = computed(() => profile.value.display_name || `${partA.value} ${partB.value} ${partC.value}`)
const filteredPartsA = computed(() => filterWords(partsA, partA.value, searchA.value, categoryA.value))
const filteredPartsB = computed(() => filterWords(partsB, partB.value, searchB.value, categoryB.value))
const filteredPartsC = computed(() => filterWords(partsC, partC.value, searchC.value, categoryC.value))

watch(
  profile,
  (nextProfile) => {
    if (nextProfile.nick_part_a) partA.value = nextProfile.nick_part_a
    if (nextProfile.nick_part_b) partB.value = nextProfile.nick_part_b
    if (nextProfile.nick_part_c) partC.value = nextProfile.nick_part_c
  },
  { immediate: true },
)

function randomize() {
  const used = new Set()
  partA.value = pickDistinct(partsA, used)
  partB.value = pickDistinct(partsB, used)
  partC.value = pickDistinct(partsC, used)
}

async function saveName() {
  saveMessage.value = ''

  await store.dispatch('game/updateNickname', {
    partA: partA.value,
    partB: partB.value,
    partC: partC.value,
  })

  if (!store.state.game.error) {
    saveMessage.value = 'Display name updated.'
  }
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickDistinct(arr, used) {
  const available = arr.filter((item) => !used.has(item))
  const picked = pick(available.length ? available : arr)
  used.add(picked)
  return picked
}

function filterWords(pool, selected, query, category) {
  const normalizedQuery = String(query || '').trim().toLowerCase()
  const categorySet = category === 'all' ? null : categoryWordSets[category]

  const filtered = pool.filter((item) => {
    if (categorySet && !categorySet.has(item)) return false
    if (!normalizedQuery) return true
    return item.toLowerCase().includes(normalizedQuery)
  })

  if (selected && !filtered.includes(selected) && pool.includes(selected)) {
    return [selected, ...filtered]
  }

  return filtered.length ? filtered : (selected ? [selected] : pool.slice(0, 30))
}
</script>
