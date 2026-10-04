<script setup lang="ts>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  username: '',
  email: '',
  displayName: '',
  password: '',
  confirmPassword: '',
})
const loading = ref(false)
const error = ref<string | null>(null)

async function handleSubmit(e: Event) {
  e.preventDefault()
  error.value = null

  if (form.value.password !== form.value.confirmPassword) {
    error.value = 'As senhas não coincidem'
    return
  }

  if (form.value.password.length < 8) {
    error.value = 'A senha deve ter pelo menos 8 caracteres'
    return
  }

  loading.value = true

  try {
    await authStore.register({
      username: form.value.username,
      email: form.value.email,
      displayName: form.value.displayName,
      password: form.value.password,
    })
    router.push('/')
  } catch {
    error.value = 'Erro ao criar conta. Tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Criar Conta</h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        Junte-se à comunidade de cinéfilos do LetterBookXD
      </p>
    </div>

    <form @submit="handleSubmit" class="card p-6 space-y-5" novalidate>
      <div v-if="error" class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
        {{ error }}
      </div>

      <div>
        <label for="displayName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nome de exibição
        </label>
        <input
          id="displayName"
          v-model="form.displayName"
          type="text"
          required
          autocomplete="name"
          class="input"
          placeholder="Seu Nome"
        />
      </div>

      <div>
        <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nome de usuário
        </label>
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
          <input
            id="username"
            v-model="form.username"
            type="text"
            required
            autocomplete="username"
            class="input pl-8"
            placeholder="usuario"
            minlength="3"
            maxlength="30"
            pattern="^[a-zA-Z0-9_]+$"
          />
        </div>
        <p class="mt-1 text-xs text-gray-500">Apenas letras, números e underscore. 3-30 caracteres.</p>
      </div>

      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email
        </label>
        <input
          id="email"
          v-model="form.email"
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
          v-model="form.password"
          type="password"
          required
          autocomplete="new-password"
          class="input"
          placeholder="••••••••"
          minlength="8"
        />
        <p class="mt-1 text-xs text-gray-500">Mínimo 8 caracteres.</p>
      </div>

      <div>
        <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Confirmar senha
        </label>
        <input
          id="confirmPassword"
          v-model="form.confirmPassword"
          type="password"
          required
          autocomplete="new-password"
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
          Criando conta...
        </span>
        <span v-else>Criar conta</span>
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
      Já tem conta?
      <router-link to="/login" class="link font-medium">Faça login</router-link>
    </p>
  </div>
</template>