<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MovieCard from '@/components/movie/MovieCard.vue'
import type { Movie } from '@letterbookxd/shared-types'

const router = useRouter()
const popularMovies = ref<Movie[]>([])
const recentReviews = ref<any[]>([])
const loading = ref(true)

async function fetchData() {
  try {
    const [moviesRes] = await Promise.all([
      fetch('/api/movies?sortBy=popularity.desc&limit=10').then(r => r.json()),
    ])
    popularMovies.value = moviesRes.data || []
  } catch (error) {
    console.error('Erro ao carregar dados:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="space-y-12 animate-fade-in">
    <section class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-8 md:p-16 text-white">
      <div class="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      <div class="relative max-w-3xl">
        <h1 class="text-4xl md:text-6xl font-bold tracking-tight">
          Descubra, avalie e compartilhe
          <span class="block text-primary-200">seus filmes favoritos</span>
        </h1>
        <p class="mt-6 text-lg md:text-xl text-primary-100 max-w-2xl">
          Sua rede social para cinéfilos. Crie listas, escreva críticas, siga amigos
          e descubra seu próximo filme favorito.
        </p>
        <div class="mt-8 flex flex-wrap gap-4">
          <router-link to="/filmes" class="btn bg-white text-primary-700 hover:bg-gray-100 text-lg px-8 py-3">
            Explorar Filmes
          </router-link>
          <router-link to="/cadastro" class="btn border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-3">
            Criar Conta Grátis
          </router-link>
        </div>
      </div>
      <div class="absolute bottom-0 right-0 hidden lg:block opacity-20">
        <svg width="400" height="400" viewBox="0 0 400 400" fill="none">
          <circle cx="200" cy="200" r="180" stroke="currentColor" stroke-width="1" />
          <circle cx="200" cy="200" r="120" stroke="currentColor" stroke-width="1" />
          <circle cx="200" cy="200" r="60" stroke="currentColor" stroke-width="1" />
        </svg>
      </div>
    </section>

    <section>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Populares esta semana</h2>
        <router-link to="/filmes" class="link text-sm font-medium">Ver todos</router-link>
      </div>
      <div v-if="loading" class="grid grid-cols-2 gap-4 md:grid-cols-5 xl:grid-cols-6">
        <div v-for="i in 6" :key="i" class="card animate-pulse aspect-[2/3] bg-gray-200 dark:bg-gray-700" />
      </div>
      <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-5 xl:grid-cols-6">
        <MovieCard
          v-for="movie in popularMovies"
          :key="movie.id"
          :movie="movie"
        />
      </div>
    </section>

    <section class="bg-white dark:bg-gray-800 rounded-2xl p-8">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Como funciona</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="text-center p-4">
          <div class="mx-auto w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-3xl mb-4">🎬</div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Descubra</h3>
          <p class="text-gray-600 dark:text-gray-400">Explore milhares de filmes com filtros avançados por gênero, ano, avaliação e mais.</p>
        </div>
        <div class="text-center p-4">
          <div class="mx-auto w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-3xl mb-4">⭐</div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Avalie</h3>
          <p class="text-gray-600 dark:text-gray-400">Dê notas de 0.5 a 5 estrelas, escreva reviews detalhadas e marque spoilers.</p>
        </div>
        <div class="text-center p-4">
          <div class="mx-auto w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-3xl mb-4">👥</div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Compartilhe</h3>
          <p class="text-gray-600 dark:text-gray-400">Siga amigos, veja o que eles assistiram, comente e curta reviews.</p>
        </div>
      </div>
    </section>

    <section class="text-center">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Pronto para começar?</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
        Junte-se a milhares de cinéfilos e comece a construir seu diário de filmes hoje.
      </p>
      <router-link to="/cadastro" class="btn-primary text-lg px-10 py-3 inline-block">
        Criar minha conta
      </router-link>
    </section>
  </div>
</template>