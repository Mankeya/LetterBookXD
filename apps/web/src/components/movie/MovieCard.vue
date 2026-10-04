<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Movie } from '@letterbookxd/shared-types'

const props = defineProps<{
  movie: Movie
  variant?: 'default' | 'compact'
}>()

const router = useRouter()

const posterUrl = computed(() => {
  if (props.movie.posterPath) {
    return `https://image.tmdb.org/t/p/w342${props.movie.posterPath}`
  }
  return '/placeholder-movie.svg'
})

const year = computed(() => {
  return props.movie.releaseDate ? new Date(props.movie.releaseDate).getFullYear() : '—'
})

const rating = computed(() => {
  return props.movie.voteAverage ? (props.movie.voteAverage / 2).toFixed(1) : '—'
})

function navigate() {
  router.push({ name: 'movie-detail', params: { id: props.movie.id } })
}
</script>

<template>
  <article
    :class="['card group cursor-pointer', { 'aspect-[2/3]': variant === 'default' }]"
    @click="navigate"
    @keydown.enter="navigate"
    tabindex="0"
    role="button"
    :aria-label="`Ver detalhes de ${movie.title}`"
  >
    <div class="relative overflow-hidden">
      <img
        :src="posterUrl"
        :alt="movie.title"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div v-if="movie.userRating" class="absolute top-2 right-2 z-10">
        <span class="bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded">
          {{ movie.userRating }}/5
        </span>
      </div>
    </div>
    <div class="p-3">
      <h3 class="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
        {{ movie.title }}
      </h3>
      <div class="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
        <span>{{ year }}</span>
        <span aria-hidden="true">•</span>
        <span class="flex items-center gap-1">
          <svg class="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {{ rating }}
        </span>
      </div>
    </div>
  </article>
</template>