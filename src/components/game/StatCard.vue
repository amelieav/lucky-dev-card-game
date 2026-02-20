<template>
  <div class="card p-4">
    <p class="text-xs uppercase tracking-wide text-muted">{{ label }}</p>
    <p class="mt-2 text-2xl font-semibold text-main">{{ value }}</p>
    <p v-if="hint" class="mt-1 text-xs text-muted">{{ hint }}</p>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' },
})
</script>
