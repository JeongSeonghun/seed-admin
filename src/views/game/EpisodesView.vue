<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

interface Episode {
  id: number
  title: { ko: string; en?: string }
  bannerImageUrl: string
  sortOrder: number
  isActive: boolean
}

const episodes = ref<Episode[]>([])
const loading = ref(true)
const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const uploading = ref(false)

const form = ref({
  id: 0,
  titleKo: '',
  titleEn: '',
  bannerImageUrl: '',
  sortOrder: 0,
  isActive: true,
})

async function load() {
  loading.value = true
  try { const res = await api.getGameEpisodes(); episodes.value = res.data }
  finally { loading.value = false }
}
onMounted(load)

function openCreate() {
  isEdit.value = false
  form.value = { id: 0, titleKo: '', titleEn: '', bannerImageUrl: '', sortOrder: episodes.value.length, isActive: true }
  showModal.value = true
}

function openEdit(ep: Episode) {
  isEdit.value = true
  form.value = { id: ep.id, titleKo: ep.title?.ko ?? '', titleEn: ep.title?.en ?? '', bannerImageUrl: ep.bannerImageUrl, sortOrder: ep.sortOrder, isActive: ep.isActive }
  showModal.value = true
}

async function uploadImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const { data } = await api.uploadImage(file)
    form.value.bannerImageUrl = data.url
  } finally {
    uploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function save() {
  saving.value = true
  try {
    const title = { ko: form.value.titleKo, ...(form.value.titleEn ? { en: form.value.titleEn } : {}) }
    const body = { title, bannerImageUrl: form.value.bannerImageUrl, sortOrder: form.value.sortOrder, isActive: form.value.isActive }
    if (isEdit.value) await api.updateGameEpisode(form.value.id, body)
    else await api.createGameEpisode(body)
    showModal.value = false
    await load()
  } catch (e: any) { alert(e?.response?.data?.message ?? '저장 실패') }
  finally { saving.value = false }
}

async function remove(ep: Episode) {
  if (!confirm(`"${ep.title?.ko}" 에피소드를 삭제하시겠습니까? (소속 스테이지는 삭제되지 않고 에피소드 미배정 상태가 됩니다)`)) return
  await api.deleteGameEpisode(ep.id)
  await load()
}
</script>

<template>
  <div>
    <div v-if="!auth.isGuestAdmin" class="toolbar">
      <button class="btn-primary" @click="openCreate">+ 에피소드 추가</button>
    </div>
    <p class="desc">스테이지를 테마별로 묶는 챕터입니다. 배너 이미지는 유저가 상점에서 장착하는 개인 배경과는 별개로, 이 에피소드 고유의 고정 아트입니다.</p>

    <div v-if="loading" class="loading">불러오는 중...</div>
    <div v-else class="grid">
      <div v-for="ep in episodes" :key="ep.id" class="card">
        <img :src="ep.bannerImageUrl" alt="" class="thumb" />
        <div class="card-body">
          <div class="card-header">
            <span class="card-name">{{ ep.title?.ko }}</span>
            <div class="badges">
              <span class="badge badge-gray">순서 {{ ep.sortOrder }}</span>
              <span class="badge" :class="ep.isActive ? 'badge-green' : 'badge-gray'">{{ ep.isActive ? '활성' : '비활성' }}</span>
            </div>
          </div>
          <div v-if="!auth.isGuestAdmin" class="card-actions">
            <button class="btn-sm" @click="openEdit(ep)">편집</button>
            <button class="btn-sm btn-danger" @click="remove(ep)">삭제</button>
          </div>
        </div>
      </div>
      <div v-if="!episodes.length" class="empty">등록된 에피소드가 없습니다.</div>
    </div>

    <div v-if="showModal" class="overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ isEdit ? '에피소드 편집' : '에피소드 추가' }}</h3>
        <label>제목(한글) *</label>
        <input v-model="form.titleKo" type="text" placeholder="예: 초록 언덕" />
        <label>제목(영문)</label>
        <input v-model="form.titleEn" type="text" placeholder="예: Green Hills" />

        <label>배너 이미지</label>
        <div class="img-field-row">
          <input :value="form.bannerImageUrl" readonly placeholder="이미지 URL" />
          <label class="upload-btn-sm" :class="{ disabled: uploading }">
            {{ uploading ? '...' : '업로드' }}
            <input type="file" accept="image/*" hidden :disabled="uploading" @change="uploadImage" />
          </label>
        </div>
        <img v-if="form.bannerImageUrl" :src="form.bannerImageUrl" class="preview" alt="" />

        <label>정렬 순서</label>
        <input v-model.number="form.sortOrder" type="number" min="0" />
        <div class="check-row">
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
.badge-green { background: #f0fff4; color: #276749; }
.badge-gray { background: #f0f0f0; color: #888; }
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
.img-field-row { display: flex; gap: 0.5rem; align-items: center; }
.img-field-row input { flex: 1; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; background: #f7f8fa; }
.upload-btn-sm { padding: 0.4rem 0.75rem; background: #4a6cf7; color: white; border-radius: 6px; cursor: pointer; font-size: 0.8rem; white-space: nowrap; flex-shrink: 0; }
.upload-btn-sm.disabled { opacity: 0.5; cursor: not-allowed; }
.preview { width: 120px; aspect-ratio: 9/16; object-fit: cover; border-radius: 6px; border: 1px solid #eee; }
.check-row { display: flex; gap: 1rem; margin-top: 0.25rem; }
.check-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; cursor: pointer; font-weight: normal !important; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
</style>
