<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MovieCard from '@/components/movie/MovieCard.vue'
import type { Movie, MovieFilters, Genre } from '@letterbookxd/shared-types'

const route = useRoute()
const router = useRouter()

const movies = ref<Movie[]>([])
const genres = ref<Genre[]>([])
const loading = ref(false)
const totalPages = ref(0)
const totalResults = ref(0)

const filters = ref<MovieFilters>({
  page: 1,
  limit: 20,
  sortBy: 'popularity.desc',
  genreIds: [],
  year: undefined,
  query: '',
})

const sortOptions = [
  { value: 'popularity.desc', label: 'Mais Populares' },
  { value: 'release_date.desc', label: 'Mais Recentes' },
  { value: 'release_date.asc', label: 'Mais Antigos' },
  { value: 'vote_average.desc', label: 'Melhor Avaliados' },
  { value: 'vote_average.asc', label: 'Pior Avaliados' },
  { value: 'title.asc', label: 'A-Z' },
  { value: 'title.desc', label: 'Z-A' },
]

async function fetchGenres() {
  try {
    const res = await fetch('/api/genres')
    const data = await res.json()
    genres.value = data.data || []
  } catch (error) {
    console.error('Erro ao buscar gêneros:', error)
  }
}

async function fetchMovies() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    Object.entries(filters.value).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, String(v)))
        } else {
          params.set(key, String(value))
        }
      }
    })

    const res = await fetch(`/api/movies?${params.toString()}`)
    const data = await res.json()

    movies.value = data.data || []
    totalPages.value = data.meta?.totalPages || 0
    totalResults.value = data.meta?.total || 0
  } catch (error) {
    console.error('Erro ao buscar filmes:', error)
  } finally {
    loading.value = false
  }
}

function updateFilters(newFilters: Partial<MovieFilters>) {
  filters.value = { ...filters.value, ...newFilters, page: 1 }
}

function handlePageChange(page: number) {
  filters.value = { ...filters.value, page }
  router.push({ query: { ...route.query, page: String(page) } })
}

function handleSortChange(sortBy: string) {
  updateFilters({ sortBy })
}

function handleGenreToggle(genreId: number) {
  const ids = [...filters.value.genreIds]
  const index = ids.indexOf(genreId)
  if (index > -1) {
    ids.splice(index, 1)
  } else {
    ids.push(genreId)
  }
  updateFilters({ genreIds: ids })
}

function clearFilters() {
  filters.value = {
    page: 1,
    limit: 20,
    sortBy: 'popularity.desc',
    genreIds: [],
    year: undefined,
    query: '',
  }
}

watch(() => route.query, () => {
  const query = route.query
  filters.value = {
    page: Number(query.page) || 1,
    limit: 20,
    sortBy: (query.sortBy as MovieFilters['sortBy']) || 'popularity.desc',
    genreIds: query.genreIds ? (Array.isArray(query.genreIds) ? query.genreIds.map(Number) : [Number(query.genreIds)]) : [],
    year: query.year ? Number(query.year) : undefined,
    query: query.q as string || '',
  }
}, { immediate: true })

watch(filters, () => {
  const query: Record<string, any> = {}
  if (filters.value.page > 1) query.page = filters.value.page
  if (filters.value.sortBy !== 'popularity.desc') query.sortBy = filters.value.sortBy
  if (filters.value.genreIds.length > 0) query.genreIds = filters.value.genreIds
  if (filters.value.year) query.year = filters.value.year
  if (filters.value.query) query.q = filters.value.query

  router.replace({ query })
  fetchMovies()
}, { deep: true })

onMounted(() => {
  fetchGenres()
})
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Filmes</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          {{ totalResults }} filmes encontrados
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <select
          v-model="filters.sortBy"
          @change="handleSortChange(filters.sortBy)"
          class="input w-auto"
        >
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <button
          @click="clearFilters"
          v-if="filters.genreIds.length > 0 || filters.year || filters.query"
          class="btn-secondary text-sm"
        >
          Limpar filtros
        </button>
      </div>
    </div>

    <div class="card p-4">
      <div class="flex flex-wrap gap-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Gêneros:</label>
        <button
          v-for="genre in genres"
          :key="genre.id"
          @click="handleGenreToggle(genre.id)"
          :class="[
            'px-3 py-1 rounded-full text-sm transition-colors',
            filters.genreIds.includes(genre.id)
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          ]"
        >
          {{ genre.name }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
      <div v-for="i in 12" :key="i" class="card animate-pulse aspect-[2/3] bg-gray-200 dark:bg-gray-700" />
    </div>

    <div v-else-if="movies.length === 0" class="text-center py-16">
      <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">Nenhum filme encontrado</h3>
      <p class="mt-2 text-gray-600 dark:text-gray-400">Tente ajustar seus filtros ou buscar por outro termo.</p>
    </div>

    <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
      <MovieCard
        v-for="movie in movies"
        :key="movie.id"
        :movie="movie"
      />
    </div>

    <div v-if="totalPages > 1 && !loading" class="flex items-center justify-center gap-2">
      <button
        @click="handlePageChange(filters.page - 1)"
        :disabled="filters.page <= 1"
        class="btn-secondary"
      >
        Anterior
      </button>
      <span class="text-sm text-gray-600 dark:text-gray-400">
        Página {{ filters.page }} de {{ totalPages }}
      </span>
      <button
        @click="handlePageChange(filters.page + 1)"
        :disabled="filters.page >= totalPages"
        class="btn-secondary"
      >
        Próxima
      </button>
    </div>
  </div>
</template>