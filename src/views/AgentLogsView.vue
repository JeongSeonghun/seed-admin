<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api, { type AgentLog, type AgentLogStats } from '@/network'

const logs = ref<AgentLog[]>([])
const stats = ref<AgentLogStats | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// 필터
const filterAgentId = ref('')
const filterLimit = ref(50)

// 상세 모달
const selected = ref<AgentLog | null>(null)

onMounted(load)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [logsRes, statsRes] = await Promise.all([
      api.getAgentLogs({
        limit: filterLimit.value,
        agentId: filterAgentId.value || undefined,
      }),
      api.getAgentLogStats(),
    ])
    logs.value = logsRes.data
    stats.value = statsRes.data
  } catch {
    error.value = '로그 로드 실패'
  } finally {
    loading.value = false
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function truncate(text: string, max = 80) {
  return text.length > max ? text.slice(0, max) + '…' : text
}
</script>

<template>
  <div class="logs-page">

    <!-- 통계 카드 -->
    <div class="stats-row" v-if="stats">
      <div class="stat-card">
        <div class="stat-value">{{ stats.total.toLocaleString() }}</div>
        <div class="stat-label">전체 요청</div>
      </div>
      <div class="stat-card error">
        <div class="stat-value">{{ stats.errors.toLocaleString() }}</div>
        <div class="stat-label">오류</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.avgLatencyMs.toLocaleString() }} ms</div>
        <div class="stat-label">평균 응답 시간</div>
      </div>
      <div class="stat-card agents">
        <div class="agent-dist">
          <span
            v-for="a in stats.byAgent.slice(0, 4)"
            :key="a.agentId"
            class="agent-chip"
          >{{ a.agentId }} ({{ a.count }})</span>
          <span v-if="stats.byAgent.length === 0" class="no-data">데이터 없음</span>
        </div>
        <div class="stat-label">Agent별 요청 수</div>
      </div>
    </div>

    <!-- 필터 + 새로고침 -->
    <div class="toolbar">
      <input
        v-model="filterAgentId"
        class="input-sm"
        placeholder="agentId 필터"
        @keyup.enter="load"
      />
      <select v-model.number="filterLimit" class="select-sm">
        <option :value="20">최근 20건</option>
        <option :value="50">최근 50건</option>
        <option :value="100">최근 100건</option>
        <option :value="200">최근 200건</option>
      </select>
      <button class="btn-primary" :disabled="loading" @click="load">
        {{ loading ? '로딩 중...' : '조회' }}
      </button>
    </div>

    <div v-if="error" class="error-bar">{{ error }}</div>

    <!-- 로그 테이블 -->
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>시각</th>
            <th>Agent</th>
            <th>모델</th>
            <th>입력</th>
            <th>출력</th>
            <th class="num">응답 시간</th>
            <th class="num">상태</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="center">로딩 중...</td>
          </tr>
          <tr v-else-if="logs.length === 0">
            <td colspan="7" class="center">로그가 없습니다.</td>
          </tr>
          <tr
            v-for="log in logs"
            :key="log.id"
            class="log-row"
            :class="{ 'is-error': log.isError }"
            @click="selected = log"
          >
            <td class="nowrap">{{ formatDate(log.createdAt) }}</td>
            <td><span class="chip">{{ log.agentId ?? '—' }}</span></td>
            <td class="model">{{ log.model }}</td>
            <td class="text-cell">{{ truncate(log.input) }}</td>
            <td class="text-cell">{{ truncate(log.output) }}</td>
            <td class="num">{{ log.latencyMs.toLocaleString() }} ms</td>
            <td class="num">
              <span class="badge" :class="log.isError ? 'err' : 'ok'">
                {{ log.isError ? '오류' : '성공' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 상세 모달 -->
    <div v-if="selected" class="modal-overlay" @click.self="selected = null">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">로그 상세</span>
          <button class="btn-ghost" @click="selected = null">✕</button>
        </div>
        <div class="modal-meta">
          <span>{{ formatDate(selected.createdAt) }}</span>
          <span class="chip">{{ selected.agentId ?? '—' }}</span>
          <span class="model">{{ selected.model }}</span>
          <span>{{ selected.latencyMs.toLocaleString() }} ms</span>
          <span class="badge" :class="selected.isError ? 'err' : 'ok'">
            {{ selected.isError ? '오류' : '성공' }}
          </span>
        </div>
        <div class="modal-section">
          <div class="section-label">입력</div>
          <pre class="pre-box">{{ selected.input }}</pre>
        </div>
        <div class="modal-section">
          <div class="section-label">{{ selected.isError ? '오류 메시지' : '출력' }}</div>
          <pre class="pre-box">{{ selected.isError ? selected.errorMessage : selected.output }}</pre>
        </div>
        <div v-if="selected.sessionId" class="modal-section">
          <div class="section-label">세션 ID</div>
          <code class="code-inline">{{ selected.sessionId }}</code>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.logs-page { display: flex; flex-direction: column; gap: 1rem; }

/* 통계 */
.stats-row { display: flex; gap: 1rem; }
.stat-card {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.07);
}
.stat-card.agents { flex: 2; }
.stat-value { font-size: 1.5rem; font-weight: 700; color: #1a1a2e; }
.stat-card.error .stat-value { color: #c53030; }
.stat-label { font-size: 0.75rem; color: #718096; margin-top: 0.25rem; }
.agent-dist { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.4rem; }
.agent-chip {
  background: #ebf4ff; color: #2b6cb0;
  padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem;
}
.no-data { color: #a0aec0; font-size: 0.8rem; }

/* 필터 툴바 */
.toolbar { display: flex; gap: 0.75rem; align-items: center; }
.input-sm {
  padding: 0.45rem 0.75rem; border: 1px solid #e2e8f0;
  border-radius: 6px; font-size: 0.85rem; width: 180px;
}
.select-sm {
  padding: 0.45rem 0.6rem; border: 1px solid #e2e8f0;
  border-radius: 6px; font-size: 0.85rem; background: white;
}
.btn-primary {
  padding: 0.45rem 1rem; background: #4a6cf7; color: white;
  border: none; border-radius: 6px; font-size: 0.85rem;
  font-weight: 600; cursor: pointer;
}
.btn-primary:hover:not(:disabled) { background: #3a5ce7; }
.btn-primary:disabled { background: #a0aec0; cursor: not-allowed; }

/* 테이블 */
.table-wrap {
  background: white; border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.07); overflow-x: auto;
}
.table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.table th {
  background: #f7fafc; padding: 0.65rem 0.9rem;
  text-align: left; font-size: 0.75rem; font-weight: 700;
  color: #718096; text-transform: uppercase; letter-spacing: 0.04em;
  border-bottom: 1px solid #e2e8f0;
}
.table td { padding: 0.65rem 0.9rem; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
.log-row { cursor: pointer; transition: background 0.1s; }
.log-row:hover { background: #f7fafc; }
.log-row.is-error td { color: #c53030; }
.nowrap { white-space: nowrap; }
.num { text-align: right; }
.text-cell { color: #4a5568; max-width: 220px; }
.model { font-family: monospace; font-size: 0.8rem; color: #718096; }
.center { text-align: center; color: #a0aec0; padding: 2rem; }
.chip {
  background: #edf2f7; color: #4a5568;
  padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.78rem; font-family: monospace;
}
.badge {
  padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;
}
.badge.ok  { background: #f0fff4; color: #276749; }
.badge.err { background: #fff5f5; color: #c53030; }

/* 모달 */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal {
  background: white; border-radius: 12px; width: 700px; max-width: 95vw;
  max-height: 85vh; overflow-y: auto; padding: 1.5rem;
  display: flex; flex-direction: column; gap: 1rem;
}
.modal-header { display: flex; justify-content: space-between; align-items: center; }
.modal-title { font-weight: 700; font-size: 1rem; color: #1a1a2e; }
.modal-meta { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; font-size: 0.82rem; color: #718096; }
.modal-section { display: flex; flex-direction: column; gap: 0.4rem; }
.section-label { font-size: 0.75rem; font-weight: 700; color: #718096; text-transform: uppercase; }
.pre-box {
  background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 6px;
  padding: 0.75rem 1rem; font-size: 0.83rem; white-space: pre-wrap;
  word-break: break-word; max-height: 260px; overflow-y: auto; margin: 0;
}
.code-inline {
  background: #f7fafc; padding: 0.25rem 0.5rem;
  border-radius: 4px; font-size: 0.8rem; color: #4a5568;
}
.btn-ghost {
  padding: 0.35rem 0.7rem; background: transparent;
  border: 1px solid #e2e8f0; border-radius: 6px;
  font-size: 0.9rem; color: #718096; cursor: pointer;
}
.error-bar {
  background: #fff5f5; border: 1px solid #fed7d7;
  color: #c53030; padding: 0.6rem 0.9rem; border-radius: 6px; font-size: 0.85rem;
}
</style>
