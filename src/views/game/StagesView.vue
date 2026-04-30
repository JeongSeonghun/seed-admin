<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'

interface Stage {
  id: number
  level: number
  stageNumber: number
  wordCount: number
  normalCount: number
  bossCount: number
  expPerCorrect: number
  clearExp: number
  clearCoin: number
}

const stages = ref<Stage[]>([])
const loading = ref(true)
const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const form = ref({ id: 0, level: 1, stageNumber: 1, wordCount: 10, expPerCorrect: 5, clearExp: 50, clearCoin: 10 })

async function load() {
  loading.value = true
  try {
    const res = await api.getGameStages()
    stages.value = res.data
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openCreate() {
  isEdit.value = false
  form.value = { id: 0, level: 1, stageNumber: 1, wordCount: 10, expPerCorrect: 5, clearExp: 50, clearCoin: 10 }
  showModal.value = true
}

function openEdit(s: Stage) {
  isEdit.value = true
  form.value = { id: s.id, level: s.level, stageNumber: s.stageNumber, wordCount: s.wordCount, expPerCorrect: s.expPerCorrect, clearExp: s.clearExp, clearCoin: s.clearCoin }
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    const body = { level: form.value.level, stageNumber: form.value.stageNumber, wordCount: form.value.wordCount, expPerCorrect: form.value.expPerCorrect, clearExp: form.value.clearExp, clearCoin: form.value.clearCoin }
    if (isEdit.value) await api.updateGameStage(form.value.id, body)
    else await api.createGameStage(body)
    showModal.value = false
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message ?? '저장 실패')
  } finally {
    saving.value = false
  }
}

async function remove(s: Stage) {
  if (!confirm(`레벨 ${s.level} - 스테이지 ${s.stageNumber}을(를) 삭제하시겠습니까?`)) return
  await api.deleteGameStage(s.id)
  await load()
}
</script>

<template>
  <div>
    <div class="toolbar">
      <button class="btn-primary" @click="openCreate">+ 스테이지 추가</button>
    </div>
    <div v-if="loading" class="loading">불러오는 중...</div>
    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr><th>레벨</th><th>스테이지</th><th>단어 수</th><th>일반 / 보스</th><th>정답 경험치</th><th>클리어 보상</th><th>액션</th></tr>
        </thead>
        <tbody>
          <tr v-for="s in stages" :key="s.id">
            <td><span class="badge badge-blue">Lv{{ s.level }}</span></td>
            <td>Stage {{ s.stageNumber }}</td>
            <td>{{ s.wordCount }}개</td>
            <td>{{ s.normalCount }} / {{ s.bossCount }}</td>
            <td>{{ s.expPerCorrect }} exp</td>
            <td>{{ s.clearExp }} exp + {{ s.clearCoin }} coin</td>
            <td>
              <button class="btn-sm" @click="openEdit(s)">편집</button>
              <button class="btn-sm btn-danger" @click="remove(s)">삭제</button>
            </td>
          </tr>
          <tr v-if="!stages.length"><td colspan="7" class="empty">스테이지가 없습니다.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ isEdit ? '스테이지 편집' : '스테이지 추가' }}</h3>
        <div class="form-row">
          <div class="form-col">
            <label>레벨</label>
            <select v-model="form.level" :disabled="isEdit">
              <option v-for="l in 10" :key="l" :value="l">{{ l }}</option>
            </select>
          </div>
          <div class="form-col">
            <label>스테이지 번호</label>
            <select v-model="form.stageNumber" :disabled="isEdit">
              <option :value="1">1</option>
              <option :value="2">2</option>
            </select>
          </div>
          <div class="form-col">
            <label>단어 수 (10~20)</label>
            <input v-model.number="form.wordCount" type="number" min="10" max="20" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-col">
            <label>정답당 경험치</label>
            <input v-model.number="form.expPerCorrect" type="number" min="1" />
          </div>
          <div class="form-col">
            <label>클리어 경험치</label>
            <input v-model.number="form.clearExp" type="number" min="0" />
          </div>
          <div class="form-col">
            <label>클리어 코인</label>
            <input v-model.number="form.clearCoin" type="number" min="0" />
          </div>
        </div>
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
.table-wrap { background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.7rem 1rem; text-align: left; font-size: 0.875rem; }
th { background: #f7f8fa; font-weight: 600; color: #555; border-bottom: 1px solid #eee; }
td { border-bottom: 1px solid #f0f0f0; }
tr:last-child td { border-bottom: none; }
.empty { text-align: center; color: #aaa; padding: 2rem; }
.badge { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600; }
.badge-blue { background: #ebf4ff; color: #2b6cb0; }
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
.modal input, .modal select { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; }
.modal input:disabled, .modal select:disabled { background: #f7f8fa; color: #888; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
</style>
