import { ref } from 'vue'
import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging'
import api from '@/network'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

// Firebase 콘솔에서 값을 아직 안 채웠으면 조용히 비활성화 상태로만 둔다 (에러 대신 안내만 노출)
const configured = !!(firebaseConfig.apiKey && firebaseConfig.projectId && vapidKey)

const STORAGE_KEY = 'seed_admin_push_token'

export function usePush() {
  const enabled = ref(!!localStorage.getItem(STORAGE_KEY))
  const loading = ref(false)
  const errorMsg = ref('')

  async function enable() {
    errorMsg.value = ''
    if (!configured) {
      errorMsg.value = '푸시 설정이 아직 준비되지 않았습니다. (관리자에게 문의)'
      return
    }
    if (!(await isSupported())) {
      errorMsg.value = '이 브라우저/환경에서는 웹 푸시를 지원하지 않습니다.'
      return
    }
    loading.value = true
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        errorMsg.value = '알림 권한이 거부되었습니다.'
        return
      }
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      const app = getApps()[0] ?? initializeApp(firebaseConfig)
      const messaging = getMessaging(app)
      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
      if (!token) {
        errorMsg.value = '푸시 토큰을 가져오지 못했습니다.'
        return
      }
      await api.adminPushRegisterSelfToken({ token, platform: 'web' })
      localStorage.setItem(STORAGE_KEY, token)
      enabled.value = true
    } catch (e: any) {
      errorMsg.value = e?.message ?? '알림 등록에 실패했습니다.'
    } finally {
      loading.value = false
    }
  }

  async function disable() {
    const token = localStorage.getItem(STORAGE_KEY)
    loading.value = true
    errorMsg.value = ''
    try {
      if (token) {
        await api.adminPushRemoveSelfToken(token)
        const app = getApps()[0]
        if (app) {
          try { await deleteToken(getMessaging(app)) } catch { /* 이미 만료됐어도 로컬 상태만 정리하면 됨 */ }
        }
      }
      localStorage.removeItem(STORAGE_KEY)
      enabled.value = false
    } finally {
      loading.value = false
    }
  }

  return { enabled, loading, errorMsg, configured, enable, disable }
}
