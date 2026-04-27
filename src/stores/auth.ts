import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('access_token'))

  const isLoggedIn = computed(() => !!token.value)

  function setToken(accessToken: string) {
    token.value = accessToken
    localStorage.setItem('access_token', accessToken)
  }

  function logout() {
    token.value = null
    localStorage.removeItem('access_token')
  }

  return { token, isLoggedIn, setToken, logout }
})
