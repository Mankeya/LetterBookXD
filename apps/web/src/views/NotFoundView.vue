<script setup lang="ts>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="min-h-[60vh] flex items-center justify-center text-center px-4">
    <div class="max-w-md">
      <h1 class="text-9xl font-bold text-primary-600 dark:text-primary-400 leading-none">404</h1>
      <h2 class="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">Página não encontrada</h2>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        Desculpe, não conseguimos encontrar a página que você procura.
        Ela pode ter sido movida ou não existir.
      </p>
      <div class="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <button @click="router.push('/')" class="btn-primary">
          Voltar ao início
        </button>
        <button @click="router.back()" class="btn-secondary">
          Página anterior
        </button>
      </div>
    </div>
  </div>
</template>