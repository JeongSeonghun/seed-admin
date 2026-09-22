<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/network'

interface Device {
  id: number; name: string; location: string | null
  status: 'online' | 'offline'; lastSeenAt: string | null
  bluetoothStatus: 'connected' | 'disconnected' | null
  lastReadingAt: string | null
}
interface Reading { id: number; type: string; value: number; createdAt: string }

const TYPE_LABEL: Record<string, string> = { temperature: '온도(°C)', humidity: '습도(%)', light: '조도' }
const TARGETS: { key: string; label: string }[] = [
  { key: 'led', label: 'LED' },
  { key: 'pump', label: '펌프' },
  { key: 'fan', label: '팬' },
]

const devices = ref<Device[]>([])
const selectedDevice = ref<Device | null>(null)
const latestReadings = ref<Reading[]>([])
const loading = ref(true)
const sendingTarget = ref<string | null>(null)

const READING_STALE_MS = 5 * 60 * 1000

function fmtDate(v: string | null) {
  if (!v) return '-'
  return new Date(v).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const readingAge = computed(() => {
  const v = selectedDevice.value?.lastReadingAt ?? null
  if (!v) return { text: '데이터 없음', stale: true }
  const ageMs = Date.now() - new Date(v).getTime()
  return { text: `${fmtDate(v)} (${Math.round(ageMs / 60000)}분 전)`, stale: ageMs > READING_STALE_MS }
})

async function loadDevices() {
  loading.value = true
  try {
    const res = await api.getSmartfarmDevices()
    devices.value = res.data
    const first = devices.value[0]
    if (!selectedDevice.value && first) selectDevice(first)
  } finally {
    loading.value = false
  }
}

async function selectDevice(d: Device) {
  selectedDevice.value = d
  await loadReadings()
}

async function loadReadings() {
  if (!selectedDevice.value) return
  const res = await api.getSmartfarmReadings(selectedDevice.value.id)
  const seen = new Set<string>()
  latestReadings.value = (res.data as Reading[]).filter((r) => {
    if (seen.has(r.type)) return false
    seen.add(r.type)
    return true
  })
}

async function refresh() {
  await loadDevices()
  await loadReadings()
}

async function sendCommand(target: string, action: 'on' | 'off') {
  if (!selectedDevice.value) return
  sendingTarget.value = target
  try {
    await api.createSmartfarmCommand(selectedDevice.value.id, { target, action })
  } catch {
    alert('명령 전송에 실패했습니다.')
  } finally {
    sendingTarget.value = null
  }
}

onMounted(refresh)
</script>

<template>
  <div class="sf">
    <div v-if="loading && !devices.length" class="empty">불러오는 중...</div>

    <template v-else-if="devices.length">
      <div v-if="devices.length > 1" class="device-chips">
        <button
          v-for="d in devices" :key="d.id"
          class="chip" :class="{ active: selectedDevice?.id === d.id }"
          @click="selectDevice(d)"
        >
          <span class="dot" :class="d.status" />{{ d.name }}
        </button>
      </div>

      <div v-if="selectedDevice" class="card status-card">
        <div class="status-row">
          <span class="name">{{ selectedDevice.name }}</span>
          <span class="badge" :class="selectedDevice.status">{{ selectedDevice.status === 'online' ? '온라인' : '오프라인' }}</span>
        </div>
        <p v-if="selectedDevice.location" class="loc">{{ selectedDevice.location }}</p>
        <p class="age" :class="{ stale: readingAge.stale }">마지막 센서값: {{ readingAge.text }}</p>
      </div>

      <div class="card">
        <div class="card-title">센서 값</div>
        <div v-if="!latestReadings.length" class="empty small">아직 수신된 센서 데이터가 없습니다.</div>
        <div v-else class="reading-grid">
          <div v-for="r in latestReadings" :key="r.type" class="reading">
            <div class="reading-label">{{ TYPE_LABEL[r.type] ?? r.type }}</div>
            <div class="reading-value">{{ r.value }}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">제어</div>
        <div class="control-grid">
          <div v-for="t in TARGETS" :key="t.key" class="control">
            <span class="control-label">{{ t.label }}</span>
            <div class="control-btns">
              <button class="btn on" :disabled="sendingTarget === t.key" @click="sendCommand(t.key, 'on')">ON</button>
              <button class="btn off" :disabled="sendingTarget === t.key" @click="sendCommand(t.key, 'off')">OFF</button>
            </div>
          </div>
        </div>
      </div>

      <button class="refresh-btn" @click="refresh">새로고침</button>
    </template>

    <div v-else class="empty">등록된 디바이스가 없습니다.</div>
  </div>
</template>

<style scoped>
.sf { display: flex; flex-direction: column; gap: 0.9rem; }

.empty { text-align: center; color: #8b91b5; padding: 2.5rem 0; font-size: 0.9rem; }
.empty.small { padding: 1rem 0; }

.device-chips { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.2rem; }
.chip {
  display: flex; align-items: center; gap: 0.4rem;
  flex-shrink: 0;
  padding: 0.5rem 0.9rem;
  border-radius: 99px;
  border: 1px solid #dfe3ee;
  background: white;
  color: #444;
  font-size: 0.85rem;
  white-space: nowrap;
}
.chip.active { border-color: #4a6cf7; color: #4a6cf7; font-weight: 600; }

.dot { width: 7px; height: 7px; border-radius: 50%; background: #ccc; }
.dot.online { background: #48bb78; }
.dot.offline { background: #e53e3e; }

.card {
  background: white;
  border-radius: 12px;
  padding: 1.1rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.status-row { display: flex; justify-content: space-between; align-items: center; }
.name { font-weight: 700; font-size: 1.05rem; color: #1a1a2e; }
.badge { font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 99px; font-weight: 600; }
.badge.online { background: #e9fbf1; color: #2f9e5c; }
.badge.offline { background: #fdecec; color: #c53030; }
.loc { margin: 0.3rem 0 0; font-size: 0.82rem; color: #8b91b5; }
.age { margin: 0.5rem 0 0; font-size: 0.78rem; color: #8b91b5; }
.age.stale { color: #e53e3e; }

.card-title { font-size: 0.78rem; font-weight: 700; color: #4a6cf7; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.8rem; }

.reading-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0.7rem; }
.reading { text-align: center; padding: 0.7rem 0.4rem; background: #f6f7fb; border-radius: 8px; }
.reading-label { font-size: 0.72rem; color: #8b91b5; margin-bottom: 0.3rem; }
.reading-value { font-size: 1.25rem; font-weight: 700; color: #1a1a2e; }

.control-grid { display: flex; flex-direction: column; gap: 0.7rem; }
.control { display: flex; align-items: center; justify-content: space-between; }
.control-label { font-size: 0.92rem; color: #1a1a2e; font-weight: 600; }
.control-btns { display: flex; gap: 0.5rem; }
.btn { padding: 0.45rem 1rem; border-radius: 6px; border: none; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.on { background: #4a6cf7; color: white; }
.btn.off { background: #eceef5; color: #444; }

.refresh-btn {
  padding: 0.7rem;
  border-radius: 8px;
  border: 1px solid #dfe3ee;
  background: white;
  color: #444;
  font-size: 0.88rem;
  cursor: pointer;
}
</style>
