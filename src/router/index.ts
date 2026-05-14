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
          path: 'game/packages',
          name: 'game-packages',
          component: () => import('@/views/game/PackagesView.vue'),
          meta: { requiresAuth: true, title: '패키지 관리' },
        },
        {
          path: 'game/my-images',
          name: 'game-my-images',
          component: () => import('@/views/game/MyImagesView.vue'),
          meta: { requiresAuth: true, title: '캐릭터 이미지 관리' },
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
