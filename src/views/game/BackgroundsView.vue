<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'

interface Background {
  id: number
  name: string
  imageUrl: string
  coinPrice: number | null
  contentCategory: 'GENERAL' | 'ADULT'
  isDefault: boolean
  isActive: boolean
}

const backgrounds = ref<Background[]>([])
const loading = ref(true)
const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const uploading = ref(false)

const form = ref({
  id: 0,
  name: '',
  imageUrl: '',
  coinPrice: null as number | null,
  contentCategory: 'GENERAL' as 'GENERAL' | 'ADULT',
  isDefault: false,
  isActive: true,
})

async function load() {
  loading.value = true
  try { const res = await api.getGameBackgrounds(); backgrounds.value = res.data }
  finally { loading.value = false }
}
onMounted(load)

function openCreate() {
  isEdit.value = false
  form.value = { id: 0, name: '', imageUrl: '', coinPrice: null, contentCategory: 'GENERAL', isDefault: false, isActive: true }
  showModal.value = true
}

function openEdit(bg: Background) {
  isEdit.value = true
  form.value = { id: bg.id, name: bg.name, imageUrl: bg.imageUrl, coinPrice: bg.coinPrice, contentCategory: bg.contentCategory, isDefault: bg.isDefault, isActive: bg.isActive }
  showModal.value = true
}

async function uploadImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const { data } = await api.uploadImage(file)
    form.value.imageUrl = data.url
  } finally {
    uploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function save() {
  saving.value = true
  try {
    const coinPrice = form.value.coinPrice === null || (form.value.coinPrice as unknown) === '' ? null : form.value.coinPrice
    const body = { name: form.value.name, imageUrl: form.value.imageUrl, coinPrice, contentCategory: form.value.contentCategory, isDefault: form.value.isDefault, isActive: form.value.isActive }
    if (isEdit.value) await api.updateGameBackground(form.value.id, body)
    else await api.createGameBackground(body)
    showModal.value = false
    await load()
  } catch (e: any) { alert(e?.response?.data?.message ?? '저장 실패') }
  finally { saving.value = false }
}

async function remove(bg: Background) {
  if (!confirm(`"${bg.name}" 배경을 삭제하시겠습니까?`)) return
  await api.deleteGameBackground(bg.id)
  await load()
}
</script>

<template>
  <div>
    <div class="toolbar">
      <button class="btn-primary" @click="openCreate">+ 배경 추가</button>
    </div>
    <p class="desc">홈 전체화면 배경, 메인게임 전체화면 배경, 스테이지 목록 상단 배너(미리보기)에 동일한 이미지가 공용으로 쓰입니다.</p>

    <div v-if="loading" class="loading">불러오는 중...</div>
    <div v-else class="grid">
      <div v-for="bg in backgrounds" :key="bg.id" class="card">
        <img :src="bg.imageUrl" alt="" class="thumb" />
        <div class="card-body">
          <div class="card-header">
            <span class="card-name">{{ bg.name }}</span>
            <div class="badges">
              <span v-if="bg.isDefault" class="badge badge-purple">기본</span>
              <span v-if="bg.coinPrice !== null" class="badge badge-yellow">{{ bg.coinPrice }}코인</span>
              <span class="badge" :class="bg.contentCategory === 'ADULT' ? 'badge-adult' : 'badge-gray'">{{ bg.contentCategory === 'ADULT' ? '성인' : '일반' }}</span>
              <span class="badge" :class="bg.isActive ? 'badge-green' : 'badge-gray'">{{ bg.isActive ? '활성' : '비활성' }}</span>
            </div>
          </div>
          <div class="card-actions">
            <button class="btn-sm" @click="openEdit(bg)">편집</button>
            <button class="btn-sm btn-danger" @click="remove(bg)">삭제</button>
          </div>
        </div>
      </div>
      <div v-if="!backgrounds.length" class="empty">등록된 배경이 없습니다.</div>
    </div>

    <div v-if="showModal" class="overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ isEdit ? '배경 편집' : '배경 추가' }}</h3>
        <label>이름 *</label>
        <input v-model="form.name" type="text" placeholder="배경 이름" />

        <label>이미지</label>
        <div class="img-field-row">
          <input :value="form.imageUrl" readonly placeholder="이미지 URL" />
          <label class="upload-btn-sm" :class="{ disabled: uploading }">
            {{ uploading ? '...' : '업로드' }}
            <input type="file" accept="image/*" hidden :disabled="uploading" @change="uploadImage" />
          </label>
        </div>
        <img v-if="form.imageUrl" :src="form.imageUrl" class="preview" alt="" />

        <label>코인 가격 <span class="hint">비워두면 상점에 미노출 (보상/기본 전용)</span></label>
        <input v-model.number="form.coinPrice" type="number" min="0" placeholder="예: 100 (비우면 판매 안 함)" />
        <label>카테고리</label>
        <select v-model="form.contentCategory">
          <option value="GENERAL">일반</option>
          <option value="ADULT">성인</option>
        </select>
        <div class="check-row">
          <label class="check-label"><input type="checkbox" v-model="form.isDefault" /> 기본 배경</label>
          <label class="check-label"><input type="checkbox" v-model="form.isActive" /> 활성</label>
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
.toolbar { display: flex; justify-content: flex-end; margin-bottom: 0.5rem; }
.desc { color: #888; font-size: 0.8rem; margin: 0 0 1rem; }
.loading { color: #888; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
.card { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.thumb { width: 100%; aspect-ratio: 9/16; object-fit: cover; background: #f7f8fa; }
.card-body { padding: 0.75rem; }
.card-header { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.6rem; }
.card-name { font-weight: 600; font-size: 0.95rem; }
.badges { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.card-actions { display: flex; gap: 0.4rem; }
.empty { text-align: center; color: #aaa; padding: 3rem; background: white; border-radius: 10px; grid-column: 1/-1; }
.badge { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600; }
.badge-purple { background: #faf0ff; color: #805ad5; }
.badge-yellow { background: #fffbeb; color: #b7791f; }
.badge-green { background: #f0fff4; color: #276749; }
.badge-gray { background: #f0f0f0; color: #888; }
.badge-adult { background: #fff0f0; color: #c53030; }
.btn-primary { padding: 0.45rem 1rem; background: #4a6cf7; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
.btn-primary:hover { background: #3a5ce5; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost { padding: 0.45rem 1rem; background: transparent; border: 1px solid #ccc; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
.btn-sm { padding: 0.25rem 0.65rem; background: #f0f2f5; border: 1px solid #e2e8f0; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.btn-sm:hover { background: #e2e8f0; }
.btn-danger { color: #e53e3e; border-color: #fed7d7; }
.btn-danger:hover { background: #fff5f5; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 1.75rem 2rem; width: 480px; max-width: 95vw; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; }
.modal h3 { font-size: 1.1rem; color: #1a1a2e; margin-bottom: 0.5rem; }
.modal label { font-size: 0.8rem; font-weight: 600; color: #555; margin-top: 0.3rem; }
.modal input[type="text"] { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; }
.hint { font-weight: normal; color: #aaa; }
.img-field-row { display: flex; gap: 0.5rem; align-items: center; }
.img-field-row input { flex: 1; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; background: #f7f8fa; }
.upload-btn-sm { padding: 0.4rem 0.75rem; background: #4a6cf7; color: white; border-radius: 6px; cursor: pointer; font-size: 0.8rem; white-space: nowrap; flex-shrink: 0; }
.upload-btn-sm.disabled { opacity: 0.5; cursor: not-allowed; }
.preview { width: 120px; aspect-ratio: 9/16; object-fit: cover; border-radius: 6px; border: 1px solid #eee; }
.check-row { display: flex; gap: 1rem; margin-top: 0.25rem; }
.check-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; cursor: pointer; font-weight: normal !important; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
</style>
