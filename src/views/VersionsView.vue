<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'

interface AppVersion {
  id: number
  platform: string
  service: string
  latestVersion: string
  latestVersionCode: number
  minRequiredVersion: string
  minRequiredVersionCode: number
  releaseNotes: string | null
  isActive: boolean
  updatedAt: string
}

interface Service { id: number; name: string; label: string }

const versions = ref<AppVersion[]>([])
const services = ref<Service[]>([])
const loading = ref(true)
const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const form = ref({
  id: 0,
  platform: 'ANDROID',
  service: '',
  latestVersion: '',
  latestVersionCode: 0,
  minRequiredVersion: '',
  minRequiredVersionCode: 0,
  releaseNotes: '',
  isActive: true,
})

async function load() {
  loading.value = true
  try {
    const [v, s] = await Promise.all([api.getVersions(), api.getServices()])
    versions.value = v.data
    services.value = s.data
  } finally {
    loading.value = false
  }
}
onMounted(load)

function openCreate() {
  isEdit.value = false
  form.value = { id: 0, platform: 'ANDROID', service: '', latestVersion: '', latestVersionCode: 0, minRequiredVersion: '', minRequiredVersionCode: 0, releaseNotes: '', isActive: true }
  showModal.value = true
}

function openEdit(v: AppVersion) {
  isEdit.value = true
  form.value = { id: v.id, platform: v.platform, service: v.service, latestVersion: v.latestVersion, latestVersionCode: v.latestVersionCode, minRequiredVersion: v.minRequiredVersion, minRequiredVersionCode: v.minRequiredVersionCode, releaseNotes: v.releaseNotes ?? '', isActive: v.isActive }
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    const body = {
      platform: form.value.platform,
      service: form.value.service,
      latestVersion: form.value.latestVersion,
      latestVersionCode: form.value.latestVersionCode,
      minRequiredVersion: form.value.minRequiredVersion,
      minRequiredVersionCode: form.value.minRequiredVersionCode,
      releaseNotes: form.value.releaseNotes || undefined,
      isActive: form.value.isActive,
    }
    if (isEdit.value) await api.updateVersion(form.value.id, body)
    else await api.createVersion(body)
    showModal.value = false
    await load()
  } catch (e: any) { alert(e?.response?.data?.message ?? '저장 실패') }
  finally { saving.value = false }
}

async function remove(v: AppVersion) {
  if (!confirm(`${v.platform} 버전 정보를 삭제하시겠습니까?`)) return
  await api.deleteVersion(v.id)
  await load()
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div>
    <div class="toolbar">
      <button class="btn-primary" @click="openCreate">+ 버전 추가</button>
    </div>

    <div v-if="loading" class="loading">불러오는 중...</div>
    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>서비스</th>
            <th>플랫폼</th>
            <th>최신 버전</th>
            <th>최소 필수 버전 (강제)</th>
            <th>릴리즈 노트</th>
            <th>활성</th>
            <th>수정일</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in versions" :key="v.id">
            <td class="service-cell">{{ v.service }}</td>
            <td>
              <span class="badge" :class="v.platform === 'ANDROID' ? 'badge-green' : 'badge-blue'">
                {{ v.platform }}
              </span>
            </td>
            <td class="version-num">
              {{ v.latestVersion }}
              <span class="code-label"># {{ v.latestVersionCode }}</span>
            </td>
            <td class="version-num">
              {{ v.minRequiredVersion }}
              <span class="code-label"># {{ v.minRequiredVersionCode }}</span>
              <span class="force-label">강제</span>
            </td>
            <td class="notes">{{ v.releaseNotes || '-' }}</td>
            <td>
              <span class="badge" :class="v.isActive ? 'badge-active' : 'badge-gray'">
                {{ v.isActive ? '활성' : '비활성' }}
              </span>
            </td>
            <td class="date">{{ fmtDate(v.updatedAt) }}</td>
            <td>
              <button class="btn-sm" @click="openEdit(v)">편집</button>
              <button class="btn-sm btn-danger" @click="remove(v)">삭제</button>
            </td>
          </tr>
          <tr v-if="!versions.length">
            <td colspan="8" class="empty">버전 정보가 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="hint-box">
      <strong>앱 버전 체크 API</strong>
      <code>GET /api/version?platform=ANDROID&amp;versionCode=105</code>
      <p>앱 시작 시 호출 → <code>forceUpdate: true</code>이면 강제 업데이트 (versionCode &lt; minRequiredVersionCode), <code>updateAvailable: true</code>이면 선택 업데이트 안내</p>
    </div>

    <div v-if="showModal" class="overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ isEdit ? '버전 편집' : '버전 추가' }}</h3>

        <div class="form-row">
          <div class="form-col">
            <label>서비스 *</label>
            <select v-model="form.service" :disabled="isEdit">
              <option value="">선택</option>
              <option v-for="s in services" :key="s.id" :value="s.name">{{ s.label }} ({{ s.name }})</option>
            </select>
          </div>
          <div class="form-col">
            <label>플랫폼</label>
            <select v-model="form.platform" :disabled="isEdit">
              <option value="ANDROID">ANDROID</option>
              <option value="IOS">IOS</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-col">
            <label>최신 버전 *</label>
            <input v-model="form.latestVersion" type="text" placeholder="1.2.0" />
          </div>
          <div class="form-col">
            <label>최신 versionCode *</label>
            <input v-model.number="form.latestVersionCode" type="number" min="1" placeholder="120" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-col">
            <label>최소 필수 버전 * <span class="hint">(미만 강제 업데이트)</span></label>
            <input v-model="form.minRequiredVersion" type="text" placeholder="1.0.0" />
          </div>
          <div class="form-col">
            <label>최소 필수 versionCode *</label>
            <input v-model.number="form.minRequiredVersionCode" type="number" min="1" placeholder="100" />
          </div>
        </div>

        <label>릴리즈 노트</label>
        <textarea v-model="form.releaseNotes" rows="4" placeholder="변경 사항을 입력하세요." />

        <label class="check-label">
          <input type="checkbox" v-model="form.isActive" /> 활성
        </label>

        <div class="modal-actions">
          <button class="btn-ghost" @click="showModal = false">취소</button>
          <button class="btn-primary" :disabled="saving" @click="save">{{ saving ? '저장 중...' : '저장' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar { display: flex; justify-content: flex-end; margin-bottom: 1rem; }
.loading { color: #888; }
.table-wrap { background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; margin-bottom: 1rem; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.7rem 1rem; text-align: left; font-size: 0.875rem; }
th { background: #f7f8fa; font-weight: 600; color: #555; border-bottom: 1px solid #eee; }
td { border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
tr:last-child td { border-bottom: none; }
.version-num { font-family: monospace; font-size: 0.95rem; font-weight: 600; }
.code-label { margin-left: 0.35rem; font-size: 0.7rem; color: #888; font-weight: 400; }
.force-label { margin-left: 0.4rem; font-size: 0.65rem; background: #fff5f5; color: #c53030; padding: 0.1rem 0.35rem; border-radius: 3px; font-weight: 600; vertical-align: middle; }
.notes { max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #666; font-size: 0.82rem; }
.date { font-size: 0.8rem; color: #888; white-space: nowrap; }
.empty { text-align: center; color: #aaa; padding: 2rem; }
.badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600; }
.badge-green { background: #f0fff4; color: #276749; }
.badge-blue { background: #ebf4ff; color: #2b6cb0; }
.badge-active { background: #f0fff4; color: #276749; }
.badge-gray { background: #f0f0f0; color: #888; }
.hint-box { background: #f7f8fa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.9rem 1.1rem; font-size: 0.82rem; color: #555; }
.hint-box strong { display: block; margin-bottom: 0.35rem; color: #333; }
.hint-box code { display: block; background: #1a1a2e; color: #7ec8e3; padding: 0.4rem 0.75rem; border-radius: 5px; margin: 0.35rem 0; font-size: 0.82rem; }
.hint-box p { margin: 0.35rem 0 0; }
.btn-primary { padding: 0.45rem 1rem; background: #4a6cf7; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
.btn-primary:hover { background: #3a5ce5; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost { padding: 0.45rem 1rem; background: transparent; border: 1px solid #ccc; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
.btn-sm { padding: 0.25rem 0.65rem; background: #f0f2f5; border: 1px solid #e2e8f0; border-radius: 4px; cursor: pointer; font-size: 0.8rem; margin-right: 4px; }
.btn-sm:hover { background: #e2e8f0; }
.btn-danger { color: #e53e3e; border-color: #fed7d7; }
.btn-danger:hover { background: #fff5f5; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 1.75rem 2rem; width: 480px; max-width: 95vw; display: flex; flex-direction: column; gap: 0.5rem; }
.modal h3 { font-size: 1.1rem; color: #1a1a2e; margin-bottom: 0.5rem; }
.form-row { display: flex; gap: 0.75rem; }
.form-col { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; }
.modal label { font-size: 0.8rem; font-weight: 600; color: #555; margin-top: 0.3rem; }
.modal input[type="text"], .modal select, .modal textarea { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; box-sizing: border-box; }
.modal select:disabled { background: #f7f8fa; color: #888; }
.modal textarea { resize: vertical; font-family: inherit; }
.hint { font-weight: 400; color: #aaa; font-size: 0.75rem; }
.check-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; cursor: pointer; font-weight: normal !important; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
</style>
