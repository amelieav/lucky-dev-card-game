<script setup>
import AppNav from './components/AppNav.vue'
</script>

<template>
  <div class="min-h-screen bg-main text-main">
    <div class="bg-orb bg-orb-a"></div>
    <div class="bg-orb bg-orb-b"></div>
    <app-nav />
    <main class="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <router-view />
    </main>
  </div>
</template>
