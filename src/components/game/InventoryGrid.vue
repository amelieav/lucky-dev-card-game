<template>
  <section class="card p-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold">Inventory</h2>
      <p class="text-xs text-muted">Duplicates increase term levels and collection depth.</p>
    </div>

    <div v-if="items.length === 0" class="rounded-xl border border-dashed border-soft p-6 text-sm text-muted">
      No cards yet. Open your first pack.
    </div>

    <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="item in items"
        :key="item.termKey"
        class="rounded-xl border border-soft bg-white p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <h3 class="text-sm font-semibold">{{ item.name }}</h3>
          <span class="rounded-full px-2 py-0.5 text-xs text-white" :style="{ background: item.rarityColor }">{{ item.rarity }}</span>
        </div>

        <p class="mt-1 text-xs text-muted">Tier {{ item.tier }}</p>
        <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <p class="text-xs text-muted">Copies</p>
            <p class="font-medium">{{ item.copies }}</p>
          </div>
          <div>
            <p class="text-xs text-muted">Level</p>
            <p class="font-medium">Lv {{ item.level }}</p>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
defineProps({
  items: { type: Array, required: true },
})
</script>
