<script setup lang="ts>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const activeTab = ref('profile')
const tabs = ['profile', 'account', 'notifications', 'privacy']

const form = ref({
  displayName: authStore.user?.displayName || '',
  bio: authStore.user?.bio || '',
  email: authStore.user?.email || '',
})

async function saveProfile() {
  try {
    await authStore.updateProfile({
      displayName: form.value.displayName,
      bio: form.value.bio,
    })
  } catch (error) {
    console.error(error)
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-8 animate-fade-in">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Configurações</h1>

    <div class="card">
      <nav class="border-b border-gray-200 dark:border-gray-700" aria-label="Abas de configurações">
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
        <div v-if="activeTab === 'profile'" class="space-y-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Perfil</h2>
          <form @submit.prevent="saveProfile" class="space-y-6">
            <div>
              <label for="displayName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome de exibição
              </label>
              <input
                id="displayName"
                v-model="form.displayName"
                type="text"
                class="input"
                maxlength="50"
              />
            </div>

            <div>
              <label for="bio" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bio
              </label>
              <textarea
                id="bio"
                v-model="form.bio"
                rows="4"
                class="input"
                maxlength="500"
                placeholder="Conte um pouco sobre você..."
              ></textarea>
              <p class="mt-1 text-sm text-gray-500">{{ form.bio.length }}/500</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Avatar
              </label>
              <div class="flex items-center gap-4">
                <img
                  v-if="authStore.user?.avatarUrl"
                  :src="authStore.user.avatarUrl"
                  alt="Avatar atual"
                  class="h-16 w-16 rounded-full object-cover"
                />
                <button type="button" class="btn-secondary">Alterar avatar</button>
              </div>
            </div>

            <button type="submit" class="btn-primary">Salvar alterações</button>
          </form>
        </div>

        <div v-else class="space-y-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {{ activeTab.charAt(0).toUpperCase() + activeTab.slice(1) }}
          </h2>
          <p class="text-gray-600 dark:text-gray-400">
            Configurações de {{ activeTab }} serão implementadas.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>