<template>
  <section class="grid gap-4 lg:grid-cols-3">
    <article class="card p-5 lg:col-span-2">
      <h1 class="text-xl font-semibold">Profile</h1>
      <p class="mt-1 text-sm text-muted">Set your leaderboard display name.</p>

      <div class="mt-4 rounded-xl border border-soft bg-panel-soft p-4">
        <p class="text-xs uppercase tracking-wide text-muted">Current Name</p>
        <p class="mt-1 text-lg font-semibold">{{ currentName }}</p>
        <p v-if="!nameCustomized" class="mt-1 text-xs text-amber-700">
          Name setup required before playing.
        </p>
      </div>

      <form class="mt-4 grid gap-3" @submit.prevent="saveName">
        <div class="rounded-xl border border-soft bg-panel-soft p-3">
          <label for="display-name-input" class="text-xs uppercase tracking-wide text-muted">Display Name</label>
          <input
            id="display-name-input"
            v-model="draftName"
            class="form-input mt-2"
            type="text"
            autocomplete="off"
            maxlength="10"
            placeholder="Agent_007"
            @input="onNameInput"
          />
          <p class="mt-2 text-xs text-muted">3-10 chars · letters, numbers, underscore only.</p>
          <p v-if="validationMessage" class="mt-2 text-sm text-red-700">{{ validationMessage }}</p>
        </div>

        <div class="flex gap-2">
          <button class="btn-secondary" type="button" @click="suggestName">Random Suggestion</button>
          <button class="btn-primary" type="submit" :disabled="loading || !canSave">Save</button>
        </div>
      </form>

      <p v-if="saveMessage" class="mt-3 text-sm text-green-700">{{ saveMessage }}</p>
      <p v-if="error" class="mt-3 text-sm text-red-700">{{ error }}</p>
    </article>

    <article class="card p-5">
      <h2 class="text-lg font-semibold">Rules</h2>
      <ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
        <li>3-10 characters.</li>
        <li>Only letters, numbers, and underscore.</li>
        <li>No profanity.</li>
        <li>No references to religion.</li>
        <li>No references to countries.</li>
        <li>No derogatory language.</li>
      </ul>
    </article>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { NICK_PARTS_A, NICK_PARTS_B } from '../data/nicknameParts'
import { validateDisplayName } from '../lib/displayNameValidation.mjs'

const store = useStore()
const saveMessage = ref('')
const draftName = ref('')
const edited = ref(false)

const snapshot = computed(() => store.state.game.snapshot)
const profile = computed(() => snapshot.value?.profile || {})
const loading = computed(() => store.state.game.actionLoading)
const error = computed(() => store.state.game.error)

const currentName = computed(() => profile.value.display_name || '')
const nameCustomized = computed(() => Boolean(profile.value.name_customized))
const validation = computed(() => validateDisplayName(draftName.value))
const validationMessage = computed(() => (validation.value.ok ? '' : validation.value.message))
const canSave = computed(() => {
  if (!validation.value.ok) return false
  return validation.value.value !== (currentName.value || '')
})

watch(
  () => profile.value.display_name,
  (nextName) => {
    if (!edited.value) {
      draftName.value = String(nextName || '')
    }
  },
  { immediate: true },
)

onMounted(async () => {
  if (!snapshot.value) {
    await store.dispatch('game/bootstrapPlayer')
  }
  if (!draftName.value && currentName.value) {
    draftName.value = currentName.value
  }
})

function onNameInput() {
  edited.value = true
  saveMessage.value = ''
}

function suggestName() {
  saveMessage.value = ''
  edited.value = true

  for (let i = 0; i < 20; i += 1) {
    const candidate = `${pick(NICK_PARTS_A)}_${pick(NICK_PARTS_B)}`
    const check = validateDisplayName(candidate)
    if (check.ok) {
      draftName.value = check.value
      return
    }
  }

  draftName.value = `Player_${Math.floor(Math.random() * 9000) + 1000}`
}

async function saveName() {
  saveMessage.value = ''

  const check = validateDisplayName(draftName.value)
  if (!check.ok) {
    return
  }

  await store.dispatch('game/updateNickname', {
    displayName: check.value,
  })

  if (!store.state.game.error) {
    saveMessage.value = 'Display name updated.'
    edited.value = false
  }
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}
</script>
