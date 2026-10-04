<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import type { Movie } from '@letterbookxd/shared-types'

const route = useRoute()
const movie = ref<Movie | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const backdropUrl = computed(() => {
  if (movie.value?.backdropPath) {
    return `https://image.tmdb.org/t/p/w1280${movie.value.backdropPath}`
  }
  return null
})

const posterUrl = computed(() => {
  if (movie.value?.posterPath) {
    return `https://image.tmdb.org/t/p/w342${movie.value.posterPath}`
  }
  return '/placeholder-movie.svg'
})

async function fetchMovie() {
  try {
    const res = await fetch(`/api/movies/${route.params.id}`)
    if (!res.ok) throw new Error('Filme não encontrado')
    const data = await res.json()
    movie.value = data.data
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMovie()
})
</script>

<template>
  <div v-if="loading" class="animate-pulse space-y-8">
    <div class="aspect-video bg-gray-200 dark:bg-gray-700 rounded-2xl" />
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="md:col-span-1 h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      <div class="md:col-span-2 space-y-4">
        <div class="h-8 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
        <div class="h-6 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
        <div class="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  </div>

  <div v-else-if="error" class="text-center py-16">
    <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
    <h2 class="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">{{ error }}</h2>
  </div>

  <div v-else-if="movie" class="space-y-8 animate-fade-in">
    <div class="relative aspect-video rounded-2xl overflow-hidden">
      <img
        v-if="backdropUrl"
        :src="backdropUrl"
        :alt="movie.title"
        class="w-full h-full object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div class="absolute bottom-0 left-0 right-0 p-6 md:p-8">
        <div class="max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
          <img
            :src="posterUrl"
            :alt="movie.title"
            class="w-48 h-72 md:w-56 md:h-84 object-cover rounded-lg shadow-2xl flex-shrink-0"
          />
          <div class="flex-1 text-white">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span v-for="genre in movie.genres" :key="genre.id" class="px-2 py-1 bg-white/20 backdrop-blur rounded-full text-sm">
                {{ genre.name }}
              </span>
            </div>
            <h1 class="text-3xl md:text-4xl font-bold mb-2">{{ movie.title }}</h1>
            <p class="text-gray-300 mb-4">{{ movie.originalTitle !== movie.title ? movie.originalTitle : '' }}</p>
            <div class="flex flex-wrap items-center gap-4 text-sm text-gray-300">
              <span>{{ new Date(movie.releaseDate).getFullYear() }}</span>
              <span>•</span>
              <span>{{ Math.floor(movie.runtime / 60 }}h {{ movie.runtime % 60 }}min</span>
              <span>•</span>
              <span class="flex items-center gap-1">
                <svg class="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {{ (movie.voteAverage / 2).toFixed(1) }}/5 ({{ movie.voteCount }} votos)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="md:col-span-2 space-y-8">
        <section>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Sinopse</h2>
          <p class="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{{ movie.overview }}</p>
        </section>

        <section>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Elenco e Equipe</h2>
          <p class="text-gray-600 dark:text-gray-400">Dados de elenco serão carregados da API do TMDB.</p>
        </section>

        <section>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Reviews</h2>
          <p class="text-gray-600 dark:text-gray-400">Reviews dos usuários aparecerão aqui.</p>
        </section>
      </div>

      <aside class="space-y-6">
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Informações</h3>
          <dl class="space-y-3 text-sm">
            <div class="flex justify-between">
              <dt class="text-gray-600 dark:text-gray-400">Lançamento</dt>
              <dd class="font-medium text-gray-900 dark:text-gray-100">{{ new Date(movie.releaseDate).toLocaleDateString('pt-BR') }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-600 dark:text-gray-400">Duração</dt>
              <dd class="font-medium text-gray-900 dark:text-gray-100">{{ Math.floor(movie.runtime / 60 }}h {{ movie.runtime % 60 }}min</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-600 dark:text-gray-400">Avaliação TMDB</dt>
              <dd class="font-medium text-gray-900 dark:text-gray-100">{{ movie.voteAverage }}/10</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-600 dark:text-gray-400">Popularidade</dt>
              <dd class="font-medium text-gray-900 dark:text-gray-100">{{ movie.popularity.toFixed(1) }}</dd>
            </div>
          </dl>
        </div>

        <div class="card p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Ações</h3>
          <div class="space-y-2">
            <button class="btn-primary w-full">Quero Assistir</button>
            <button class="btn-secondary w-full">Já Assistir</button>
            <button class="btn-outline w-full">Escrever Review</button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>