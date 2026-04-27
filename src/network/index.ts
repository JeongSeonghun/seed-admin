import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8900/api',
  timeout: 10000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default {
  adminLogin(body: { email: string; password: string }) {
    return http.post<{ accessToken: string }>('/admin/auth/login', body)
  },
  getDashboard() {
    return http.get('/admin/dashboard')
  },
  getUsers() {
    return http.get('/admin/users')
  },
  getUser(id: number) {
    return http.get(`/admin/users/${id}`)
  },
  createUser(body: { email: string; password: string; name?: string; phone?: string; roles?: string[] }) {
    return http.post('/admin/users', body)
  },
  updateUser(id: number, body: { name?: string; phone?: string; password?: string }) {
    return http.patch(`/admin/users/${id}`, body)
  },
  deleteUser(id: number) {
    return http.delete(`/admin/users/${id}`)
  },
}
