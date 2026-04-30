<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'

interface MyImage {
  id: number
  name: string
  normalUrl: string
  hitUrl: string
  criticalUrl: string
  deadUrl: string
  isDefault: boolean
  isActive: boolean
}

const images = ref<MyImage[]>([])
const loading = ref(true)
const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const uploadingField = ref<string | null>(null)

const form = ref({
  id: 0,
  name: '',
  normalUrl: '',
  hitUrl: '',
  criticalUrl: '',
  deadUrl: '',
  isDefault: false,
  isActive: true,
})

async function load() {
  loading.value = true
  try { const res = await api.getGameMyImages(); images.value = res.data }
  finally { loading.value = false }
}
onMounted(load)

function openCreate() {
  isEdit.value = false
  form.value = { id: 0, name: '', normalUrl: '', hitUrl: '', criticalUrl: '', deadUrl: '', isDefault: false, isActive: true }
  showModal.value = true
}

function openEdit(img: MyImage) {
  isEdit.value = true
  form.value = { id: img.id, name: img.name, normalUrl: img.normalUrl, hitUrl: img.hitUrl, criticalUrl: img.criticalUrl, deadUrl: img.deadUrl, isDefault: img.isDefault, isActive: img.isActive }
  showModal.value = true
}

async function uploadForField(field: 'normalUrl' | 'hitUrl' | 'criticalUrl' | 'deadUrl', e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingField.value = field
  try {
    const { data } = await api.uploadImage(file)
    form.value[field] = data.url
  } finally {
    uploadingField.value = null
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function save() {
  saving.value = true
  try {
    const body = { name: form.value.name, normalUrl: form.value.normalUrl, hitUrl: form.value.hitUrl, criticalUrl: form.value.criticalUrl, deadUrl: form.value.deadUrl, isDefault: form.value.isDefault, isActive: form.value.isActive }
    if (isEdit.value) await api.updateGameMyImage(form.value.id, body)
    else await api.createGameMyImage(body)
    showModal.value = false
    await load()
  } catch (e: any) { alert(e?.response?.data?.message ?? '저장 실패') }
  finally { saving.value = false }
}

async function remove(img: MyImage) {
  if (!confirm(`"${img.name}" 이미지를 삭제하시겠습니까?`)) return
  await api.deleteGameMyImage(img.id)
  await load()
}
</script>

<template>
  <div>
    <div class="toolbar">
      <button class="btn-primary" @click="openCreate">+ 캐릭터 추가</button>
    </div>

    <div v-if="loading" class="loading">불러오는 중...</div>
    <div v-else class="grid">
      <div v-for="img in images" :key="img.id" class="card">
        <div class="card-header">
          <span class="card-name">{{ img.name }}</span>
          <div class="badges">
            <span v-if="img.isDefault" class="badge badge-purple">기본</span>
            <span class="badge" :class="img.isActive ? 'badge-green' : 'badge-gray'">{{ img.isActive ? '활성' : '비활성' }}</span>
          </div>
        </div>
        <div class="img-row">
          <div class="img-item" v-for="(label, key) in { normalUrl: '기본', hitUrl: '피격', criticalUrl: '치명', deadUrl: '사망' }" :key="key">
            <img :src="img[key as keyof MyImage] as string" alt="" />
            <span class="img-label">{{ label }}</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn-sm" @click="openEdit(img)">편집</button>
          <button class="btn-sm btn-danger" @click="remove(img)">삭제</button>
        </div>
      </div>
      <div v-if="!images.length" class="empty">캐릭터 이미지가 없습니다.</div>
    </div>

    <div v-if="showModal" class="overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ isEdit ? '캐릭터 편집' : '캐릭터 추가' }}</h3>
        <label>이름 *</label>
        <input v-model="form.name" type="text" placeholder="캐릭터 이름" />

        <div v-for="(label, field) in { normalUrl: '기본 이미지', hitUrl: '피격 이미지', criticalUrl: '치명타 이미지', deadUrl: '사망 이미지' }" :key="field" class="img-field">
          <label>{{ label }}</label>
          <div class="img-field-row">
            <input :value="form[field as keyof typeof form]" readonly placeholder="이미지 URL" />
            <label class="upload-btn-sm" :class="{ disabled: uploadingField === field }">
              {{ uploadingField === field ? '...' : '업로드' }}
              <input type="file" accept="image/*" hidden :disabled="uploadingField !== null" @change="uploadForField(field as any, $event)" />
            </label>
          </div>
          <img v-if="form[field as keyof typeof form]" :src="form[field as keyof typeof form] as string" class="preview" alt="" />
        </div>

        <div class="check-row">
          <label class="check-label"><input type="checkbox" v-model="form.isDefault" /> 기본 캐릭터</label>
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
.toolbar { display: flex; justify-content: flex-end; margin-bottom: 1rem; }
.loading { color: #888; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
.card { background: white; border-radius: 10px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.card-name { font-weight: 600; font-size: 0.95rem; }
.badges { display: flex; gap: 0.3rem; }
.img-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 0.75rem; }
.img-item { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
.img-item img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 6px; border: 1px solid #eee; background: #f7f8fa; }
.img-label { font-size: 0.7rem; color: #888; }
.card-actions { display: flex; gap: 0.4rem; }
.empty { text-align: center; color: #aaa; padding: 3rem; background: white; border-radius: 10px; grid-column: 1/-1; }
.badge { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600; }
.badge-purple { background: #faf0ff; color: #805ad5; }
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
.img-field { display: flex; flex-direction: column; gap: 0.3rem; }
.img-field-row { display: flex; gap: 0.5rem; align-items: center; }
.img-field-row input { flex: 1; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; background: #f7f8fa; }
.upload-btn-sm { padding: 0.4rem 0.75rem; background: #4a6cf7; color: white; border-radius: 6px; cursor: pointer; font-size: 0.8rem; white-space: nowrap; flex-shrink: 0; }
.upload-btn-sm.disabled { opacity: 0.5; cursor: not-allowed; }
.preview { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid #eee; }
.check-row { display: flex; gap: 1rem; margin-top: 0.25rem; }
.check-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; cursor: pointer; font-weight: normal !important; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
</style>
