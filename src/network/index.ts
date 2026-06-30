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
  getMe() {
    return http.get('/admin/auth/me')
  },
  updateMe(body: { name?: string; phone?: string }) {
    return http.patch('/admin/auth/me', body)
  },
  changeMyPassword(currentPassword: string, newPassword: string) {
    return http.patch('/admin/auth/me/password', { currentPassword, newPassword })
  },
  getDashboard() {
    return http.get('/admin/dashboard')
  },
  getServices() {
    return http.get('/admin/services')
  },
  createService(body: { name: string; label: string }) {
    return http.post('/admin/services', body)
  },
  updateService(id: number, body: { label: string }) {
    return http.patch(`/admin/services/${id}`, body)
  },
  deleteService(id: number) {
    return http.delete(`/admin/services/${id}`)
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
  updateUser(id: number, body: { name?: string; phone?: string; password?: string; isAdultVerified?: boolean }) {
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

  // 공지사항
  getNotices() {
    return http.get('/admin/notices')
  },
  createNotice(body: { title: string; content: string; serviceTarget?: string | null; isPublished?: boolean }) {
    return http.post('/admin/notices', body)
  },
  updateNotice(id: number, body: { title?: string; content?: string; serviceTarget?: string | null; isPublished?: boolean }) {
    return http.patch(`/admin/notices/${id}`, body)
  },
  deleteNotice(id: number) {
    return http.delete(`/admin/notices/${id}`)
  },

  // 서버 모니터링
  getMonitorStatus() {
    return http.get('/admin/monitor')
  },
  createMonitorServer(body: { name: string; url: string; description?: string }) {
    return http.post('/admin/monitor/servers', body)
  },
  updateMonitorServer(id: number, body: { name?: string; url?: string; description?: string }) {
    return http.patch(`/admin/monitor/servers/${id}`, body)
  },
  deleteMonitorServer(id: number) {
    return http.delete(`/admin/monitor/servers/${id}`)
  },

  // 버전 관리
  getVersions() {
    return http.get('/admin/versions')
  },
  createVersion(body: object) {
    return http.post('/admin/versions', body)
  },
  updateVersion(id: number, body: object) {
    return http.patch(`/admin/versions/${id}`, body)
  },
  deleteVersion(id: number) {
    return http.delete(`/admin/versions/${id}`)
  },

  // 게임 - 단어
  getGameWords(level?: number) {
    return http.get('/admin/game/words', { params: level ? { level } : undefined })
  },
  createGameWord(body: object) {
    return http.post('/admin/game/words', body)
  },
  updateGameWord(id: number, body: object) {
    return http.patch(`/admin/game/words/${id}`, body)
  },
  deleteGameWord(id: number) {
    return http.delete(`/admin/game/words/${id}`)
  },
  importGameWords(file: File) {
    const form = new FormData()
    form.append('file', file)
    return http.post<{ total: number; created: number; skipped: number; errors: string[] }>(
      '/admin/game/words/import', form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  // 게임 - 스테이지
  getGameStages() {
    return http.get('/admin/game/stages')
  },
  createGameStage(body: object) {
    return http.post('/admin/game/stages', body)
  },
  updateGameStage(id: number, body: object) {
    return http.patch(`/admin/game/stages/${id}`, body)
  },
  deleteGameStage(id: number) {
    return http.delete(`/admin/game/stages/${id}`)
  },

  // 게임 - 씬 팩
  getGameScenePacks() {
    return http.get('/admin/game/scene-packs')
  },
  createGameScenePack(body: object) {
    return http.post('/admin/game/scene-packs', body)
  },
  updateGameScenePack(id: number, body: object) {
    return http.patch(`/admin/game/scene-packs/${id}`, body)
  },
  deleteGameScenePack(id: number) {
    return http.delete(`/admin/game/scene-packs/${id}`)
  },
  addScenePackImage(packId: number, body: { imageUrl: string; sortOrder: number }) {
    return http.post(`/admin/game/scene-packs/${packId}/images`, body)
  },
  removeScenePackImage(packId: number, imageId: number) {
    return http.delete(`/admin/game/scene-packs/${packId}/images/${imageId}`)
  },

  // 게임 - 번들
  getGameBundles() {
    return http.get('/admin/game/bundles')
  },
  createGameBundle(body: object) {
    return http.post('/admin/game/bundles', body)
  },
  updateGameBundle(id: number, body: object) {
    return http.patch(`/admin/game/bundles/${id}`, body)
  },
  deleteGameBundle(id: number) {
    return http.delete(`/admin/game/bundles/${id}`)
  },

  // 게임 - 캐릭터
  getGameCharacters() {
    return http.get('/admin/game/characters')
  },
  createGameCharacter(body: object) {
    return http.post('/admin/game/characters', body)
  },
  updateGameCharacter(id: number, body: object) {
    return http.patch(`/admin/game/characters/${id}`, body)
  },
  deleteGameCharacter(id: number) {
    return http.delete(`/admin/game/characters/${id}`)
  },

  // 앱 설정
  getAppConfigs() {
    return http.get<{ key: string; value: string | null; description: string | null; updatedAt: string }[]>('/admin/game/app-configs')
  },
  updateAppConfig(key: string, value: string) {
    return http.patch(`/admin/game/app-configs/${key}`, { value })
  },

  // 푸시 알림
  adminPushSend(body: { userIds: number[]; title: string; body: string; appId?: string; data?: Record<string, string> }) {
    return http.post('/admin/push/send', body)
  },
  adminPushBroadcast(body: { title: string; body: string; appId?: string; data?: Record<string, string> }) {
    return http.post('/admin/push/broadcast', body)
  },
  adminGetPushLogs(limit?: number) {
    return http.get('/admin/push/logs', { params: limit ? { limit } : undefined })
  },
  adminGetPushTokens(appId?: string) {
    return http.get('/admin/push/tokens', { params: appId ? { appId } : undefined })
  },

  // 이미지 업로드
  uploadImage(file: File) {
    const form = new FormData()
    form.append('file', file)
    return http.post<{ url: string }>('/admin/upload/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // 스마트팜 - 디바이스
  getSmartfarmDevices() {
    return http.get('/admin/smartfarm/devices')
  },
  createSmartfarmDevice(body: { name: string; location?: string }) {
    return http.post('/admin/smartfarm/devices', body)
  },

  // 스마트팜 - 센서 readings
  getSmartfarmReadings(deviceId: number, params?: { from?: string; to?: string; type?: string }) {
    return http.get(`/admin/smartfarm/devices/${deviceId}/readings`, { params })
  },
  getSmartfarmReadingsChart(
    deviceId: number,
    params: { interval?: 'hour' | 'day'; from?: string; to?: string; type?: string },
  ) {
    return http.get<{ bucket: string; type: string; avg: string; min: string; max: string; count: string }[]>(
      `/admin/smartfarm/devices/${deviceId}/readings/chart`,
      { params },
    )
  },

  // 스마트팜 - 명령
  getSmartfarmCommands(deviceId: number) {
    return http.get(`/admin/smartfarm/devices/${deviceId}/commands`)
  },
  createSmartfarmCommand(deviceId: number, body: { target: string; action: string }) {
    return http.post(`/admin/smartfarm/devices/${deviceId}/commands`, body)
  },

  // 스마트팜 - 규칙
  getSmartfarmRules(deviceId: number) {
    return http.get(`/admin/smartfarm/devices/${deviceId}/rules`)
  },
  createSmartfarmRule(deviceId: number, body: {
    name?: string; sensorType: string; operator: string
    threshold: number; target: string; action: string; cooldownMinutes?: number
  }) {
    return http.post(`/admin/smartfarm/devices/${deviceId}/rules`, body)
  },
  updateSmartfarmRule(ruleId: number, body: { name?: string; enabled?: boolean; threshold?: number; cooldownMinutes?: number }) {
    return http.patch(`/admin/smartfarm/rules/${ruleId}`, body)
  },
  deleteSmartfarmRule(ruleId: number) {
    return http.delete(`/admin/smartfarm/rules/${ruleId}`)
  },
}
