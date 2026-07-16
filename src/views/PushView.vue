<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'

interface PushLog {
  id: number; title: string; body: string; appId: string | null
  targetType: 'users' | 'broadcast'; targetUserIds: number[] | null
  successCount: number; failCount: number; sentAt: string
}

interface DeviceToken {
  id: number; userId: number; appId: string; platform: string
  token: string; createdAt: string; updatedAt: string
}

const logs = ref<PushLog[]>([])
const tokens = ref<DeviceToken[]>([])
const loading = ref(false)
const sending = ref(false)
const tab = ref<'send' | 'logs' | 'tokens'>('send')
const tokenAppId = ref('')

const form = ref({
  type: 'broadcast' as 'broadcast' | 'users' | 'event',
  userIdsText: '',
  title: '',
  body: '',
  appId: 'word-game',
})

onMounted(loadLogs)

async function loadLogs() {
  loading.value = true
  try { logs.value = (await api.adminGetPushLogs()).data ?? [] }
  catch { logs.value = [] }
  finally { loading.value = false }
}

async function loadTokens() {
  loading.value = true
  try { tokens.value = (await api.adminGetPushTokens(tokenAppId.value || undefined)).data ?? [] }
  catch { tokens.value = [] }
  finally { loading.value = false }
}

function onTypeChange() {
  if (form.value.type === 'event' && !form.value.appId) form.value.appId = 'word-game'
}

function switchTab(t: 'send' | 'logs' | 'tokens') {
  tab.value = t
  if (t === 'logs') loadLogs()
  if (t === 'tokens') loadTokens()
}

async function send() {
  if (!form.value.title || !form.value.body) { alert('제목과 내용을 입력해주세요.'); return }
  if (form.value.type === 'event' && !form.value.appId) { alert('이벤트/공지 발송은 앱을 지정해야 합니다.'); return }
  sending.value = true
  try {
    if (form.value.type === 'broadcast') {
      await api.adminPushBroadcast({ title: form.value.title, body: form.value.body, appId: form.value.appId || undefined })
    } else if (form.value.type === 'event') {
      await api.adminPushBroadcastEvent({ title: form.value.title, body: form.value.body, appId: form.value.appId })
    } else {
      const userIds = form.value.userIdsText.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0)
      if (!userIds.length) { alert('유저 ID를 입력해주세요.'); return }
      await api.adminPushSend({ userIds, title: form.value.title, body: form.value.body, appId: form.value.appId || undefined })
    }
    alert('발송되었습니다.')
    form.value.title = ''
    form.value.body = ''
    form.value.userIdsText = ''
    await loadLogs()
    tab.value = 'logs'
  } catch (e: any) { alert(e?.response?.data?.message ?? '발송 실패') }
  finally { sending.value = false }
}

function truncateToken(token: string) {
  return token.length > 24 ? token.slice(0, 12) + '...' + token.slice(-12) : token
}
</script>

<template>
  <div>
    <div class="tabs">
      <button :class="['tab', { active: tab === 'send' }]" @click="switchTab('send')">푸시 발송</button>
      <button :class="['tab', { active: tab === 'logs' }]" @click="switchTab('logs')">발송 이력</button>
      <button :class="['tab', { active: tab === 'tokens' }]" @click="switchTab('tokens')">등록 토큰</button>
    </div>

    <!-- 발송 폼 -->
    <div v-if="tab === 'send'" class="card">
      <div class="form-row">
        <div class="form-col">
          <label>발송 대상</label>
          <select v-model="form.type" @change="onTypeChange">
            <option value="broadcast">전체 발송</option>
            <option value="users">특정 유저</option>
            <option value="event">이벤트·공지 (알림 설정 반영)</option>
          </select>
        </div>
        <div class="form-col">
          <label>앱 ID</label>
          <select v-model="form.appId">
            <option value="word-game">word-game</option>
            <option value="smart-farm">smart-farm</option>
            <option v-if="form.type !== 'event'" value="">전체</option>
          </select>
        </div>
      </div>
      <div v-if="form.type === 'users'" class="form-group">
        <label>유저 ID <span class="hint">(쉼표 구분)</span></label>
        <input v-model="form.userIdsText" type="text" placeholder="예: 1, 2, 3" />
      </div>
      <div class="form-group">
        <label>제목 *</label>
        <input v-model="form.title" type="text" placeholder="푸시 제목" maxlength="200" />
      </div>
      <div class="form-group">
        <label>내용 *</label>
        <textarea v-model="form.body" placeholder="푸시 내용" maxlength="1000" rows="4" />
      </div>
      <div class="send-footer">
        <span class="target-desc">
          <template v-if="form.type === 'broadcast'">전체 유저에게 발송됩니다.</template>
          <template v-else-if="form.type === 'event'">선택한 앱에서 "이벤트·공지 알림"을 꺼둔 유저는 제외하고 발송됩니다.</template>
          <template v-else>입력한 유저 ID에게만 발송됩니다.</template>
        </span>
        <button class="btn-primary" :disabled="sending" @click="send">
          {{ sending ? '발송 중...' : '발송' }}
        </button>
      </div>
    </div>

    <!-- 발송 이력 -->
    <div v-if="tab === 'logs'">
      <div v-if="loading" class="loading">불러오는 중...</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr><th>시간</th><th>앱</th><th>대상</th><th>제목</th><th>성공</th><th>실패</th></tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td class="time-cell">{{ new Date(log.sentAt).toLocaleString('ko-KR') }}</td>
              <td><span class="badge badge-gray">{{ log.appId ?? '전체' }}</span></td>
              <td>
                <span v-if="log.targetType === 'broadcast'" class="badge badge-blue">전체</span>
                <span v-else class="badge badge-purple">{{ log.targetUserIds?.join(', ') }}</span>
              </td>
              <td class="title-cell">
                <div class="log-title">{{ log.title }}</div>
                <div class="log-body">{{ log.body }}</div>
              </td>
              <td class="count-ok">{{ log.successCount }}</td>
              <td class="count-fail">{{ log.failCount }}</td>
            </tr>
            <tr v-if="!logs.length"><td colspan="6" class="empty">발송 이력이 없습니다.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 등록 토큰 -->
    <div v-if="tab === 'tokens'">
      <div class="filter-bar">
        <select v-model="tokenAppId" @change="loadTokens" class="filter-select">
          <option value="">전체 앱</option>
          <option value="word-game">word-game</option>
          <option value="smart-farm">smart-farm</option>
        </select>
        <span class="token-count">총 {{ tokens.length }}개</span>
      </div>
      <div v-if="loading" class="loading">불러오는 중...</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr><th>유저 ID</th><th>앱</th><th>플랫폼</th><th>토큰</th><th>등록일</th><th>갱신일</th></tr>
          </thead>
          <tbody>
            <tr v-for="t in tokens" :key="t.id">
              <td><span class="badge badge-blue">{{ t.userId }}</span></td>
              <td><span class="badge badge-gray">{{ t.appId }}</span></td>
              <td><span class="badge" :class="t.platform === 'android' ? 'badge-green' : 'badge-purple'">{{ t.platform }}</span></td>
              <td class="token-cell" :title="t.token">{{ truncateToken(t.token) }}</td>
              <td class="time-cell">{{ new Date(t.createdAt).toLocaleString('ko-KR') }}</td>
              <td class="time-cell">{{ new Date(t.updatedAt).toLocaleString('ko-KR') }}</td>
            </tr>
            <tr v-if="!tokens.length"><td colspan="6" class="empty">등록된 토큰이 없습니다.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabs { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; }
.tab { padding: 0.45rem 1.1rem; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-size: 0.875rem; color: #555; }
.tab.active { background: #4a6cf7; color: white; border-color: #4a6cf7; }
.card { background: white; border-radius: 10px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 0.75rem; max-width: 600px; }
.form-row { display: flex; gap: 0.75rem; }
.form-col { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; }
.form-group { display: flex; flex-direction: column; gap: 0.3rem; }
label { font-size: 0.8rem; font-weight: 600; color: #555; }
input, select, textarea { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; box-sizing: border-box; font-family: inherit; }
textarea { resize: vertical; }
.hint { font-weight: 400; color: #aaa; }
.send-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; }
.target-desc { font-size: 0.8rem; color: #888; }
.btn-primary { padding: 0.5rem 1.25rem; background: #4a6cf7; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
.btn-primary:hover { background: #3a5ce5; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.filter-bar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
.filter-select { padding: 0.4rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; background: white; }
.token-count { font-size: 0.8rem; color: #888; }
.loading { color: #888; }
.table-wrap { background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.65rem 1rem; text-align: left; font-size: 0.875rem; }
th { background: #f7f8fa; font-weight: 600; color: #555; border-bottom: 1px solid #eee; }
td { border-bottom: 1px solid #f0f0f0; vertical-align: top; }
tr:last-child td { border-bottom: none; }
.time-cell { font-size: 0.8rem; color: #888; white-space: nowrap; }
.token-cell { font-size: 0.75rem; font-family: monospace; color: #555; }
.title-cell { max-width: 300px; }
.log-title { font-weight: 600; font-size: 0.875rem; }
.log-body { font-size: 0.8rem; color: #888; margin-top: 0.15rem; }
.count-ok { color: #276749; font-weight: 600; }
.count-fail { color: #c53030; font-weight: 600; }
.empty { text-align: center; color: #aaa; padding: 2rem; }
.badge { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600; }
.badge-blue { background: #ebf4ff; color: #2b6cb0; }
.badge-purple { background: #faf0ff; color: #805ad5; }
.badge-gray { background: #f0f0f0; color: #555; }
.badge-green { background: #f0fff4; color: #276749; }
</style>
