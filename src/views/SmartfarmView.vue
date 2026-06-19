<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import api from '@/network'

// ── 타입 ────────────────────────────────────────────────────────
interface Device {
  id: number; name: string; location: string | null
  apiKey: string; status: 'online' | 'offline'; lastSeenAt: string | null; createdAt: string
}
interface Reading {
  id: number; type: string; value: number; createdAt: string
}
interface Command {
  id: number; target: string; action: string; status: string
  source: string; ruleId: number | null; createdAt: string; executedAt: string | null
}
interface Rule {
  id: number; name: string | null; sensorType: string; operator: string
  threshold: number; target: string; action: string
  cooldownMinutes: number; enabled: boolean; createdAt: string
}

// ── 상태 ────────────────────────────────────────────────────────
const devices = ref<Device[]>([])
const selectedDevice = ref<Device | null>(null)
const activeTab = ref<'readings' | 'commands' | 'rules'>('readings')
const loading = ref(true)

const readings = ref<Reading[]>([])
const commands = ref<Command[]>([])
const rules = ref<Rule[]>([])
const tabLoading = ref(false)

// 디바이스 생성 모달
const showDeviceModal = ref(false)
const savingDevice = ref(false)
const deviceForm = ref({ name: '', location: '' })

// 명령 전송 폼
const cmdForm = ref({ target: 'led', action: 'on' })
const sendingCmd = ref(false)

// 규칙 생성 모달
const showRuleModal = ref(false)
const savingRule = ref(false)
const ruleForm = ref({
  name: '', sensorType: 'temperature', operator: 'gt',
  threshold: 30, target: 'fan', action: 'on', cooldownMinutes: 10,
})

// ── 초기 로드 ────────────────────────────────────────────────────
async function loadDevices() {
  loading.value = true
  try {
    const res = await api.getSmartfarmDevices()
    devices.value = res.data
    if (devices.value.length && !selectedDevice.value) {
      selectDevice(devices.value[0])
    }
  } catch {
    alert('디바이스 목록을 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

onMounted(loadDevices)

// ── 디바이스 선택 ─────────────────────────────────────────────────
function selectDevice(d: Device) {
  selectedDevice.value = d
  activeTab.value = 'readings'
}

watch([selectedDevice, activeTab], () => {
  if (!selectedDevice.value) return
  loadTab()
})

async function loadTab() {
  const d = selectedDevice.value!
  tabLoading.value = true
  try {
    if (activeTab.value === 'readings') {
      const res = await api.getSmartfarmReadings(d.id)
      readings.value = res.data
    } else if (activeTab.value === 'commands') {
      const res = await api.getSmartfarmCommands(d.id)
      commands.value = res.data
    } else {
      const res = await api.getSmartfarmRules(d.id)
      rules.value = res.data
    }
  } catch {
    alert('데이터를 불러오지 못했습니다.')
  } finally {
    tabLoading.value = false
  }
}

// ── 디바이스 생성 ────────────────────────────────────────────────
async function saveDevice() {
  savingDevice.value = true
  try {
    const body = { name: deviceForm.value.name, location: deviceForm.value.location || undefined }
    await api.createSmartfarmDevice(body)
    showDeviceModal.value = false
    deviceForm.value = { name: '', location: '' }
    await loadDevices()
  } catch (e: any) {
    alert(e?.response?.data?.message ?? '생성에 실패했습니다.')
  } finally {
    savingDevice.value = false
  }
}

// ── 명령 전송 ─────────────────────────────────────────────────────
async function sendCommand() {
  if (!selectedDevice.value) return
  sendingCmd.value = true
  try {
    await api.createSmartfarmCommand(selectedDevice.value.id, cmdForm.value)
    const res = await api.getSmartfarmCommands(selectedDevice.value.id)
    commands.value = res.data
  } catch (e: any) {
    alert(e?.response?.data?.message ?? '명령 전송에 실패했습니다.')
  } finally {
    sendingCmd.value = false
  }
}

// ── 규칙 저장 ─────────────────────────────────────────────────────
async function saveRule() {
  if (!selectedDevice.value) return
  savingRule.value = true
  try {
    await api.createSmartfarmRule(selectedDevice.value.id, {
      name: ruleForm.value.name || undefined,
      sensorType: ruleForm.value.sensorType,
      operator: ruleForm.value.operator,
      threshold: ruleForm.value.threshold,
      target: ruleForm.value.target,
      action: ruleForm.value.action,
      cooldownMinutes: ruleForm.value.cooldownMinutes,
    })
    showRuleModal.value = false
    const res = await api.getSmartfarmRules(selectedDevice.value.id)
    rules.value = res.data
  } catch (e: any) {
    alert(e?.response?.data?.message ?? '규칙 저장에 실패했습니다.')
  } finally {
    savingRule.value = false
  }
}

async function toggleRule(rule: Rule) {
  try {
    await api.updateSmartfarmRule(rule.id, { enabled: !rule.enabled })
    rule.enabled = !rule.enabled
  } catch {
    alert('업데이트에 실패했습니다.')
  }
}

async function deleteRule(rule: Rule) {
  if (!confirm(`"${rule.name ?? '규칙'}"을 삭제하시겠습니까?`)) return
  try {
    await api.deleteSmartfarmRule(rule.id)
    rules.value = rules.value.filter(r => r.id !== rule.id)
  } catch {
    alert('삭제에 실패했습니다.')
  }
}

// ── 포맷 유틸 ─────────────────────────────────────────────────────
function fmtDate(v: string | null) {
  if (!v) return '-'
  return new Date(v).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const OPERATOR_LABEL: Record<string, string> = { lt: '<', gt: '>', lte: '≤', gte: '≥' }
const STATUS_COLOR: Record<string, string> = {
  pending: '#ed8936', sent: '#4a6cf7', done: '#48bb78', failed: '#e53e3e',
}
const TYPE_LABEL: Record<string, string> = { temperature: '온도(°C)', humidity: '습도(%)', light: '조도' }
</script>

<template>
  <div class="smartfarm">
    <!-- 디바이스 헤더 -->
    <div class="device-bar">
      <div class="device-tabs">
        <button
          v-for="d in devices" :key="d.id"
          class="device-tab"
          :class="{ active: selectedDevice?.id === d.id }"
          @click="selectDevice(d)"
        >
          <span class="dot" :class="d.status" />
          {{ d.name }}
        </button>
        <div v-if="loading && !devices.length" class="loading-sm">불러오는 중...</div>
      </div>
      <button class="btn-primary" @click="showDeviceModal = true">+ 디바이스 추가</button>
    </div>

    <!-- 선택된 디바이스 정보 -->
    <div v-if="selectedDevice" class="device-info-bar">
      <span class="di-name">{{ selectedDevice.name }}</span>
      <span v-if="selectedDevice.location" class="di-loc">{{ selectedDevice.location }}</span>
      <span class="di-status" :class="selectedDevice.status">
        {{ selectedDevice.status === 'online' ? '온라인' : '오프라인' }}
      </span>
      <span class="di-seen">마지막 확인: {{ fmtDate(selectedDevice.lastSeenAt) }}</span>
      <span class="di-key">API Key: <code>{{ selectedDevice.apiKey }}</code></span>
    </div>

    <div v-if="!selectedDevice && !loading" class="empty-state">
      디바이스를 추가하고 선택해주세요.
    </div>

    <!-- 탭 패널 -->
    <div v-if="selectedDevice" class="panel">
      <div class="tab-bar">
        <button class="tab" :class="{ active: activeTab === 'readings' }" @click="activeTab = 'readings'">센서 데이터</button>
        <button class="tab" :class="{ active: activeTab === 'commands' }" @click="activeTab = 'commands'">제어 명령</button>
        <button class="tab" :class="{ active: activeTab === 'rules' }" @click="activeTab = 'rules'">자동 규칙</button>
        <button class="btn-ghost tab-refresh" @click="loadTab">새로고침</button>
      </div>

      <div v-if="tabLoading" class="loading-sm" style="padding:1.5rem">불러오는 중...</div>

      <!-- 센서 데이터 탭 -->
      <div v-else-if="activeTab === 'readings'">
        <table class="tbl" v-if="readings.length">
          <thead>
            <tr><th>시각</th><th>타입</th><th>값</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in readings" :key="r.id">
              <td>{{ fmtDate(r.createdAt) }}</td>
              <td>{{ TYPE_LABEL[r.type] ?? r.type }}</td>
              <td class="val">{{ r.value }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">센서 데이터가 없습니다.</div>
      </div>

      <!-- 제어 명령 탭 -->
      <div v-else-if="activeTab === 'commands'">
        <div class="cmd-form">
          <select v-model="cmdForm.target" class="select">
            <option value="led">LED</option>
            <option value="pump">펌프</option>
            <option value="fan">팬</option>
          </select>
          <select v-model="cmdForm.action" class="select">
            <option value="on">ON</option>
            <option value="off">OFF</option>
          </select>
          <button class="btn-primary" :disabled="sendingCmd" @click="sendCommand">
            {{ sendingCmd ? '전송 중...' : '명령 전송' }}
          </button>
        </div>
        <table class="tbl" v-if="commands.length">
          <thead>
            <tr><th>시각</th><th>대상</th><th>동작</th><th>상태</th><th>출처</th><th>실행시각</th></tr>
          </thead>
          <tbody>
            <tr v-for="c in commands" :key="c.id">
              <td>{{ fmtDate(c.createdAt) }}</td>
              <td>{{ c.target.toUpperCase() }}</td>
              <td>{{ c.action.toUpperCase() }}</td>
              <td><span class="badge" :style="{ background: STATUS_COLOR[c.status] }">{{ c.status }}</span></td>
              <td>{{ c.source }}</td>
              <td>{{ fmtDate(c.executedAt) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">명령 내역이 없습니다.</div>
      </div>

      <!-- 자동 규칙 탭 -->
      <div v-else-if="activeTab === 'rules'">
        <div class="toolbar">
          <button class="btn-primary" @click="showRuleModal = true">+ 규칙 추가</button>
        </div>
        <table class="tbl" v-if="rules.length">
          <thead>
            <tr><th>이름</th><th>조건</th><th>동작</th><th>쿨다운</th><th>활성</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="r in rules" :key="r.id">
              <td>{{ r.name ?? '-' }}</td>
              <td>{{ TYPE_LABEL[r.sensorType] ?? r.sensorType }} {{ OPERATOR_LABEL[r.operator] }} {{ r.threshold }}</td>
              <td>{{ r.target.toUpperCase() }} {{ r.action.toUpperCase() }}</td>
              <td>{{ r.cooldownMinutes }}분</td>
              <td>
                <button class="toggle" :class="{ on: r.enabled }" @click="toggleRule(r)">
                  {{ r.enabled ? 'ON' : 'OFF' }}
                </button>
              </td>
              <td>
                <button class="btn-xs btn-danger" @click="deleteRule(r)">삭제</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">등록된 규칙이 없습니다.</div>
      </div>
    </div>

    <!-- 디바이스 추가 모달 -->
    <div v-if="showDeviceModal" class="overlay" @click.self="showDeviceModal = false">
      <div class="modal">
        <h3>디바이스 추가</h3>
        <label>이름 *</label>
        <input v-model="deviceForm.name" type="text" placeholder="화분-거실" />
        <label>위치 (선택)</label>
        <input v-model="deviceForm.location" type="text" placeholder="거실 창가" />
        <p class="modal-hint">저장 후 발급된 API Key를 Pi5 환경변수에 설정하세요.</p>
        <div class="modal-actions">
          <button class="btn-ghost" @click="showDeviceModal = false">취소</button>
          <button class="btn-primary" :disabled="savingDevice || !deviceForm.name" @click="saveDevice">
            {{ savingDevice ? '저장 중...' : '저장' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 규칙 추가 모달 -->
    <div v-if="showRuleModal" class="overlay" @click.self="showRuleModal = false">
      <div class="modal">
        <h3>자동 규칙 추가</h3>
        <label>규칙 이름 (선택)</label>
        <input v-model="ruleForm.name" type="text" placeholder="토양 건조 시 펌프 가동" />
        <label>센서 타입</label>
        <select v-model="ruleForm.sensorType" class="select full">
          <option value="temperature">온도</option>
          <option value="humidity">습도</option>
          <option value="light">조도</option>
        </select>
        <div class="row2">
          <div>
            <label>조건</label>
            <select v-model="ruleForm.operator" class="select full">
              <option value="lt">미만 (&lt;)</option>
              <option value="lte">이하 (≤)</option>
              <option value="gt">초과 (&gt;)</option>
              <option value="gte">이상 (≥)</option>
            </select>
          </div>
          <div>
            <label>임계값</label>
            <input v-model.number="ruleForm.threshold" type="number" class="full" />
          </div>
        </div>
        <div class="row2">
          <div>
            <label>제어 대상</label>
            <select v-model="ruleForm.target" class="select full">
              <option value="led">LED</option>
              <option value="pump">펌프</option>
              <option value="fan">팬</option>
            </select>
          </div>
          <div>
            <label>동작</label>
            <select v-model="ruleForm.action" class="select full">
              <option value="on">ON</option>
              <option value="off">OFF</option>
            </select>
          </div>
        </div>
        <label>쿨다운 (분)</label>
        <input v-model.number="ruleForm.cooldownMinutes" type="number" min="1" />
        <div class="modal-actions">
          <button class="btn-ghost" @click="showRuleModal = false">취소</button>
          <button class="btn-primary" :disabled="savingRule" @click="saveRule">
            {{ savingRule ? '저장 중...' : '저장' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.smartfarm { display: flex; flex-direction: column; gap: 1rem; }

/* 디바이스 바 */
.device-bar {
  display: flex; justify-content: space-between; align-items: center;
  background: white; border-radius: 10px; padding: 0.75rem 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.device-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.device-tab {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.4rem 0.85rem; border-radius: 20px; border: 1px solid #e2e8f0;
  background: #f7f8fa; cursor: pointer; font-size: 0.85rem; color: #555;
}
.device-tab.active { background: #4a6cf7; color: white; border-color: #4a6cf7; }
.dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: #ccc; }
.dot.online { background: #48bb78; }
.dot.offline { background: #e53e3e; }

/* 디바이스 정보 */
.device-info-bar {
  display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
  background: white; border-radius: 10px; padding: 0.65rem 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06); font-size: 0.85rem;
}
.di-name { font-weight: 700; color: #1a1a2e; font-size: 0.95rem; }
.di-loc { color: #888; }
.di-status { padding: 0.15rem 0.5rem; border-radius: 10px; font-size: 0.75rem; font-weight: 600; }
.di-status.online { background: #f0fff4; color: #276749; }
.di-status.offline { background: #fff5f5; color: #c53030; }
.di-seen { color: #aaa; }
.di-key { color: #888; margin-left: auto; font-size: 0.78rem; }
.di-key code { background: #f0f2f5; padding: 0.1rem 0.4rem; border-radius: 4px; font-family: monospace; color: #555; }

/* 패널 */
.panel {
  background: white; border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden;
}
.tab-bar {
  display: flex; border-bottom: 1px solid #f0f2f5; padding: 0 1rem;
}
.tab {
  padding: 0.75rem 1rem; border: none; background: none; cursor: pointer;
  font-size: 0.875rem; color: #888; border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.tab.active { color: #4a6cf7; border-bottom-color: #4a6cf7; font-weight: 600; }
.tab-refresh { margin-left: auto; font-size: 0.8rem; padding: 0.4rem 0.75rem; margin-top: 0.3rem; margin-bottom: 0.3rem; }

/* 테이블 */
.tbl { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.tbl th { padding: 0.65rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #888; background: #fafbfc; border-bottom: 1px solid #f0f2f5; }
.tbl td { padding: 0.6rem 1rem; border-bottom: 1px solid #f7f8fa; color: #333; }
.tbl tr:last-child td { border-bottom: none; }
.val { font-weight: 600; color: #1a1a2e; font-family: monospace; }

.badge {
  display: inline-block; padding: 0.15rem 0.5rem;
  border-radius: 8px; font-size: 0.72rem; font-weight: 700; color: white;
}

/* 명령 폼 */
.cmd-form {
  display: flex; gap: 0.5rem; align-items: center;
  padding: 0.75rem 1rem; border-bottom: 1px solid #f0f2f5;
}
.select { padding: 0.45rem 0.6rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.85rem; background: white; }
.select.full { width: 100%; }

/* 규칙 */
.toolbar { padding: 0.75rem 1rem; border-bottom: 1px solid #f0f2f5; display: flex; justify-content: flex-end; }
.toggle {
  padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700;
  border: none; cursor: pointer; background: #e2e8f0; color: #888;
}
.toggle.on { background: #48bb78; color: white; }

/* 공통 */
.empty-state { text-align: center; color: #aaa; padding: 3rem 1rem; }
.loading-sm { color: #888; font-size: 0.875rem; }

.btn-primary {
  padding: 0.45rem 1rem; background: #4a6cf7; color: white;
  border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem;
}
.btn-primary:hover { background: #3a5ce5; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost {
  padding: 0.45rem 1rem; background: transparent;
  border: 1px solid #ccc; border-radius: 6px; cursor: pointer; font-size: 0.875rem;
}
.btn-xs {
  padding: 0.2rem 0.5rem; border: 1px solid #e2e8f0;
  background: #f7f8fa; border-radius: 4px; cursor: pointer; font-size: 0.75rem;
}
.btn-xs.btn-danger { color: #e53e3e; border-color: #fed7d7; }
.btn-xs.btn-danger:hover { background: #fff5f5; }

/* 모달 */
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal {
  background: white; border-radius: 12px; padding: 1.75rem 2rem;
  width: 440px; max-width: 95vw; display: flex; flex-direction: column; gap: 0.55rem;
}
.modal h3 { margin-bottom: 0.5rem; font-size: 1.1rem; color: #1a1a2e; }
.modal label { font-size: 0.8rem; font-weight: 600; color: #555; margin-top: 0.3rem; }
.modal input, .modal .select { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; box-sizing: border-box; }
.modal-hint { font-size: 0.78rem; color: #888; margin-top: 0.25rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.full { width: 100%; box-sizing: border-box; }
</style>
