<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'

interface PackageImage { id: number; imageUrl: string; sortOrder: number }
interface MonsterPack {
  id: number; name: string; description: string | null; coinPrice: number
  type: 'NORMAL' | 'BOSS'; contentCategory: 'GENERAL' | 'ADULT'; isDefault: boolean; isActive: boolean; images: PackageImage[]
}

const packs = ref<MonsterPack[]>([])
const loading = ref(true)
const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const form = ref({ id: 0, name: '', description: '', coinPrice: 0, type: 'NORMAL' as 'NORMAL' | 'BOSS', contentCategory: 'GENERAL' as 'GENERAL' | 'ADULT', isDefault: false, isActive: true })

const uploadingImg = ref(false)
const selectedPack = ref<MonsterPack | null>(null)
const showImgPanel = ref(false)

async function load() {
  loading.value = true
  try { const res = await api.getGameMonsterPacks(); packs.value = res.data }
  finally { loading.value = false }
}
onMounted(load)

function openCreate() {
  isEdit.value = false
  form.value = { id: 0, name: '', description: '', coinPrice: 0, type: 'NORMAL', contentCategory: 'GENERAL', isDefault: false, isActive: true }
  showModal.value = true
}
function openEdit(p: MonsterPack) {
  isEdit.value = true
  form.value = { id: p.id, name: p.name, description: p.description ?? '', coinPrice: p.coinPrice, type: p.type, contentCategory: p.contentCategory, isDefault: p.isDefault, isActive: p.isActive }
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    const body = { name: form.value.name, description: form.value.description || undefined, coinPrice: form.value.coinPrice, type: form.value.type, contentCategory: form.value.contentCategory, isDefault: form.value.isDefault, isActive: form.value.isActive }
    if (isEdit.value) await api.updateGameMonsterPack(form.value.id, body)
    else await api.createGameMonsterPack(body)
    showModal.value = false; await load()
  } catch (e: any) { alert(e?.response?.data?.message ?? '저장 실패') }
  finally { saving.value = false }
}

async function remove(p: MonsterPack) {
  if (!confirm(`"${p.name}" 몬스터 팩을 삭제하시겠습니까?`)) return
  await api.deleteGameMonsterPack(p.id); await load()
}

function openImages(p: MonsterPack) { selectedPack.value = p; showImgPanel.value = true }

async function uploadImage(pack: MonsterPack, e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingImg.value = true
  try {
    const { data } = await api.uploadImage(file)
    const sortOrder = pack.images.length
    await api.addMonsterPackImage(pack.id, { imageUrl: data.url, sortOrder })
    await load()
    selectedPack.value = packs.value.find(p => p.id === pack.id) ?? null
  } finally { uploadingImg.value = false; (e.target as HTMLInputElement).value = '' }
}

async function removeImage(pack: MonsterPack, imgId: number) {
  if (!confirm('이미지를 삭제하시겠습니까?')) return
  await api.removeMonsterPackImage(pack.id, imgId)
  await load()
  selectedPack.value = packs.value.find(p => p.id === pack.id) ?? null
}
</script>

<template>
  <div class="layout">
    <div class="list-area">
      <div class="toolbar">
        <button class="btn-primary" @click="openCreate">+ 몬스터 팩 추가</button>
      </div>
      <div v-if="loading" class="loading">불러오는 중...</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr><th>이름</th><th>타입</th><th>카테고리</th><th>코인</th><th>이미지수</th><th>상태</th><th>액션</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in packs" :key="p.id" :class="{ selected: selectedPack?.id === p.id }">
              <td>{{ p.name }}</td>
              <td><span class="badge" :class="p.type === 'BOSS' ? 'badge-red' : 'badge-blue'">{{ p.type }}</span></td>
              <td><span class="badge" :class="p.contentCategory === 'ADULT' ? 'badge-adult' : 'badge-gray'">{{ p.contentCategory === 'ADULT' ? '성인' : '일반' }}</span></td>
              <td>{{ p.coinPrice }}</td>
              <td>{{ p.images.length }}장</td>
              <td>
                <span v-if="p.isDefault" class="badge badge-purple">기본</span>
                <span class="badge" :class="p.isActive ? 'badge-green' : 'badge-gray'">{{ p.isActive ? '활성' : '비활성' }}</span>
              </td>
              <td>
                <button class="btn-sm" @click="openImages(p)">이미지</button>
                <button class="btn-sm" @click="openEdit(p)">편집</button>
                <button class="btn-sm btn-danger" @click="remove(p)">삭제</button>
              </td>
            </tr>
            <tr v-if="!packs.length"><td colspan="7" class="empty">몬스터 팩이 없습니다.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 이미지 패널 -->
    <div v-if="showImgPanel && selectedPack" class="img-panel">
      <div class="panel-header">
        <span>{{ selectedPack.name }} 이미지 관리</span>
        <button class="btn-xs" @click="showImgPanel = false">✕</button>
      </div>
      <p class="panel-hint" v-if="selectedPack.type === 'BOSS'">BOSS: sort_order 순서가 피해 단계입니다 (0=풀체력, 마지막=사망)</p>
      <div class="img-grid">
        <div v-for="img in selectedPack.images.slice().sort((a,b)=>a.sortOrder-b.sortOrder)" :key="img.id" class="img-card">
          <img :src="img.imageUrl" alt="" />
          <span class="img-order">{{ img.sortOrder }}</span>
          <button class="img-del" @click="removeImage(selectedPack!, img.id)">✕</button>
        </div>
      </div>
      <label class="upload-btn" :class="{ disabled: uploadingImg }">
        {{ uploadingImg ? '업로드 중...' : '+ 이미지 추가' }}
        <input type="file" accept="image/*" hidden :disabled="uploadingImg" @change="uploadImage(selectedPack!, $event)" />
      </label>
    </div>
  </div>

  <div v-if="showModal" class="overlay" @click.self="showModal = false">
    <div class="modal">
      <h3>{{ isEdit ? '몬스터 팩 편집' : '몬스터 팩 추가' }}</h3>
      <label>이름 *</label>
      <input v-model="form.name" type="text" placeholder="몬스터 팩 이름" />
      <label>설명</label>
      <input v-model="form.description" type="text" />
      <div class="form-row">
        <div class="form-col">
          <label>타입</label>
          <select v-model="form.type" :disabled="isEdit">
            <option value="NORMAL">NORMAL (스테이지 배경)</option>
            <option value="BOSS">BOSS (보스 몬스터)</option>
          </select>
        </div>
        <div class="form-col">
          <label>카테고리</label>
          <select v-model="form.contentCategory">
            <option value="GENERAL">일반</option>
            <option value="ADULT">성인</option>
          </select>
        </div>
        <div class="form-col">
          <label>코인 가격</label>
          <input v-model.number="form.coinPrice" type="number" min="0" />
        </div>
      </div>
      <div class="check-row">
        <label class="check-label"><input type="checkbox" v-model="form.isDefault" /> 기본 팩 <span class="hint">(미보유 유저 fallback)</span></label>
        <label class="check-label"><input type="checkbox" v-model="form.isActive" /> 활성</label>
      </div>
      <div class="modal-actions">
        <button class="btn-ghost" @click="showModal = false">취소</button>
        <button class="btn-primary" :disabled="saving" @click="save">{{ saving ? '저장 중...' : '저장' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout { display: flex; gap: 1.25rem; align-items: flex-start; }
.list-area { flex: 1; min-width: 0; }
.img-panel { width: 280px; flex-shrink: 0; background: white; border-radius: 10px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.panel-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 0.9rem; margin-bottom: 0.75rem; }
.panel-hint { font-size: 0.75rem; color: #888; margin-bottom: 0.75rem; }
.img-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 0.5rem; margin-bottom: 0.75rem; }
.img-card { position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; border: 1px solid #eee; }
.img-card img { width: 100%; height: 100%; object-fit: cover; }
.img-order { position: absolute; top: 2px; left: 4px; font-size: 0.65rem; font-weight: 700; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.8); }
.img-del { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 0.65rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.upload-btn { display: block; text-align: center; padding: 0.5rem; border: 1px dashed #4a6cf7; border-radius: 6px; color: #4a6cf7; cursor: pointer; font-size: 0.825rem; }
.upload-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.toolbar { display: flex; justify-content: flex-end; margin-bottom: 1rem; }
.loading { color: #888; }
.table-wrap { background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.7rem 1rem; text-align: left; font-size: 0.875rem; }
th { background: #f7f8fa; font-weight: 600; color: #555; border-bottom: 1px solid #eee; }
td { border-bottom: 1px solid #f0f0f0; }
tr:last-child td { border-bottom: none; }
tr.selected td { background: #f5f7ff; }
.empty { text-align: center; color: #aaa; padding: 2rem; }
.badge { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600; }
.badge-blue { background: #ebf4ff; color: #2b6cb0; }
.badge-red { background: #fff5f5; color: #c53030; }
.badge-green { background: #f0fff4; color: #276749; }
.badge-gray { background: #f0f0f0; color: #888; }
.badge-purple { background: #faf0ff; color: #805ad5; }
.badge-adult { background: #fff0f0; color: #c53030; }
.check-row { display: flex; gap: 1rem; margin-top: 0.25rem; }
.check-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; cursor: pointer; font-weight: normal !important; }
.hint { font-size: 0.75rem; color: #aaa; font-weight: 400; }
.btn-primary { padding: 0.45rem 1rem; background: #4a6cf7; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
.btn-primary:hover { background: #3a5ce5; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost { padding: 0.45rem 1rem; background: transparent; border: 1px solid #ccc; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
.btn-sm { padding: 0.25rem 0.65rem; background: #f0f2f5; border: 1px solid #e2e8f0; border-radius: 4px; cursor: pointer; font-size: 0.8rem; margin-right: 4px; }
.btn-sm:hover { background: #e2e8f0; }
.btn-danger { color: #e53e3e; border-color: #fed7d7; }
.btn-danger:hover { background: #fff5f5; }
.btn-xs { padding: 0.2rem 0.5rem; background: transparent; border: none; cursor: pointer; font-size: 0.9rem; color: #888; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 1.75rem 2rem; width: 400px; max-width: 95vw; display: flex; flex-direction: column; gap: 0.5rem; }
.modal h3 { font-size: 1.1rem; color: #1a1a2e; margin-bottom: 0.5rem; }
.form-row { display: flex; gap: 0.75rem; }
.form-col { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; }
.modal label { font-size: 0.8rem; font-weight: 600; color: #555; margin-top: 0.3rem; }
.modal input, .modal select { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; }
.modal select:disabled { background: #f7f8fa; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
</style>
