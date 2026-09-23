import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('access_token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refresh_token'))
  const roles = ref<string[]>([])

  const isLoggedIn = computed(() => !!token.value)
  // GUEST_ADMIN만 있고 ADMIN/SUPER_ADMIN이 없으면 포트폴리오용 읽기 전용 계정
  const isGuestAdmin = computed(
    () => roles.value.includes('GUEST_ADMIN') && !roles.value.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN'),
  )

  function setTokens(accessToken: string, newRefreshToken: string) {
    token.value = accessToken
    refreshToken.value = newRefreshToken
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', newRefreshToken)
  }

  function setAccessToken(accessToken: string) {
    token.value = accessToken
    localStorage.setItem('access_token', accessToken)
  }

  function setRoles(newRoles: string[]) {
    roles.value = newRoles
  }

  function logout() {
    token.value = null
    refreshToken.value = null
    roles.value = []
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  return { token, refreshToken, roles, isLoggedIn, isGuestAdmin, setTokens, setAccessToken, setRoles, logout }
})
