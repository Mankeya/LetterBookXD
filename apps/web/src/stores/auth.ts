import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import type { User, LoginCredentials, RegisterData } from '@letterbookxd/shared-types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isLoading = computed(() => loading.value)
  const authError = computed(() => error.value)

  async function initAuth() {
    const savedToken = localStorage.getItem('token')
    if (savedToken) {
      token.value = savedToken
      api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
      try {
        await fetchUser()
      } catch {
        logout()
      }
    }
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      const response = await api.get('/auth/me')
      user.value = response.data
    } catch (err) {
      throw err
    }
  }

  async function login(credentials: LoginCredentials) {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/auth/login', credentials)
      token.value = response.data.token
      user.value = response.data.user
      localStorage.setItem('token', token.value)
      api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Erro ao fazer login'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function register(data: RegisterData) {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/auth/register', data)
      token.value = response.data.token
      user.value = response.data.user
      localStorage.setItem('token', token.value)
      api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Erro ao cadastrar'
      throw err
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
  }

  async function updateProfile(data: Partial<User>) {
    loading.value = true
    try {
      const response = await api.patch('/auth/me', data)
      user.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Erro ao atualizar perfil'
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    isLoading,
    authError,
    initAuth,
    login,
    register,
    logout,
    updateProfile,
    clearError,
    fetchUser,
  }
})