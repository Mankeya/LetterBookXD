<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

const redirect = (route.query.redirect as string) || '/'

async function handleSubmit(e: Event) {
  e.preventDefault()
  error.value = null
  loading.value = true

  try {
    await authStore.login({ email: email.value, password: password.value })
    router.push(redirect)
  } catch {
    error.value = 'Email ou senha inválidos'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Entrar</h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        Bem-vindo de volta! Faça login para continuar.
      </p>
    </div>

    <form @submit="handleSubmit" class="card p-6 space-y-6" novalidate>
      <div v-if="error" class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
        {{ error }}
      </div>

      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="input"
          placeholder="seu@email.com"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Senha
        </label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="input"
          placeholder="••••••••"
        />
      </div>

      <button type="submit" :disabled="loading" class="btn-primary w-full py-3">
        <span v-if="loading" class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Entrando...
        </span>
        <span v-else>Entrar</span>
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
      Não tem conta?
      <router-link to="/cadastro" class="link font-medium">Cadastre-se</router-link>
    </p>
  </div>
</template>