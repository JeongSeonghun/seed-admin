<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
</script>

<template>
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
</template>

<style scoped>
.loading { color: #888; padding: 2rem; }
.error { color: #e53e3e; }

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
.card.wide { grid-column: span 2; }
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
.card-value.small { font-size: 1.1rem; }
.card-value small {
  font-size: 0.9rem;
  font-weight: 400;
  margin-left: 2px;
  color: #666;
}
</style>
