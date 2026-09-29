<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'

interface Character {
  id: number
  name: string
  normalUrl: string
  hitUrl: string
  criticalUrl: string
  deadUrl: string
  coinPrice: number | null
  contentCategory: 'GENERAL' | 'ADULT'
  rarity: 'COMMON' | 'RARE'
  isDefault: boolean
  isActive: boolean
}

const characters = ref<Character[]>([])
const loading = ref(true)
const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const uploadingField = ref<string | null>(null)
// 목록 대표 이미지(normalUrl)가 깨진 URL이면 <img>가 계속 깨진 아이콘으로 남으니, 로드 실패한
// 캐릭터 id를 기록해두고 플레이스홀더로 대체한다.
const brokenThumbIds = ref(new Set<number>())

const form = ref({
  id: 0,
  name: '',
  normalUrl: '',
  hitUrl: '',
  criticalUrl: '',
  deadUrl: '',
  coinPrice: null as number | null,
  contentCategory: 'GENERAL' as 'GENERAL' | 'ADULT',
  rarity: 'COMMON' as 'COMMON' | 'RARE',
  isDefault: false,
  isActive: true,
})

async function load() {
  loading.value = true
  try { const res = await api.getGameCharacters(); characters.value = res.data }
  finally { loading.value = false }
}
onMounted(load)

function openCreate() {
  isEdit.value = false
  form.value = { id: 0, name: '', normalUrl: '', hitUrl: '', criticalUrl: '', deadUrl: '', coinPrice: null, contentCategory: 'GENERAL', rarity: 'COMMON', isDefault: false, isActive: true }
  showModal.value = true
}

function openEdit(c: Character) {
  isEdit.value = true
  form.value = { id: c.id, name: c.name, normalUrl: c.normalUrl, hitUrl: c.hitUrl, criticalUrl: c.criticalUrl, deadUrl: c.deadUrl, coinPrice: c.coinPrice, contentCategory: c.contentCategory, rarity: c.rarity, isDefault: c.isDefault, isActive: c.isActive }
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
    const coinPrice = form.value.coinPrice === null || (form.value.coinPrice as unknown) === '' ? null : form.value.coinPrice
    const body = { name: form.value.name, normalUrl: form.value.normalUrl, hitUrl: form.value.hitUrl, criticalUrl: form.value.criticalUrl, deadUrl: form.value.deadUrl, coinPrice, contentCategory: form.value.contentCategory, rarity: form.value.rarity, isDefault: form.value.isDefault, isActive: form.value.isActive }
    if (isEdit.value) await api.updateGameCharacter(form.value.id, body)
    else await api.createGameCharacter(body)
    showModal.value = false
    await load()
  } catch (e: any) { alert(e?.response?.data?.message ?? '저장 실패') }
  finally { saving.value = false }
}

async function remove(c: Character) {
  if (!confirm(`"${c.name}" 캐릭터를 삭제하시겠습니까?`)) return
  await api.deleteGameCharacter(c.id)
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
      <div v-for="c in characters" :key="c.id" class="card">
        <div class="thumb-wrap">
          <img
            v-if="c.normalUrl && !brokenThumbIds.has(c.id)"
            :src="c.normalUrl" alt="" class="thumb"
            @error="brokenThumbIds.add(c.id)"
          />
          <div v-else class="thumb placeholder">이미지 없음</div>
        </div>
        <div class="card-header">
          <span class="card-name">{{ c.name }} <span class="id-tag">#{{ c.id }}</span></span>
          <div class="badges">
            <span v-if="c.isDefault" class="badge badge-purple">기본</span>
            <span v-if="c.rarity === 'RARE'" class="badge badge-rare">RARE</span>
            <span v-if="c.coinPrice !== null" class="badge badge-yellow">{{ c.coinPrice }}코인</span>
            <span class="badge" :class="c.contentCategory === 'ADULT' ? 'badge-adult' : 'badge-gray'">{{ c.contentCategory === 'ADULT' ? '성인' : '일반' }}</span>
            <span class="badge" :class="c.isActive ? 'badge-green' : 'badge-gray'">{{ c.isActive ? '활성' : '비활성' }}</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn-sm" @click="openEdit(c)">편집</button>
          <button class="btn-sm btn-danger" @click="remove(c)">삭제</button>
        </div>
      </div>
      <div v-if="!characters.length" class="empty">캐릭터 이미지가 없습니다.</div>
    </div>

    <div v-if="showModal" class="overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ isEdit ? '캐릭터 편집' : '캐릭터 추가' }} <span v-if="isEdit" class="id-tag">#{{ form.id }}</span></h3>
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

        <label>코인 가격 <span class="hint">비워두면 상점에 미노출 (보상/기본 전용)</span></label>
        <input v-model.number="form.coinPrice" type="number" min="0" placeholder="예: 100 (비우면 판매 안 함)" />
        <label>카테고리</label>
        <select v-model="form.contentCategory">
          <option value="GENERAL">일반</option>
          <option value="ADULT">성인</option>
        </select>
        <label>등급 <span class="hint">RARE는 스테이지 보상에서 확률+천장 판정을 거침</span></label>
        <select v-model="form.rarity">
          <option value="COMMON">COMMON (확정 지급)</option>
          <option value="RARE">RARE (확률 지급)</option>
        </select>
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
.card { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.thumb-wrap { width: 100%; aspect-ratio: 1; background: #f7f8fa; }
.thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
.thumb.placeholder { display: flex; align-items: center; justify-content: center; color: #bbb; font-size: 0.8rem; }
.card-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem 0; margin-bottom: 0.75rem; }
.card-name { font-weight: 600; font-size: 0.95rem; }
.id-tag { font-weight: 400; font-size: 0.75rem; color: #aaa; }
.badges { display: flex; gap: 0.3rem; }
.card-actions { display: flex; gap: 0.4rem; padding: 0 1rem 1rem; }
.empty { text-align: center; color: #aaa; padding: 3rem; background: white; border-radius: 10px; grid-column: 1/-1; }
.badge { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600; }
.badge-purple { background: #faf0ff; color: #805ad5; }
.badge-yellow { background: #fffbeb; color: #b7791f; }
.badge-green { background: #f0fff4; color: #276749; }
.badge-gray { background: #f0f0f0; color: #888; }
.badge-adult { background: #fff0f0; color: #c53030; }
.badge-rare { background: #eef2ff; color: #4338ca; }
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
