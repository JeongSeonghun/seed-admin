<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'
import { usePush } from '@/composables/usePush'

interface PushLog {
  id: number; title: string; body: string; sentAt: string
}

const { enabled, loading, errorMsg, configured, enable, disable } = usePush()

const logs = ref<PushLog[]>([])
const logsLoading = ref(true)

function fmtDate(v: string) {
  return new Date(v).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

async function loadLogs() {
  logsLoading.value = true
  try {
    const res = await api.adminPushMyNotifications(30)
    logs.value = res.data
  } finally {
    logsLoading.value = false
  }
}

async function togglePush() {
  if (enabled.value) await disable()
  else await enable()
}

onMounted(loadLogs)
</script>

<template>
  <div class="notif">
    <div class="card push-card">
      <div class="push-row">
        <div>
          <div class="card-title">이 기기에서 알림 받기</div>
          <p class="push-desc">{{ enabled ? '알림이 켜져 있습니다.' : '스마트팜 알림 등을 이 기기로 받으려면 켜주세요.' }}</p>
        </div>
        <button
          class="toggle" :class="{ on: enabled }"
          :disabled="loading || !configured"
          @click="togglePush"
        >
          {{ loading ? '처리 중...' : (enabled ? 'ON' : 'OFF') }}
        </button>
      </div>
      <p v-if="!configured" class="hint">푸시 설정이 아직 준비되지 않았습니다.</p>
      <p v-if="errorMsg" class="hint error">{{ errorMsg }}</p>
    </div>

    <div class="card">
      <div class="card-title">받은 알림</div>
      <div v-if="logsLoading" class="empty">불러오는 중...</div>
      <div v-else-if="!logs.length" class="empty">받은 알림이 없습니다.</div>
      <ul v-else class="log-list">
        <li v-for="log in logs" :key="log.id" class="log-item">
          <div class="log-top">
            <span class="log-title">{{ log.title }}</span>
            <span class="log-time">{{ fmtDate(log.sentAt) }}</span>
          </div>
          <p class="log-body">{{ log.body }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.notif { display: flex; flex-direction: column; gap: 0.9rem; }

.card {
  background: white;
  border-radius: 12px;
  padding: 1.1rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.card-title { font-size: 0.78rem; font-weight: 700; color: #4a6cf7; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.5rem; }

.push-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.push-desc { margin: 0.2rem 0 0; font-size: 0.82rem; color: #8b91b5; }

.toggle {
  flex-shrink: 0;
  padding: 0.5rem 1.1rem;
  border-radius: 99px;
  border: 1px solid #dfe3ee;
  background: #eceef5;
  color: #444;
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
}
.toggle.on { background: #4a6cf7; border-color: #4a6cf7; color: white; }
.toggle:disabled { opacity: 0.6; cursor: not-allowed; }

.hint { margin: 0.7rem 0 0; font-size: 0.78rem; color: #8b91b5; }
.hint.error { color: #e53e3e; }

.empty { text-align: center; color: #8b91b5; padding: 1.5rem 0; font-size: 0.88rem; }

.log-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.log-item { padding: 0.8rem 0; border-bottom: 1px solid #f0f2f5; }
.log-item:last-child { border-bottom: none; }
.log-top { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; }
.log-title { font-weight: 700; font-size: 0.9rem; color: #1a1a2e; }
.log-time { font-size: 0.72rem; color: #8b91b5; flex-shrink: 0; }
.log-body { margin: 0.25rem 0 0; font-size: 0.85rem; color: #555; }
</style>
