<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Header from '@/components/layout/Header.vue'
import Footer from '@/components/layout/Footer.vue'

const authStore = useAuthStore()
authStore.initAuth()
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <Header />
    <main class="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
      <RouterView />
    </main>
    <Footer />
  </div>
</template>