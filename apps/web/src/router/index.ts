import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: 'Início' },
  },
  {
    path: '/filmes',
    name: 'movies',
    component: () => import('@/views/MoviesView.vue'),
    meta: { title: 'Filmes' },
  },
  {
    path: '/filmes/:id',
    name: 'movie-detail',
    component: () => import('@/views/MovieDetailView.vue'),
    meta: { title: 'Detalhes do Filme' },
    props: true,
  },
  {
    path: '/perfil/:username',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: 'Perfil' },
    props: true,
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { title: 'Entrar', guest: true },
  },
  {
    path: '/cadastro',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { title: 'Cadastrar', guest: true },
  },
  {
    path: '/configuracoes',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: 'Configurações', requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Não Encontrado' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  document.title = `${to.meta.title as string} | LetterBookXD`

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.guest && authStore.isAuthenticated) {
    next({ name: 'home' })
    return
  }

  next()
})

export default router