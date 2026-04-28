import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8900/api',
  timeout: 10000,
})

// 요청 인터셉터 — access token 첨부
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 응답 인터셉터 — 401 시 refresh 후 재시도
let isRefreshing = false
let pendingQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(token: string | null, error: unknown = null) {
  pendingQueue.forEach(({ resolve, reject }) => (token ? resolve(token) : reject(error)))
  pendingQueue = []
}

http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err)
    }

    const storedRefresh = localStorage.getItem('refresh_token')
    if (!storedRefresh) {
      goLogin()
      return Promise.reject(err)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(http(original))
          },
          reject,
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const res = await axios.post(
        `${http.defaults.baseURL}/admin/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${storedRefresh}` } },
      )
      const { accessToken, refreshToken } = res.data
      const auth = useAuthStore()
      auth.setTokens(accessToken, refreshToken)

      processQueue(accessToken)
      original.headers.Authorization = `Bearer ${accessToken}`
      return http(original)
    } catch (refreshErr) {
      processQueue(null, refreshErr)
      goLogin()
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)

function goLogin() {
  useAuthStore().logout()
  window.location.href = '/login'
}

export default {
  adminLogin(body: { email: string; password: string }) {
    return http.post<{ accessToken: string; refreshToken: string }>('/admin/auth/login', body)
  },
  adminRefresh() {
    return http.post<{ accessToken: string; refreshToken: string }>('/admin/auth/refresh')
  },
  adminLogout() {
    return http.post('/admin/auth/logout')
  },
  getDashboard() {
    return http.get('/admin/dashboard')
  },
  getServices() {
    return http.get('/admin/users/services')
  },
  getUsers(filter?: 'admin' | 'user') {
    return http.get('/admin/users', { params: filter ? { filter } : undefined })
  },
  getUser(id: number) {
    return http.get(`/admin/users/${id}`)
  },
  createUser(body: { email: string; password: string; name?: string; phone?: string; roles?: string[]; serviceIds?: number[] }) {
    return http.post('/admin/users', body)
  },
  updateUser(id: number, body: { name?: string; phone?: string; password?: string }) {
    return http.patch(`/admin/users/${id}`, body)
  },
  updateUserRoles(id: number, roles: string[]) {
    return http.put(`/admin/users/${id}/roles`, { roles })
  },
  updateServiceAccess(userId: number, serviceId: number, status: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return http.patch(`/admin/users/${userId}/services/${serviceId}`, { status })
  },
  deleteUser(id: number) {
    return http.delete(`/admin/users/${id}`)
  },
}
