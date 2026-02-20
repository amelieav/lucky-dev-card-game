<template>
  <section class="card p-5">
    <h2 class="text-lg font-semibold">Luck Engine</h2>
    <p class="mt-1 text-sm text-muted">
      Luck shifts rarity odds toward stronger card rewards.
    </p>

    <div class="mt-4 grid grid-cols-2 gap-3">
      <div class="rounded-xl border border-soft bg-panel-soft p-3">
        <p class="text-xs text-muted">Current Luck Engine</p>
        <p class="text-lg font-semibold">Lv {{ luckLevel }}</p>
      </div>

      <div class="rounded-xl border border-soft bg-panel-soft p-3">
        <p class="text-xs text-muted">Next Cost</p>
        <p class="text-lg font-semibold">{{ formatNumber(nextCost) }}</p>
      </div>
    </div>

    <button class="btn-primary mt-4 w-full" :disabled="loading || !canAfford" @click="$emit('upgrade')" type="button">
      Upgrade Luck Engine
    </button>
  </section>
</template>

<script setup>
defineProps({
  luckLevel: { type: Number, required: true },
  nextCost: { type: Number, required: true },
  canAfford: { type: Boolean, required: true },
  loading: { type: Boolean, default: false },
})

defineEmits(['upgrade'])

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}
</script>
