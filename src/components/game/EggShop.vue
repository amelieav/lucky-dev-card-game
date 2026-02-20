<template>
  <section class="card p-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold">Pack Shop</h2>
      <p class="text-xs text-muted">Open packs to draw cards and duplicates.</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="pack in eggs"
        :key="pack.tier"
        class="rounded-xl border border-soft bg-panel-soft p-4"
      >
        <p class="text-xs text-muted">Tier {{ pack.tier }}</p>
        <h3 class="mt-1 text-base font-semibold">{{ pack.name }}</h3>
        <p class="mt-1 text-xs text-muted">{{ pack.description }}</p>
        <p class="mt-2 text-xs text-muted">Focus: {{ pack.rarityFocus }}</p>
        <p class="mt-3 text-sm font-semibold">{{ formatNumber(pack.price) }} coins</p>

        <button
          class="btn-primary mt-3 w-full"
          :disabled="loading || playerCoins < pack.price || pack.tier > highestUnlockedTier"
          @click="$emit('open', pack.tier)"
          type="button"
        >
          <span v-if="pack.tier > highestUnlockedTier">Locked</span>
          <span v-else-if="playerCoins < pack.price">Not enough coins</span>
          <span v-else>Open Pack</span>
        </button>
      </article>
    </div>
  </section>
</template>

<script setup>
defineProps({
  eggs: { type: Array, required: true },
  playerCoins: { type: Number, required: true },
  highestUnlockedTier: { type: Number, required: true },
  loading: { type: Boolean, default: false },
})

defineEmits(['open'])

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}
</script>
