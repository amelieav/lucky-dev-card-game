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
          <p class="text-xs uppercase tracking-wide text-muted">Adjective</p>
          <div class="mt-2 flex flex-col gap-2 sm:flex-row">
            <select v-model="partA" class="form-select sm:flex-1">
              <option v-for="item in partsA" :key="`a-word-${item}`" :value="item">{{ item }}</option>
            </select>
            <button class="btn-secondary sm:w-auto" type="button" @click="randomizePart('a')">Randomize</button>
          </div>
        </div>

        <div class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs uppercase tracking-wide text-muted">Animal</p>
          <div class="mt-2 flex flex-col gap-2 sm:flex-row">
            <select v-model="partB" class="form-select sm:flex-1">
              <option v-for="item in partsB" :key="`b-word-${item}`" :value="item">{{ item }}</option>
            </select>
            <button class="btn-secondary sm:w-auto" type="button" @click="randomizePart('b')">Randomize</button>
          </div>
        </div>

        <div class="rounded-xl border border-soft bg-panel-soft p-3">
          <p class="text-xs uppercase tracking-wide text-muted">Object</p>
          <div class="mt-2 flex flex-col gap-2 sm:flex-row">
            <select v-model="partC" class="form-select sm:flex-1">
              <option v-for="item in partsC" :key="`c-word-${item}`" :value="item">{{ item }}</option>
            </select>
            <button class="btn-secondary sm:w-auto" type="button" @click="randomizePart('c')">Randomize</button>
          </div>
        </div>

        <div class="flex gap-2">
          <button class="btn-secondary" type="button" @click="randomizeAll">Randomize All</button>
          <button class="btn-primary" type="submit" :disabled="loading">Save</button>
        </div>
      </form>

      <p v-if="saveMessage" class="mt-3 text-sm text-green-700">{{ saveMessage }}</p>
      <p v-if="error" class="mt-3 text-sm text-red-700">{{ error }}</p>
    </article>

    <article class="card p-5">
      <h2 class="text-lg font-semibold">Tips</h2>
      <ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
        <li>Pick an adjective, animal, and object for your display name.</li>
        <li>Randomize each slot independently until you like the combo.</li>
        <li>Press Save once to publish your final name.</li>
      </ul>
    </article>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { NICK_PARTS_A, NICK_PARTS_B, NICK_PARTS_C } from '../data/nicknameParts'

const store = useStore()
const saveMessage = ref('')

const partsA = NICK_PARTS_A
const partsB = NICK_PARTS_B
const partsC = NICK_PARTS_C

const partA = ref(partsA[0])
const partB = ref(partsB[0])
const partC = ref(partsC[0])

const snapshot = computed(() => store.state.game.snapshot)
const profile = computed(() => snapshot.value?.profile || {})
const loading = computed(() => store.state.game.actionLoading)
const error = computed(() => store.state.game.error)

const displayName = computed(() => profile.value.display_name || `${partA.value} ${partB.value} ${partC.value}`)

watch(
  profile,
  (nextProfile) => {
    if (nextProfile.nick_part_a) partA.value = nextProfile.nick_part_a
    if (nextProfile.nick_part_b) partB.value = nextProfile.nick_part_b
    if (nextProfile.nick_part_c) partC.value = nextProfile.nick_part_c
  },
  { immediate: true },
)

function randomizePart(slot) {
  if (slot === 'a') {
    partA.value = pick(partsA)
    return
  }

  if (slot === 'b') {
    partB.value = pick(partsB)
    return
  }

  partC.value = pick(partsC)
}

function randomizeAll() {
  randomizePart('a')
  randomizePart('b')
  randomizePart('c')
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
</script>
