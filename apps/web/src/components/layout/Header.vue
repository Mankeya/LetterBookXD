<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ref } from 'vue'

const router = useRouter()
const authStore = useAuthStore()
const mobileMenuOpen = ref(false)
const userMenuOpen = ref(false)

const logout = () => {
  authStore.logout()
  router.push({ name: 'home' })
  userMenuOpen.value = false
}

const navLinks = [
  { name: 'home', label: 'Início', icon: '🏠' },
  { name: 'movies', label: 'Filmes', icon: '🎬' },
]
</script>

<template>
  <header class="sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
    <nav class="mx-auto max-w-7xl px-4" aria-label="Navegação principal">
      <div class="flex h-16 items-center justify-between">
        <div class="flex items-center gap-8">
          <router-link to="/" class="text-xl font-bold text-primary-600 dark:text-primary-400" aria-label="LetterBookXD - Início">
            LetterBookXD
          </router-link>

          <div class="hidden md:flex md:gap-6">
            <router-link
              v-for="link in navLinks"
              :key="link.name"
              :to="{ name: link.name }"
              class="text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 transition-colors"
            >
              {{ link.label }}
            </router-link>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="hidden md:flex md:items-center md:gap-4">
            <router-link
              v-if="!authStore.isAuthenticated"
              to="/login"
              class="btn-ghost text-sm"
            >
              Entrar
            </router-link>
            <router-link
              v-if="!authStore.isAuthenticated"
              to="/register"
              class="btn-primary text-sm"
            >
              Cadastrar
            </router-link>

            <div v-else class="relative">
              <button
                @click="userMenuOpen = !userMenuOpen"
                class="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-expanded="false"
                aria-haspopup="true"
              >
                <img
                  v-if="authStore.user?.avatarUrl"
                  :src="authStore.user.avatarUrl"
                  :alt="authStore.user.displayName"
                  class="h-8 w-8 rounded-full"
                />
                <div v-else class="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  <span class="text-sm font-medium text-primary-700 dark:text-primary-300">
                    {{ authStore.user?.displayName?.charAt(0).toUpperCase() }}
                  </span>
                </div>
              </button>

              <div
                v-if="userMenuOpen"
                class="absolute right-0 mt-2 w-48 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 py-1 animate-scale-in"
              >
                <div class="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ authStore.user?.displayName }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">@{{ authStore.user?.username }}</p>
                </div>
                <router-link to="/configuracoes" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Configurações</router-link>
                <button @click="logout" class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700">Sair</button>
              </div>
            </div>
          </div>

          <button
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="md:hidden p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Abrir menu"
            aria-expanded="false"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <div
        v-if="mobileMenuOpen"
        class="md:hidden py-4 border-t border-gray-200 dark:border-gray-700 animate-slide-down"
      >
        <div class="flex flex-col gap-2">
          <router-link
            v-for="link in navLinks"
            :key="link.name"
            :to="{ name: link.name }"
            @click="mobileMenuOpen = false"
            class="px-2 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400"
          >
            {{ link.label }}
          </router-link>
          <div class="pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
            <router-link
              v-if="!authStore.isAuthenticated"
              to="/login"
              @click="mobileMenuOpen = false"
              class="btn-ghost text-sm"
            >
              Entrar
            </router-link>
            <router-link
              v-if="!authStore.isAuthenticated"
              to="/register"
              @click="mobileMenuOpen = false"
              class="btn-primary text-sm"
            >
              Cadastrar
            </router-link>
            <button
              v-else
              @click="logout"
              class="btn-secondary text-sm"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>
  </header>
</template>