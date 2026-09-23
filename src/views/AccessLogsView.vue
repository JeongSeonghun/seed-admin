<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'

interface AccessLog {
  id: number
  adminId: number
  adminEmail: string
  action: string
  targetUserId: number | null
  ip: string | null
  statusCode: number | null
  createdAt: string
}

const ACTION_LABEL: Record<string, string> = {
  VIEW_LIST: '목록 조회',
  VIEW_DETAIL: '상세 조회',
  CREATE: '생성',
  UPDATE: '수정',
  UPDATE_ROLES: '권한 변경',
  UPDATE_SERVICE_ACCESS: '서비스 접근 변경',
  DELETE: '삭제',
}

const logs = ref<AccessLog[]>([])
const loading = ref(true)
const errorMsg = ref('')

const filter = ref({ adminId: '', targetUserId: '', from: '', to: '' })

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await api.getAccessLogs({
      adminId: filter.value.adminId ? Number(filter.value.adminId) : undefined,
      targetUserId: filter.value.targetUserId ? Number(filter.value.targetUserId) : undefined,
      from: filter.value.from || undefined,
      to: filter.value.to || undefined,
      limit: 200,
    })
    logs.value = res.data
  } catch {
    errorMsg.value = '접근 기록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function fmtDate(v: string) {
  return new Date(v).toLocaleString('ko-KR')
}
</script>

<template>
  <div>
    <p class="desc">관리자가 사용자 개인정보를 조회·수정한 기록입니다. SUPER_ADMIN에게만 보입니다.</p>

    <div class="filter-bar">
      <input v-model="filter.adminId" type="number" placeholder="관리자 ID" class="filter-input" />
      <input v-model="filter.targetUserId" type="number" placeholder="대상 유저 ID" class="filter-input" />
      <input v-model="filter.from" type="date" class="filter-input" />
      <span class="filter-sep">~</span>
      <input v-model="filter.to" type="date" class="filter-input" />
      <button class="btn-primary" @click="load">조회</button>
    </div>

    <div v-if="loading" class="loading">불러오는 중...</div>
    <p v-else-if="errorMsg" class="error">{{ errorMsg }}</p>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>시각</th>
            <th>관리자</th>
            <th>액션</th>
            <th>대상 유저 ID</th>
            <th>IP</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td class="time-cell">{{ fmtDate(log.createdAt) }}</td>
            <td>{{ log.adminEmail }}</td>
            <td><span class="badge">{{ ACTION_LABEL[log.action] ?? log.action }}</span></td>
            <td>{{ log.targetUserId ?? '-' }}</td>
            <td class="ip-cell">{{ log.ip ?? '-' }}</td>
            <td>
              <span class="status" :class="{ fail: (log.statusCode ?? 0) >= 400 }">{{ log.statusCode ?? '-' }}</span>
            </td>
          </tr>
          <tr v-if="!logs.length">
            <td colspan="6" class="empty">기록이 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.desc { font-size: 0.85rem; color: #888; margin-bottom: 1rem; }

.filter-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.filter-input {
  padding: 0.45rem 0.7rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.85rem;
}
.filter-sep { color: #aaa; font-size: 0.8rem; }

.btn-primary {
  padding: 0.45rem 1rem;
  background: #4a6cf7;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}
.btn-primary:hover { background: #3a5ce5; }

.loading { color: #888; }
.error { color: #e53e3e; }

.table-wrap {
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  overflow: hidden;
}
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.7rem 1rem; text-align: left; font-size: 0.85rem; }
th { background: #f7f8fa; font-weight: 600; color: #555; border-bottom: 1px solid #eee; }
td { border-bottom: 1px solid #f0f0f0; color: #333; }
tr:last-child td { border-bottom: none; }
.empty { text-align: center; color: #aaa; padding: 2rem; }

.time-cell { white-space: nowrap; color: #666; }
.ip-cell { font-family: monospace; font-size: 0.8rem; color: #666; }

.badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #ebf4ff;
  color: #2b6cb0;
}

.status { font-weight: 600; color: #276749; }
.status.fail { color: #c53030; }
</style>
