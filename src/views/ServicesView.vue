<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'

interface Service {
  id: number
  name: string
  label: string
}

const services = ref<Service[]>([])
const loading = ref(true)
const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const form = ref({ id: 0, name: '', label: '' })
const nameError = ref('')

async function load() {
  loading.value = true
  try {
    const res = await api.getServices()
    services.value = res.data
  } finally {
    loading.value = false
  }
}
onMounted(load)

function openCreate() {
  isEdit.value = false
  form.value = { id: 0, name: '', label: '' }
  nameError.value = ''
  showModal.value = true
}

function openEdit(s: Service) {
  isEdit.value = true
  form.value = { id: s.id, name: s.name, label: s.label }
  nameError.value = ''
  showModal.value = true
}

function validateName(v: string) {
  if (!v) return '필수 항목입니다.'
  if (!/^[a-z][a-z0-9_]*$/.test(v)) return '소문자 영문으로 시작하고, 소문자·숫자·_만 사용 가능합니다.'
  return ''
}

async function save() {
  if (!isEdit.value) {
    nameError.value = validateName(form.value.name)
    if (nameError.value) return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await api.updateService(form.value.id, { label: form.value.label })
    } else {
      await api.createService({ name: form.value.name, label: form.value.label })
    }
    showModal.value = false
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message ?? '저장 실패')
  } finally {
    saving.value = false
  }
}

async function remove(s: Service) {
  if (!confirm(`'${s.label}(${s.name})' 서비스를 삭제하시겠습니까?\n연결된 사용자가 있으면 삭제할 수 없습니다.`)) return
  try {
    await api.deleteService(s.id)
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message ?? '삭제 실패')
  }
}
</script>

<template>
  <div>
    <div class="toolbar">
      <button class="btn-primary" @click="openCreate">+ 서비스 추가</button>
    </div>

    <div v-if="loading" class="loading">불러오는 중...</div>
    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>식별자 (name)</th>
            <th>표시명 (label)</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in services" :key="s.id">
            <td class="id-cell">{{ s.id }}</td>
            <td><code class="name-code">{{ s.name }}</code></td>
            <td>{{ s.label }}</td>
            <td>
              <button class="btn-sm" @click="openEdit(s)">편집</button>
              <button class="btn-sm btn-danger" @click="remove(s)">삭제</button>
            </td>
          </tr>
          <tr v-if="!services.length">
            <td colspan="4" class="empty">등록된 서비스가 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="hint-box">
      <strong>서비스 식별자 규칙</strong>
      <p>소문자 영문으로 시작, 소문자·숫자·언더스코어만 사용 (예: <code>word_game</code>, <code>note</code>)</p>
      <p>앱 코드 및 API 호출에 사용되는 고정 식별자이므로 등록 후 변경 불가합니다.</p>
    </div>

    <div v-if="showModal" class="overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ isEdit ? '서비스 편집' : '서비스 추가' }}</h3>

        <div class="form-group">
          <label>식별자 (name) *</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="word_game"
            :disabled="isEdit"
            :class="{ 'input-error': nameError }"
            @input="nameError = ''"
          />
          <span v-if="nameError" class="error-msg">{{ nameError }}</span>
          <span v-if="isEdit" class="hint-text">식별자는 변경할 수 없습니다.</span>
        </div>

        <div class="form-group">
          <label>표시명 (label) *</label>
          <input v-model="form.label" type="text" placeholder="단어 게임" />
        </div>

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
.toolbar { display: flex; justify-content: flex-end; margin-bottom: 1rem; }
.loading { color: #888; }
.table-wrap { background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; margin-bottom: 1rem; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.7rem 1rem; text-align: left; font-size: 0.875rem; }
th { background: #f7f8fa; font-weight: 600; color: #555; border-bottom: 1px solid #eee; }
td { border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
tr:last-child td { border-bottom: none; }
.id-cell { color: #aaa; font-size: 0.8rem; width: 60px; }
.name-code { font-family: monospace; background: #f0f2f5; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.875rem; color: #2d3748; }
.empty { text-align: center; color: #aaa; padding: 2rem; }
.hint-box { background: #f7f8fa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.9rem 1.1rem; font-size: 0.82rem; color: #555; }
.hint-box strong { display: block; margin-bottom: 0.35rem; color: #333; }
.hint-box code { font-family: monospace; background: #e2e8f0; padding: 0.1rem 0.3rem; border-radius: 3px; }
.hint-box p { margin: 0.25rem 0; }
.btn-primary { padding: 0.45rem 1rem; background: #4a6cf7; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
.btn-primary:hover { background: #3a5ce5; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost { padding: 0.45rem 1rem; background: transparent; border: 1px solid #ccc; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
.btn-sm { padding: 0.25rem 0.65rem; background: #f0f2f5; border: 1px solid #e2e8f0; border-radius: 4px; cursor: pointer; font-size: 0.8rem; margin-right: 4px; }
.btn-sm:hover { background: #e2e8f0; }
.btn-danger { color: #e53e3e; border-color: #fed7d7; }
.btn-danger:hover { background: #fff5f5; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 1.75rem 2rem; width: 420px; max-width: 95vw; display: flex; flex-direction: column; gap: 0.5rem; }
.modal h3 { font-size: 1.1rem; color: #1a1a2e; margin-bottom: 0.5rem; }
.form-group { display: flex; flex-direction: column; gap: 0.3rem; }
.form-group label { font-size: 0.8rem; font-weight: 600; color: #555; }
.form-group input { padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; }
.form-group input:disabled { background: #f7f8fa; color: #888; }
.input-error { border-color: #e53e3e !important; }
.error-msg { font-size: 0.75rem; color: #e53e3e; }
.hint-text { font-size: 0.75rem; color: #aaa; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
</style>
