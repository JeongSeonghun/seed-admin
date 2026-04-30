<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'

interface Word {
  id: number
  english: string
  korean: string
  level: number
  partOfSpeech: string | null
  exampleEn: string | null
  exampleKo: string | null
  isActive: boolean
}

const PARTS = ['NOUN', 'VERB', 'ADJ', 'ADV', 'PRON', 'PREP', 'CONJ', 'OTHER']
const PART_LABELS: Record<string, string> = {
  NOUN: '명사', VERB: '동사', ADJ: '형용사', ADV: '부사',
  PRON: '대명사', PREP: '전치사', CONJ: '접속사', OTHER: '기타',
}

const words = ref<Word[]>([])
const loading = ref(true)
const filterLevel = ref<string>('')

const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const form = ref({ id: 0, english: '', korean: '', level: 1, partOfSpeech: '', exampleEn: '', exampleKo: '', isActive: true })

async function load() {
  loading.value = true
  try {
    const res = await api.getGameWords(filterLevel.value ? Number(filterLevel.value) : undefined)
    words.value = res.data
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openCreate() {
  isEdit.value = false
  form.value = { id: 0, english: '', korean: '', level: 1, partOfSpeech: '', exampleEn: '', exampleKo: '', isActive: true }
  showModal.value = true
}

function openEdit(w: Word) {
  isEdit.value = true
  form.value = { id: w.id, english: w.english, korean: w.korean, level: w.level, partOfSpeech: w.partOfSpeech ?? '', exampleEn: w.exampleEn ?? '', exampleKo: w.exampleKo ?? '', isActive: w.isActive }
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    const body = {
      english: form.value.english,
      korean: form.value.korean,
      level: form.value.level,
      partOfSpeech: form.value.partOfSpeech || undefined,
      exampleEn: form.value.exampleEn || undefined,
      exampleKo: form.value.exampleKo || undefined,
      isActive: form.value.isActive,
    }
    if (isEdit.value) await api.updateGameWord(form.value.id, body)
    else await api.createGameWord(body)
    showModal.value = false
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message ?? '저장 실패')
  } finally {
    saving.value = false
  }
}

async function remove(w: Word) {
  if (!confirm(`"${w.english}" 단어를 삭제하시겠습니까?`)) return
  await api.deleteGameWord(w.id)
  await load()
}
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="filters">
        <select v-model="filterLevel" @change="load">
          <option value="">전체 레벨</option>
          <option v-for="l in 10" :key="l" :value="String(l)">레벨 {{ l }}</option>
        </select>
        <span class="count">총 {{ words.length }}개</span>
      </div>
      <button class="btn-primary" @click="openCreate">+ 단어 추가</button>
    </div>

    <div v-if="loading" class="loading">불러오는 중...</div>
    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr><th>ID</th><th>영단어</th><th>뜻</th><th>레벨</th><th>품사</th><th>활성</th><th>액션</th></tr>
        </thead>
        <tbody>
          <tr v-for="w in words" :key="w.id">
            <td>{{ w.id }}</td>
            <td class="en">{{ w.english }}</td>
            <td>{{ w.korean }}</td>
            <td><span class="badge badge-blue">Lv{{ w.level }}</span></td>
            <td>{{ w.partOfSpeech ? PART_LABELS[w.partOfSpeech] ?? w.partOfSpeech : '-' }}</td>
            <td><span class="badge" :class="w.isActive ? 'badge-green' : 'badge-gray'">{{ w.isActive ? '활성' : '비활성' }}</span></td>
            <td>
              <button class="btn-sm" @click="openEdit(w)">편집</button>
              <button class="btn-sm btn-danger" @click="remove(w)">삭제</button>
            </td>
          </tr>
          <tr v-if="!words.length"><td colspan="7" class="empty">단어가 없습니다.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ isEdit ? '단어 편집' : '단어 추가' }}</h3>
        <div class="form-row">
          <div class="form-col">
            <label>영단어 *</label>
            <input v-model="form.english" type="text" placeholder="apple" />
          </div>
          <div class="form-col">
            <label>뜻 *</label>
            <input v-model="form.korean" type="text" placeholder="사과" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-col">
            <label>레벨</label>
            <select v-model="form.level">
              <option v-for="l in 10" :key="l" :value="l">레벨 {{ l }}</option>
            </select>
          </div>
          <div class="form-col">
            <label>품사</label>
            <select v-model="form.partOfSpeech">
              <option value="">선택 안함</option>
              <option v-for="p in PARTS" :key="p" :value="p">{{ PART_LABELS[p] }}</option>
            </select>
          </div>
        </div>
        <label>예문 (영어)</label>
        <input v-model="form.exampleEn" type="text" placeholder="I eat an apple." />
        <label>예문 (한국어)</label>
        <input v-model="form.exampleKo" type="text" placeholder="나는 사과를 먹는다." />
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
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.filters { display: flex; align-items: center; gap: 0.75rem; }
.filters select { padding: 0.4rem 0.6rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; }
.count { font-size: 0.8rem; color: #888; }
.loading { color: #888; }
.table-wrap { background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.7rem 1rem; text-align: left; font-size: 0.875rem; }
th { background: #f7f8fa; font-weight: 600; color: #555; border-bottom: 1px solid #eee; }
td { border-bottom: 1px solid #f0f0f0; }
tr:last-child td { border-bottom: none; }
.empty { text-align: center; color: #aaa; padding: 2rem; }
.en { font-weight: 500; }
.badge { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600; }
.badge-blue { background: #ebf4ff; color: #2b6cb0; }
.badge-green { background: #f0fff4; color: #276749; }
.badge-gray { background: #f0f0f0; color: #888; }
.btn-primary { padding: 0.45rem 1rem; background: #4a6cf7; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
.btn-primary:hover { background: #3a5ce5; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost { padding: 0.45rem 1rem; background: transparent; border: 1px solid #ccc; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
.btn-sm { padding: 0.25rem 0.65rem; background: #f0f2f5; border: 1px solid #e2e8f0; border-radius: 4px; cursor: pointer; font-size: 0.8rem; margin-right: 4px; }
.btn-sm:hover { background: #e2e8f0; }
.btn-danger { color: #e53e3e; border-color: #fed7d7; }
.btn-danger:hover { background: #fff5f5; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 1.75rem 2rem; width: 520px; max-width: 95vw; display: flex; flex-direction: column; gap: 0.5rem; }
.modal h3 { font-size: 1.1rem; color: #1a1a2e; margin-bottom: 0.5rem; }
.form-row { display: flex; gap: 0.75rem; }
.form-col { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; }
.modal label { font-size: 0.8rem; font-weight: 600; color: #555; margin-top: 0.3rem; }
.modal input[type="text"], .modal select { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; }
.check-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; cursor: pointer; font-weight: normal !important; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
</style>
