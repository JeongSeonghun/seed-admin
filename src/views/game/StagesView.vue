<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/network'

interface LevelConfig { level: number; count: number }
interface StageTitle { ko: string; en?: string }
interface Stage {
  id: number
  level: number
  stageNumber: number
  stageType: 'NORMAL' | 'BOSS'
  wordCount: number
  expPerCorrect: number
  clearExp: number
  clearCoin: number
  levelConfigs: LevelConfig[]
  title?: StageTitle | null
  rewardPackageId?: number | null
  rewardMyImageId?: number | null
  rewardMyImageRate?: number
  normalPackageIds?: number[] | null
}

const stages = ref<Stage[]>([])
const loading = ref(true)
const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const form = ref({
  id: 0, level: 1, stageNumber: 1, stageType: 'NORMAL' as 'NORMAL' | 'BOSS',
  levelConfigs: [{ level: 1, count: 10 }] as LevelConfig[],
  titleKo: '', titleEn: '',
  expPerCorrect: 5, clearExp: 50, clearCoin: 10,
  rewardPackageId: null as number | null,
  rewardMyImageId: null as number | null,
  rewardMyImageRate: 0.3,
  normalPackageIdsText: '',
})

const totalWordCount = computed(() => form.value.levelConfigs.reduce((s, c) => s + (c.count || 0), 0))

async function load() {
  loading.value = true
  try { stages.value = (await api.getGameStages()).data }
  finally { loading.value = false }
}
onMounted(load)

function openCreate() {
  isEdit.value = false
  form.value = { id: 0, level: 1, stageNumber: 1, stageType: 'NORMAL', levelConfigs: [{ level: 1, count: 10 }], titleKo: '', titleEn: '', expPerCorrect: 5, clearExp: 50, clearCoin: 10, rewardPackageId: null, rewardMyImageId: null, rewardMyImageRate: 0.3, normalPackageIdsText: '' }
  showModal.value = true
}

function openEdit(s: Stage) {
  isEdit.value = true
  form.value = {
    id: s.id, level: s.level, stageNumber: s.stageNumber, stageType: s.stageType ?? 'NORMAL',
    levelConfigs: s.levelConfigs?.length ? s.levelConfigs.map(c => ({ ...c })) : [{ level: s.level, count: s.wordCount }],
    titleKo: s.title?.ko ?? '', titleEn: s.title?.en ?? '',
    expPerCorrect: s.expPerCorrect, clearExp: s.clearExp, clearCoin: s.clearCoin,
    rewardPackageId: s.rewardPackageId ?? null, rewardMyImageId: s.rewardMyImageId ?? null, rewardMyImageRate: s.rewardMyImageRate ?? 0.3,
    normalPackageIdsText: s.normalPackageIds?.join(', ') ?? '',
  }
  showModal.value = true
}

function addLevelConfig() { form.value.levelConfigs.push({ level: 1, count: 5 }) }
function removeLevelConfig(i: number) {
  if (form.value.levelConfigs.length > 1) form.value.levelConfigs.splice(i, 1)
}

function parsePackageIds(text: string): number[] | null {
  const ids = text.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0)
  return ids.length ? ids : null
}

async function save() {
  saving.value = true
  try {
    const title = form.value.titleKo ? { ko: form.value.titleKo, ...(form.value.titleEn ? { en: form.value.titleEn } : {}) } : null
    const rewardFields = {
      rewardPackageId: form.value.rewardPackageId || null,
      rewardMyImageId: form.value.rewardMyImageId || null,
      rewardMyImageRate: form.value.rewardMyImageRate,
    }
    const normalPackageIds = form.value.stageType === 'NORMAL' ? parsePackageIds(form.value.normalPackageIdsText) : null
    if (isEdit.value) {
      await api.updateGameStage(form.value.id, {
        stageType: form.value.stageType,
        levelConfigs: form.value.levelConfigs,
        title,
        expPerCorrect: form.value.expPerCorrect,
        clearExp: form.value.clearExp,
        clearCoin: form.value.clearCoin,
        ...rewardFields,
        normalPackageIds,
      })
    } else {
      await api.createGameStage({
        level: form.value.level,
        stageNumber: form.value.stageNumber,
        stageType: form.value.stageType,
        levelConfigs: form.value.levelConfigs,
        title,
        expPerCorrect: form.value.expPerCorrect,
        clearExp: form.value.clearExp,
        clearCoin: form.value.clearCoin,
        ...rewardFields,
        normalPackageIds,
      })
    }
    showModal.value = false
    await load()
  } catch (e: any) { alert(e?.response?.data?.message ?? '저장 실패') }
  finally { saving.value = false }
}

async function remove(s: Stage) {
  if (!confirm(`레벨 ${s.level} - 스테이지 ${s.stageNumber}을(를) 삭제하시겠습니까?`)) return
  await api.deleteGameStage(s.id)
  await load()
}

function cfgSummary(s: Stage) {
  if (!s.levelConfigs?.length) return `Lv${s.level} × ${s.wordCount}`
  return s.levelConfigs.map(c => `Lv${c.level}×${c.count}`).join(' + ')
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
          <tr><th>레벨</th><th>스테이지</th><th>타입</th><th>타이틀</th><th>단어 구성</th><th>총 단어</th><th>정답 경험치</th><th>클리어 보상</th><th>액션</th></tr>
        </thead>
        <tbody>
          <tr v-for="s in stages" :key="s.id">
            <td><span class="badge badge-blue">Lv{{ s.level }}</span></td>
            <td>Stage {{ s.stageNumber }}</td>
            <td><span class="badge" :class="s.stageType === 'BOSS' ? 'badge-red' : 'badge-gray'">{{ s.stageType }}</span></td>
            <td class="title-cell">
              <span v-if="s.title?.ko">{{ s.title.ko }}</span>
              <span v-else class="empty-title">-</span>
              <span v-if="s.title?.en" class="title-en">{{ s.title.en }}</span>
            </td>
            <td class="cfg-cell">{{ cfgSummary(s) }}</td>
            <td>{{ s.wordCount }}개</td>
            <td>{{ s.expPerCorrect }} exp</td>
            <td>{{ s.clearExp }} exp + {{ s.clearCoin }} coin</td>
            <td>
              <button class="btn-sm" @click="openEdit(s)">편집</button>
              <button class="btn-sm btn-danger" @click="remove(s)">삭제</button>
            </td>
          </tr>
          <tr v-if="!stages.length"><td colspan="9" class="empty">스테이지가 없습니다.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ isEdit ? '스테이지 편집' : '스테이지 추가' }}</h3>
        <div class="form-row">
          <div class="form-col">
            <label>카테고리 레벨</label>
            <select v-model="form.level" :disabled="isEdit">
              <option v-for="l in 10" :key="l" :value="l">{{ l }}</option>
            </select>
          </div>
          <div class="form-col">
            <label>스테이지 번호</label>
            <input v-model.number="form.stageNumber" type="number" min="1" :disabled="isEdit" />
          </div>
          <div class="form-col">
            <label>스테이지 타입</label>
            <select v-model="form.stageType">
              <option value="NORMAL">NORMAL</option>
              <option value="BOSS">BOSS</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-col">
            <label>타이틀 (한국어)</label>
            <input v-model="form.titleKo" type="text" placeholder="예: 어둠의 동굴" />
          </div>
          <div class="form-col">
            <label>타이틀 (영어, 선택)</label>
            <input v-model="form.titleEn" type="text" placeholder="예: Dark Cave" />
          </div>
        </div>

        <label class="section-label">레벨 구성 <span class="total-count">총 {{ totalWordCount }}개</span></label>
        <div class="cfg-list">
          <div v-for="(cfg, i) in form.levelConfigs" :key="i" class="cfg-row">
            <select v-model="cfg.level">
              <option v-for="l in 10" :key="l" :value="l">레벨 {{ l }}</option>
            </select>
            <input v-model.number="cfg.count" type="number" min="1" max="30" placeholder="개수" />
            <span class="cfg-unit">개</span>
            <button class="btn-cfg-del" :disabled="form.levelConfigs.length <= 1" @click="removeLevelConfig(i)">✕</button>
          </div>
          <button class="btn-add-cfg" @click="addLevelConfig">+ 레벨 추가</button>
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
        <div v-if="form.stageType === 'NORMAL'" class="form-row">
          <div class="form-col">
            <label>배경 패키지 ID <span class="label-sub">(쉼표 구분, 미설정 시 보유 패키지 랜덤)</span></label>
            <input v-model="form.normalPackageIdsText" type="text" placeholder="예: 1, 2, 3" />
          </div>
        </div>

        <label class="section-label">클리어 보상</label>
        <div class="form-row">
          <div class="form-col">
            <label>보상 패키지 ID</label>
            <input v-model.number="form.rewardPackageId" type="number" min="1" placeholder="없으면 비워두세요" />
          </div>
          <div class="form-col">
            <label>보상 캐릭터 ID <span class="label-sub">(BOSS)</span></label>
            <input v-model.number="form.rewardMyImageId" type="number" min="1" placeholder="없으면 비워두세요" />
          </div>
          <div class="form-col">
            <label>캐릭터 획득 확률 <span class="label-sub">(0~1)</span></label>
            <input v-model.number="form.rewardMyImageRate" type="number" min="0" max="1" step="0.05" />
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
.cfg-cell { font-size: 0.8rem; color: #555; font-family: monospace; }
.title-cell { font-size: 0.875rem; }
.title-en { display: block; font-size: 0.75rem; color: #888; }
.empty-title { color: #ccc; }
.label-sub { font-weight: 400; color: #aaa; }
.empty { text-align: center; color: #aaa; padding: 2rem; }
.badge { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600; }
.badge-blue { background: #ebf4ff; color: #2b6cb0; }
.badge-red { background: #fff5f5; color: #c53030; }
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
.modal { background: white; border-radius: 12px; padding: 1.75rem 2rem; width: 500px; max-width: 95vw; display: flex; flex-direction: column; gap: 0.5rem; }
.modal h3 { font-size: 1.1rem; color: #1a1a2e; margin-bottom: 0.5rem; }
.form-row { display: flex; gap: 0.75rem; }
.form-col { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; }
.modal label { font-size: 0.8rem; font-weight: 600; color: #555; margin-top: 0.3rem; }
.modal input, .modal select { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; box-sizing: border-box; }
.modal input:disabled, .modal select:disabled { background: #f7f8fa; color: #888; }
.section-label { font-size: 0.8rem; font-weight: 600; color: #555; margin-top: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
.total-count { font-weight: 400; color: #4a6cf7; }
.cfg-list { display: flex; flex-direction: column; gap: 0.4rem; background: #f7f8fa; border-radius: 8px; padding: 0.75rem; }
.cfg-row { display: flex; align-items: center; gap: 0.5rem; }
.cfg-row select { width: 110px; flex-shrink: 0; }
.cfg-row input { width: 70px; flex-shrink: 0; }
.cfg-unit { font-size: 0.8rem; color: #888; }
.btn-cfg-del { background: none; border: none; cursor: pointer; color: #e53e3e; font-size: 0.9rem; padding: 0 0.25rem; }
.btn-cfg-del:disabled { opacity: 0.3; cursor: not-allowed; }
.btn-add-cfg { align-self: flex-start; padding: 0.3rem 0.75rem; background: white; border: 1px dashed #4a6cf7; border-radius: 6px; color: #4a6cf7; cursor: pointer; font-size: 0.8rem; margin-top: 0.25rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
</style>
