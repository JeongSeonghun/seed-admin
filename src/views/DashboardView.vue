<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/network'


interface DashboardData {
  totalUsers: number
  server: {
    uptimeSeconds: number
    uptime: string
    serverTime: string
    nodeVersion: string
    memoryMb: number
  }
}

const router = useRouter()
const auth = useAuthStore()

const dashboard = ref<DashboardData | null>(null)
const loading = ref(true)
const errorMsg = ref('')

onMounted(async () => {
  try {
    const res = await api.getDashboard()
    dashboard.value = res.data
  } catch {
    errorMsg.value = '데이터를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
})

async function logout() {
  try { await api.adminLogout() } catch { /* 토큰 만료여도 로컬 정리 진행 */ }
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="logo">SEED Admin</div>
      <nav>
        <router-link :to="{ name: 'dashboard' }" class="nav-item">대시보드</router-link>
      </nav>
    </aside>

    <div class="main">
      <header class="header">
        <span class="page-title">대시보드</span>
        <button class="logout-btn" @click="logout">로그아웃</button>
      </header>

      <div class="content">
        <div v-if="loading" class="loading">불러오는 중...</div>
        <p v-else-if="errorMsg" class="error">{{ errorMsg }}</p>
        <div v-else-if="dashboard" class="cards">
          <div class="card">
            <span class="card-label">전체 사용자</span>
            <span class="card-value">{{ dashboard.totalUsers }}<small>명</small></span>
          </div>
          <div class="card">
            <span class="card-label">서버 업타임</span>
            <span class="card-value small">{{ dashboard.server.uptime }}</span>
          </div>
          <div class="card">
            <span class="card-label">메모리 사용</span>
            <span class="card-value">{{ dashboard.server.memoryMb }}<small>MB</small></span>
          </div>
          <div class="card">
            <span class="card-label">Node 버전</span>
            <span class="card-value small">{{ dashboard.server.nodeVersion }}</span>
          </div>
          <div class="card wide">
            <span class="card-label">서버 시간</span>
            <span class="card-value small">
              {{ new Date(dashboard.server.serverTime).toLocaleString('ko-KR') }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 220px;
  background: #1a1a2e;
  color: white;
  padding: 1.5rem 1rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
.logo {
  font-size: 1.2rem;
  font-weight: 700;
  color: #4a6cf7;
  padding: 0 0.5rem;
}
nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.nav-item {
  display: block;
  color: #aab;
  text-decoration: none;
  padding: 0.55rem 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover,
.nav-item.router-link-active {
  background: rgba(74, 108, 247, 0.2);
  color: white;
}

/* Main */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
  min-width: 0;
}
.header {
  background: white;
  padding: 0.9rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.page-title {
  font-weight: 600;
  font-size: 1rem;
  color: #1a1a2e;
}
.logout-btn {
  padding: 0.35rem 0.9rem;
  background: transparent;
  border: 1px solid #e53e3e;
  color: #e53e3e;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.15s;
}
.logout-btn:hover {
  background: #fff5f5;
}

/* Content */
.content {
  padding: 1.5rem;
}
.loading {
  color: #888;
  padding: 2rem;
}
.error {
  color: #e53e3e;
}

/* Cards */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}
.card {
  background: white;
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.card.wide {
  grid-column: span 2;
}
.card-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #888;
  letter-spacing: 0.05em;
}
.card-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1;
}
.card-value.small {
  font-size: 1.1rem;
}
.card-value small {
  font-size: 0.9rem;
  font-weight: 400;
  margin-left: 2px;
  color: #666;
}
</style>
