import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true },
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { requiresAuth: true, title: '대시보드' },
        },
        {
          path: 'managers',
          name: 'managers',
          component: () => import('@/views/ManagersView.vue'),
          meta: { requiresAuth: true, title: '관리자 관리' },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UsersView.vue'),
          meta: { requiresAuth: true, title: '사용자 관리' },
        },
        {
          path: 'notices',
          name: 'notices',
          component: () => import('@/views/NoticesView.vue'),
          meta: { requiresAuth: true, title: '공지사항' },
        },
        {
          path: 'monitor',
          name: 'monitor',
          component: () => import('@/views/MonitorView.vue'),
          meta: { requiresAuth: true, title: '서버 모니터링' },
        },
        {
          path: 'services',
          name: 'services',
          component: () => import('@/views/ServicesView.vue'),
          meta: { requiresAuth: true, title: '서비스 관리' },
        },
        {
          path: 'versions',
          name: 'versions',
          component: () => import('@/views/VersionsView.vue'),
          meta: { requiresAuth: true, title: '버전 관리' },
        },
        {
          path: 'push',
          name: 'push',
          component: () => import('@/views/PushView.vue'),
          meta: { requiresAuth: true, title: '푸시 알림' },
        },
        {
          path: 'my',
          name: 'my',
          component: () => import('@/views/MyPageView.vue'),
          meta: { requiresAuth: true, title: '내 정보' },
        },
        {
          path: 'game/words',
          name: 'game-words',
          component: () => import('@/views/game/WordsView.vue'),
          meta: { requiresAuth: true, title: '단어 관리' },
        },
        {
          path: 'game/stages',
          name: 'game-stages',
          component: () => import('@/views/game/StagesView.vue'),
          meta: { requiresAuth: true, title: '스테이지 관리' },
        },
        {
          path: 'game/scene-packs',
          name: 'game-scene-packs',
          component: () => import('@/views/game/ScenePacksView.vue'),
          meta: { requiresAuth: true, title: '씬 팩 관리' },
        },
        {
          path: 'game/bundles',
          name: 'game-bundles',
          component: () => import('@/views/game/BundlesView.vue'),
          meta: { requiresAuth: true, title: '번들 관리' },
        },
        {
          path: 'game/characters',
          name: 'game-characters',
          component: () => import('@/views/game/CharactersView.vue'),
          meta: { requiresAuth: true, title: '캐릭터 관리' },
        },
        {
          path: 'game/app-config',
          name: 'game-app-config',
          component: () => import('@/views/game/AppConfigView.vue'),
          meta: { requiresAuth: true, title: '앱 설정' },
        },
        {
          path: 'smartfarm',
          name: 'smartfarm',
          component: () => import('@/views/SmartfarmView.vue'),
          meta: { requiresAuth: true, title: '스마트팜' },
        },
        {
          path: 'agent',
          name: 'agent',
          component: () => import('@/views/AgentView.vue'),
          meta: { requiresAuth: true, title: 'AI Agent 콘솔' },
        },
        {
          path: 'agent/prompts',
          name: 'agent-prompts',
          component: () => import('@/views/AgentPromptsView.vue'),
          meta: { requiresAuth: true, title: 'Agent 프롬프트 관리' },
        },
        {
          path: 'agent/logs',
          name: 'agent-logs',
          component: () => import('@/views/AgentLogsView.vue'),
          meta: { requiresAuth: true, title: 'Agent 로그' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login',
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) return { name: 'login' }
  if (to.name === 'login' && auth.isLoggedIn) return { name: 'dashboard' }
})

export default router
