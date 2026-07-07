<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import api, { type AgentLog, type AgentLogStats, type AgentLogTimeseriesRow } from '@/network'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const logs = ref<AgentLog[]>([])
const stats = ref<AgentLogStats | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// 필터 (테이블 뷰)
const filterAgentId = ref('')
const filterLimit = ref(50)

// 상세 모달
const selected = ref<AgentLog | null>(null)

// 테이블/차트 뷰
type ViewMode = 'table' | 'chart'
type ChartInterval = 'hour' | 'day'
type ChartPeriod = 'today' | '7d' | '30d' | 'custom'

const viewMode = ref<ViewMode>('table')
const chartInterval = ref<ChartInterval>('hour')
const chartPeriod = ref<ChartPeriod>('7d')
const chartCustomFrom = ref('')
const chartCustomTo = ref('')
const chartRows = ref<AgentLogTimeseriesRow[]>([])
const chartLoading = ref(false)

onMounted(load)
watch(viewMode, (v) => { if (v === 'chart' && chartRows.value.length === 0) loadChart() })

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

function periodRange(): { from: string; to: string } {
  const now = new Date()
  if (chartPeriod.value === 'today') {
    const from = new Date(now)
    from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: now.toISOString() }
  }
  if (chartPeriod.value === '7d') {
    return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), to: now.toISOString() }
  }
  if (chartPeriod.value === '30d') {
    return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), to: now.toISOString() }
  }
  return {
    from: chartCustomFrom.value ? new Date(chartCustomFrom.value).toISOString() : '',
    to: chartCustomTo.value ? new Date(chartCustomTo.value + 'T23:59:59').toISOString() : '',
  }
}

async function loadChart() {
  chartLoading.value = true
  error.value = null
  try {
    const { from, to } = periodRange()
    const res = await api.getAgentLogsTimeseries({ interval: chartInterval.value, from, to })
    chartRows.value = res.data
  } catch {
    error.value = '차트 로드 실패'
  } finally {
    chartLoading.value = false
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

// ── 차트: 모델별 시계열 ──────────────────────────────────────────
const MODEL_COLORS = ['#4a6cf7', '#48bb78', '#f56565', '#ed8936', '#9f7aea', '#38b2ac', '#d53f8c', '#718096']

function colorForModel(model: string) {
  const idx = distinctModels.value.indexOf(model)
  return MODEL_COLORS[idx % MODEL_COLORS.length]
}

function fmtBucket(bucket: string) {
  const d = new Date(bucket)
  if (chartInterval.value === 'day') {
    return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
  }
  return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const distinctModels = computed(() => Array.from(new Set(chartRows.value.map((r) => r.model))).sort())

const bucketLabels = computed(() => Array.from(new Set(chartRows.value.map((r) => r.bucket))).sort())

function buildDatasets(valueFn: (r: AgentLogTimeseriesRow) => number) {
  return distinctModels.value.map((model) => {
    const color = colorForModel(model)
    const byBucket = new Map(chartRows.value.filter((r) => r.model === model).map((r) => [r.bucket, r]))
    return {
      label: model,
      data: bucketLabels.value.map((b) => {
        const row = byBucket.get(b)
        return row ? valueFn(row) : null
      }),
      borderColor: color,
      backgroundColor: color + '22',
      fill: false,
      tension: 0.35,
      pointRadius: bucketLabels.value.length > 60 ? 0 : 3,
      borderWidth: 2,
      spanGaps: true,
    }
  })
}

const requestCountChart = computed(() => ({
  labels: bucketLabels.value.map(fmtBucket),
  datasets: buildDatasets((r) => r.count),
}))
const latencyChart = computed(() => ({
  labels: bucketLabels.value.map(fmtBucket),
  datasets: buildDatasets((r) => r.avgLatencyMs),
}))
const tokenChart = computed(() => ({
  labels: bucketLabels.value.map(fmtBucket),
  datasets: buildDatasets((r) => r.promptTokens + r.completionTokens),
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  // Chart.js가 기존 인스턴스에 새 data를 반영하는 도중(애니메이션 중) 또 업데이트가
  // 들어오면 캔버스가 빈 채로 남는 경우가 있어(시간별→일별 전환 시 재현) 비활성화.
  animation: false as const,
  plugins: {
    legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 10 } } },
    tooltip: { mode: 'index' as const, intersect: false },
  },
  scales: {
    x: { grid: { color: '#f0f2f5' }, ticks: { maxRotation: 45, font: { size: 10 } } },
    y: { grid: { color: '#f0f2f5' }, ticks: { font: { size: 11 } } },
  },
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
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalPromptTokens.toLocaleString() }} / {{ stats.totalCompletionTokens.toLocaleString() }}</div>
        <div class="stat-label">토큰 (입력 / 출력)</div>
      </div>
    </div>

    <!-- 모델별 / Agent별 분해 -->
    <div class="breakdown-row" v-if="stats">
      <div class="breakdown-panel">
        <div class="panel-title">모델별 지표</div>
        <table class="mini-table" v-if="stats.byModel.length">
          <thead>
            <tr>
              <th>모델</th>
              <th class="num">요청</th>
              <th class="num">평균 응답</th>
              <th class="num">에러율</th>
              <th class="num">토큰(in/out)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in stats.byModel" :key="m.model">
              <td class="model">{{ m.model }}</td>
              <td class="num">{{ m.count.toLocaleString() }}</td>
              <td class="num">{{ m.avgLatencyMs.toLocaleString() }} ms</td>
              <td class="num" :class="{ 'err-text': m.errorRate > 0 }">{{ (m.errorRate * 100).toFixed(1) }}%</td>
              <td class="num">{{ m.totalPromptTokens.toLocaleString() }} / {{ m.totalCompletionTokens.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="no-data">데이터 없음</div>
      </div>
      <div class="breakdown-panel">
        <div class="panel-title">Agent별 요청 수</div>
        <div class="agent-dist">
          <span v-for="a in stats.byAgent" :key="a.agentId" class="agent-chip">{{ a.agentId }} ({{ a.count }})</span>
          <span v-if="stats.byAgent.length === 0" class="no-data">데이터 없음</span>
        </div>
      </div>
    </div>

    <!-- 테이블/차트 토글 -->
    <div class="view-toolbar">
      <div class="view-toggle">
        <button :class="{ active: viewMode === 'table' }" @click="viewMode = 'table'">테이블</button>
        <button :class="{ active: viewMode === 'chart' }" @click="viewMode = 'chart'">차트</button>
      </div>
      <template v-if="viewMode === 'chart'">
        <div class="period-btns">
          <button :class="{ active: chartPeriod === 'today' }" @click="chartPeriod = 'today'">오늘</button>
          <button :class="{ active: chartPeriod === '7d' }" @click="chartPeriod = '7d'">7일</button>
          <button :class="{ active: chartPeriod === '30d' }" @click="chartPeriod = '30d'">30일</button>
          <button :class="{ active: chartPeriod === 'custom' }" @click="chartPeriod = 'custom'">직접</button>
        </div>
        <template v-if="chartPeriod === 'custom'">
          <input type="date" v-model="chartCustomFrom" class="date-input" />
          <span class="date-sep">~</span>
          <input type="date" v-model="chartCustomTo" class="date-input" />
        </template>
        <div class="interval-btns">
          <button :class="{ active: chartInterval === 'hour' }" @click="chartInterval = 'hour'">시간별</button>
          <button :class="{ active: chartInterval === 'day' }" @click="chartInterval = 'day'">일별</button>
        </div>
        <button class="btn-primary btn-sm" @click="loadChart" :disabled="chartLoading">
          {{ chartLoading ? '...' : '조회' }}
        </button>
      </template>
    </div>

    <div v-if="error" class="error-bar">{{ error }}</div>

    <!-- 테이블 뷰 -->
    <template v-if="viewMode === 'table'">
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
              <th class="num">토큰(in/out)</th>
              <th class="num">상태</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="center">로딩 중...</td>
            </tr>
            <tr v-else-if="logs.length === 0">
              <td colspan="8" class="center">로그가 없습니다.</td>
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
              <td class="num">{{ log.promptTokens ?? '—' }} / {{ log.completionTokens ?? '—' }}</td>
              <td class="num">
                <span class="badge" :class="log.isError ? 'err' : 'ok'">
                  {{ log.isError ? '오류' : '성공' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 차트 뷰 -->
    <template v-else>
      <div v-if="chartLoading" class="empty-state">불러오는 중...</div>
      <div v-else-if="!chartRows.length" class="empty-state">데이터가 없습니다. 기간을 선택 후 조회하세요.</div>
      <div v-else class="chart-grid">
        <div class="chart-card">
          <div class="chart-card-title">요청 수 추이 (모델별)</div>
          <div class="chart-wrap"><Line :data="requestCountChart" :options="chartOptions" /></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-title">평균 응답 시간 추이 (ms, 모델별)</div>
          <div class="chart-wrap"><Line :data="latencyChart" :options="chartOptions" /></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-title">토큰 사용량 추이 (입력+출력, 모델별)</div>
          <div class="chart-wrap"><Line :data="tokenChart" :options="chartOptions" /></div>
        </div>
      </div>
    </template>

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
          <span v-if="selected.promptVersion != null" class="chip">프롬프트 v{{ selected.promptVersion }}</span>
          <span>{{ selected.latencyMs.toLocaleString() }} ms</span>
          <span v-if="selected.promptTokens != null">토큰 {{ selected.promptTokens }} / {{ selected.completionTokens }}</span>
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
.stat-value { font-size: 1.5rem; font-weight: 700; color: #1a1a2e; }
.stat-card.error .stat-value { color: #c53030; }
.stat-label { font-size: 0.75rem; color: #718096; margin-top: 0.25rem; }

/* 모델별/Agent별 분해 */
.breakdown-row { display: flex; gap: 1rem; }
.breakdown-panel {
  flex: 1; background: white; border-radius: 8px;
  padding: 1rem 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.07);
}
.panel-title { font-size: 0.75rem; font-weight: 700; color: #718096; text-transform: uppercase; margin-bottom: 0.6rem; }
.mini-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.mini-table th {
  text-align: left; font-size: 0.7rem; font-weight: 700; color: #a0aec0;
  text-transform: uppercase; padding-bottom: 0.4rem;
}
.mini-table td { padding: 0.35rem 0; border-top: 1px solid #f0f2f5; }
.mini-table .err-text { color: #c53030; font-weight: 600; }
.agent-dist { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.agent-chip {
  background: #ebf4ff; color: #2b6cb0;
  padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem;
}
.no-data { color: #a0aec0; font-size: 0.8rem; }

/* 테이블/차트 토글 툴바 */
.view-toolbar {
  display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
  background: white; border-radius: 8px; padding: 0.6rem 0.9rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.07);
}
.view-toggle, .period-btns, .interval-btns {
  display: flex; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;
}
.view-toggle button, .period-btns button, .interval-btns button {
  padding: 0.3rem 0.75rem; border: none; background: #fff;
  cursor: pointer; font-size: 0.8rem; color: #666;
}
.view-toggle button.active, .period-btns button.active, .interval-btns button.active {
  background: #4a6cf7; color: #fff; font-weight: 600;
}
.interval-btns { margin-left: 0.25rem; }
.date-input {
  padding: 0.3rem 0.5rem; border: 1px solid #e2e8f0; border-radius: 6px;
  font-size: 0.8rem; color: #333;
}
.date-sep { color: #aaa; font-size: 0.8rem; }
.btn-sm { padding: 0.3rem 0.8rem; font-size: 0.8rem; }

/* 차트 */
.chart-grid {
  display: flex; flex-direction: column; gap: 0;
  background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.07);
}
.chart-card { border-bottom: 1px solid #f0f2f5; padding: 1rem 1.25rem 1.25rem; }
.chart-card:last-child { border-bottom: none; }
.chart-card-title { font-size: 0.8rem; font-weight: 700; margin-bottom: 0.5rem; color: #4a5568; }
.chart-wrap { height: 220px; }
.empty-state {
  text-align: center; color: #aaa; padding: 3rem 1rem;
  background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.07);
}

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
