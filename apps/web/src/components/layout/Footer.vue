<script setup lang="ts">
const currentYear = new Date().getFullYear()

const footerLinks = {
  produto: [
    { label: 'Filmes', to: { name: 'movies' } },
    { label: 'Populares', to: { name: 'movies', query: { sort: 'popularity.desc' } } },
    { label: 'Lançamentos', to: { name: 'movies', query: { sort: 'release_date.desc' } } },
    { label: 'Melhores Avaliados', to: { name: 'movies', query: { sort: 'vote_average.desc' } } },
  ],
  empresa: [
    { label: 'Sobre', to: '#' },
    { label: 'Blog', to: '#' },
    { label: 'Carreiras', to: '#' },
    { label: 'Imprensa', to: '#' },
  ],
  legal: [
    { label: 'Privacidade', to: '#' },
    { label: 'Termos', to: '#' },
    { label: 'Cookies', to: '#' },
    { label: 'DMCA', to: '#' },
  ],
  social: [
    { label: 'GitHub', href: 'https://github.com/Mankeya/LetterBookXD', external: true },
    { label: 'Twitter', href: '#', external: true },
    { label: 'Discord', href: '#', external: true },
  ],
}
</script>

<template>
  <footer class="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
    <div class="mx-auto max-w-7xl px-4 py-12 lg:py-16">
      <div class="grid grid-cols-2 gap-8 md:grid-cols-5">
        <div class="col-span-2">
          <a href="/" class="text-xl font-bold text-primary-600 dark:text-primary-400">
            LetterBookXD
          </a>
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs">
            Sua rede social para descobrir, avaliar e compartilhar filmes.
            Inspirado no Letterboxd, construído com tecnologias modernas.
          </p>
          <div class="mt-6 flex gap-4">
            <a
              v-for="social in footerLinks.social"
              :key="social.label"
              :href="social.href"
              :target="social.external ? '_blank' : undefined"
              :rel="social.external ? 'noopener noreferrer' : undefined"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="social.label"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Produto</h3>
          <ul class="mt-4 space-y-3">
            <li v-for="link in footerLinks.produto" :key="link.label">
              <router-link :to="link.to" class="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors">
                {{ link.label }}
              </router-link>
            </li>
          </ul>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Empresa</h3>
          <ul class="mt-4 space-y-3">
            <li v-for="link in footerLinks.empresa" :key="link.label">
              <a :href="link.to" class="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors">
                {{ link.label }}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Legal</h3>
          <ul class="mt-4 space-y-3">
            <li v-for="link in footerLinks.legal" :key="link.label">
              <a :href="link.to" class="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors">
                {{ link.label }}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div class="mt-12 border-t border-gray-200 dark:border-gray-800 pt-8">
        <p class="text-sm text-gray-500 dark:text-gray-400 text-center">
          &copy; {{ currentYear }} LetterBookXD. Todos os direitos reservados.
          <br />
          Dados de filmes fornecidos por
          <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" class="link">
            TMDB
          </a>
        </p>
      </div>
    </div>
  </footer>
</template>