<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'

interface ServerStatus {
  id: number
  name: string
  url: string
  description: string | null
  status: 'up' | 'down'
  responseTimeMs: number | null
  info: {
    status?: string
    uptimeSeconds?: number
    memory?: { totalMb: number; usedMb: number; freeMb: number; percent: number }
    [key: string]: unknown
  } | null
}

const statuses = ref<ServerStatus[]>([])
const loading = ref(true)
const refreshing = ref(false)
const errorMsg = ref('')

const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const form = ref({ id: 0, name: '', url: '', description: '' })

async function load(silent = false) {
  if (!silent) loading.value = true
  else refreshing.value = true
  errorMsg.value = ''
  try {
    const res = await api.getMonitorStatus()
    statuses.value = res.data
  } catch {
    errorMsg.value = '상태를 불러오지 못했습니다.'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

onMounted(load)

function openCreate() {
  isEdit.value = false
  form.value = { id: 0, name: '', url: '', description: '' }
  showModal.value = true
}

function openEdit(s: ServerStatus) {
  isEdit.value = true
  form.value = { id: s.id, name: s.name, url: s.url, description: s.description ?? '' }
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    const body = { name: form.value.name, url: form.value.url, description: form.value.description || undefined }
    if (isEdit.value) {
      await api.updateMonitorServer(form.value.id, body)
    } else {
      await api.createMonitorServer(body)
    }
    showModal.value = false
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message ?? '저장에 실패했습니다.')
  } finally {
    saving.value = false
  }
}

async function remove(s: ServerStatus) {
  if (!confirm(`"${s.name}" 서버를 삭제하시겠습니까?`)) return
  try {
    await api.deleteMonitorServer(s.id)
    await load()
  } catch {
    alert('삭제에 실패했습니다.')
  }
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}일 ${h}시간`
  if (h > 0) return `${h}시간 ${m}분`
  return `${m}분`
}
</script>

<template>
  <div>
    <div class="toolbar">
      <button class="btn-ghost" :disabled="refreshing" @click="load(true)">
        {{ refreshing ? '갱신 중...' : '새로고침' }}
      </button>
      <button class="btn-primary" @click="openCreate">+ 서버 추가</button>
    </div>

    <div v-if="loading" class="loading">상태 확인 중...</div>
    <p v-else-if="errorMsg" class="error">{{ errorMsg }}</p>

    <div v-else class="server-grid">
      <div v-for="s in statuses" :key="s.id" class="server-card" :class="s.status">
        <div class="card-header">
          <div class="server-info">
            <span class="status-dot" :class="s.status" />
            <span class="server-name">{{ s.name }}</span>
            <span class="status-label" :class="s.status">{{ s.status === 'up' ? '온라인' : '오프라인' }}</span>
          </div>
          <div class="card-actions">
            <button class="btn-xs" @click="openEdit(s)">편집</button>
            <button class="btn-xs btn-danger" @click="remove(s)">삭제</button>
          </div>
        </div>

        <div class="card-url">{{ s.url }}</div>
        <div v-if="s.description" class="card-desc">{{ s.description }}</div>

        <div v-if="s.status === 'up'" class="metrics">
          <div class="metric">
            <span class="metric-label">응답시간</span>
            <span class="metric-value">{{ s.responseTimeMs }}ms</span>
          </div>
          <template v-if="s.info?.memory">
            <div class="metric">
              <span class="metric-label">메모리 사용</span>
              <span class="metric-value">{{ s.info.memory.usedMb }}MB / {{ s.info.memory.totalMb }}MB</span>
            </div>
            <div class="metric full">
              <span class="metric-label">메모리 {{ s.info.memory.percent }}%</span>
              <div class="progress">
                <div class="progress-bar" :style="{ width: s.info.memory.percent + '%' }"
                  :class="s.info.memory.percent > 80 ? 'danger' : s.info.memory.percent > 60 ? 'warn' : ''" />
              </div>
            </div>
            <div v-if="s.info.uptimeSeconds" class="metric">
              <span class="metric-label">업타임</span>
              <span class="metric-value">{{ formatUptime(s.info.uptimeSeconds as number) }}</span>
            </div>
          </template>
        </div>

        <div v-else class="down-msg">연결할 수 없습니다.</div>
      </div>

      <div v-if="statuses.length === 0" class="empty-state">
        등록된 서버가 없습니다. 서버를 추가해주세요.
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ isEdit ? '서버 편집' : '서버 추가' }}</h3>

        <label>서버 이름</label>
        <input v-model="form.name" type="text" placeholder="pi4, pi5 등" />

        <label>URL</label>
        <input v-model="form.url" type="text" placeholder="http://192.168.1.100:9090/monitor" />

        <label>설명 (선택)</label>
        <input v-model="form.description" type="text" placeholder="nginx 프록시 서버" />

        <div class="modal-actions">
          <button class="btn-ghost" @click="showModal = false">취소</button>
          <button class="btn-primary" :disabled="saving" @click="save">
            {{ saving ? '저장 중...' : '저장' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar { display: flex; justify-content: flex-end; gap: 0.5rem; margin-bottom: 1rem; }
.loading { color: #888; }
.error { color: #e53e3e; }

.server-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.server-card {
  background: white;
  border-radius: 10px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border-left: 4px solid #e2e8f0;
}
.server-card.up { border-left-color: #48bb78; }
.server-card.down { border-left-color: #e53e3e; }

.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
.server-info { display: flex; align-items: center; gap: 0.5rem; }
.status-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.status-dot.up { background: #48bb78; }
.status-dot.down { background: #e53e3e; }
.server-name { font-weight: 600; font-size: 0.95rem; color: #1a1a2e; }
.status-label { font-size: 0.7rem; font-weight: 600; padding: 0.15rem 0.45rem; border-radius: 10px; }
.status-label.up { background: #f0fff4; color: #276749; }
.status-label.down { background: #fff5f5; color: #c53030; }

.card-actions { display: flex; gap: 4px; }
.card-url { font-size: 0.75rem; color: #888; margin-bottom: 0.25rem; word-break: break-all; }
.card-desc { font-size: 0.8rem; color: #666; margin-bottom: 0.5rem; }

.metrics { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.75rem; }
.metric { display: flex; flex-direction: column; gap: 0.2rem; min-width: 100px; }
.metric.full { width: 100%; }
.metric-label { font-size: 0.7rem; color: #888; font-weight: 600; }
.metric-value { font-size: 0.875rem; font-weight: 600; color: #1a1a2e; }

.progress { height: 6px; background: #eee; border-radius: 3px; overflow: hidden; margin-top: 2px; }
.progress-bar { height: 100%; background: #48bb78; border-radius: 3px; transition: width 0.3s; }
.progress-bar.warn { background: #ed8936; }
.progress-bar.danger { background: #e53e3e; }

.down-msg { font-size: 0.825rem; color: #e53e3e; margin-top: 0.75rem; }
.empty-state { grid-column: 1/-1; text-align: center; color: #aaa; padding: 3rem; }

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
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost {
  padding: 0.45rem 1rem;
  background: transparent;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}
.btn-ghost:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-xs {
  padding: 0.2rem 0.5rem;
  border: 1px solid #e2e8f0;
  background: #f7f8fa;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}
.btn-xs:hover { background: #e2e8f0; }
.btn-xs.btn-danger { color: #e53e3e; border-color: #fed7d7; }
.btn-xs.btn-danger:hover { background: #fff5f5; }

.overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.modal {
  background: white;
  border-radius: 12px;
  padding: 1.75rem 2rem;
  width: 420px;
  max-width: 95vw;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.modal h3 { margin-bottom: 0.5rem; font-size: 1.1rem; color: #1a1a2e; }
.modal label { font-size: 0.8rem; font-weight: 600; color: #555; margin-top: 0.4rem; }
.modal input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.875rem;
}
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
</style>
