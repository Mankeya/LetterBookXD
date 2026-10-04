<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { User } from '@letterbookxd/shared-types'

const route = useRoute()
const profile = ref<User | null>(null)
const loading = ref(true)
const tabs = ['activity', 'reviews', 'watchlist', 'followers', 'following']
const activeTab = ref('activity')

async function fetchProfile() {
  try {
    const res = await fetch(`/api/users/${route.params.username}`)
    if (!res.ok) throw new Error('Usuário não encontrado')
    const data = await res.json()
    profile.value = data.data
  } catch (err: any) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchProfile()
})
</script>

<template>
  <div v-if="loading" class="animate-pulse space-y-8">
    <div class="flex gap-6">
      <div class="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div class="flex-1 space-y-4">
        <div class="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div class="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
    <div class="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
  </div>

  <div v-else-if="profile" class="space-y-8 animate-fade-in">
    <div class="card p-6">
      <div class="flex flex-col md:flex-row gap-6">
        <img
          v-if="profile.avatarUrl"
          :src="profile.avatarUrl"
          :alt="profile.displayName"
          class="h-24 w-24 rounded-full object-cover"
        />
        <div v-else class="h-24 w-24 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
          <span class="text-3xl font-bold text-primary-700 dark:text-primary-300">
            {{ profile.displayName.charAt(0).toUpperCase() }}
          </span>
        </div>
        <div class="flex-1">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ profile.displayName }}</h1>
          <p class="text-gray-600 dark:text-gray-400">@{{ profile.username }}</p>
          <p v-if="profile.bio" class="mt-4 text-gray-700 dark:text-gray-300">{{ profile.bio }}</p>
          <div class="mt-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>{{ profile.stats?.moviesWatched || 0 }} filmes assistidos</span>
            <span>{{ profile.stats?.reviewsWritten || 0 }} reviews</span>
            <span>{{ profile.stats?.followersCount || 0 }} seguidores</span>
            <span>{{ profile.stats?.followingCount || 0 }} seguindo</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <nav class="border-b border-gray-200 dark:border-gray-700" aria-label="Abas do perfil">
        <ul class="flex flex-wrap -mb-px">
          <li v-for="tab in tabs" :key="tab">
            <button
              @click="activeTab = tab"
              :class="[
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              ]"
              role="tab"
              :aria-selected="activeTab === tab"
            >
              {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
            </button>
          </li>
        </ul>
      </nav>
      <div class="p-6">
        <p class="text-gray-600 dark:text-gray-400 text-center py-8">
          Conteúdo da aba "{{ activeTab }}" será implementado.
        </p>
      </div>
    </div>
  </div>
</template>