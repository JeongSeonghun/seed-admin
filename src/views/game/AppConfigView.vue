<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'

interface AppConfig {
  key: string
  value: string | null
  description: string | null
  updatedAt: string
}

const configs = ref<AppConfig[]>([])
const loading = ref(true)
const editingKey = ref<string | null>(null)
const editValue = ref('')
const saving = ref(false)
const uploadingKey = ref<string | null>(null)

const IMAGE_KEYS = ['login_bg_url']

async function load() {
  loading.value = true
  try { configs.value = (await api.getAppConfigs()).data }
  finally { loading.value = false }
}
onMounted(load)

function startEdit(config: AppConfig) {
  editingKey.value = config.key
  editValue.value = config.value ?? ''
}

function cancelEdit() {
  editingKey.value = null
  editValue.value = ''
}

async function save(key: string) {
  saving.value = true
  try {
    await api.updateAppConfig(key, editValue.value)
    await load()
    editingKey.value = null
  } catch (e: any) { alert(e?.response?.data?.message ?? '저장 실패') }
  finally { saving.value = false }
}

async function uploadImage(key: string, e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingKey.value = key
  try {
    const { data } = await api.uploadImage(file)
    editValue.value = data.url
  } finally {
    uploadingKey.value = null;
    (e.target as HTMLInputElement).value = ''
  }
}
</script>

<template>
  <div>
    <div v-if="loading" class="loading">불러오는 중...</div>
    <div v-else class="config-list">
      <div v-for="config in configs" :key="config.key" class="config-card">
        <div class="config-header">
          <div>
            <span class="config-key">{{ config.key }}</span>
            <span v-if="config.description" class="config-desc">{{ config.description }}</span>
          </div>
          <span class="config-updated">{{ new Date(config.updatedAt).toLocaleString('ko-KR') }}</span>
        </div>

        <div v-if="editingKey === config.key" class="edit-area">
          <div v-if="IMAGE_KEYS.includes(config.key)" class="img-edit">
            <div class="img-edit-row">
              <input v-model="editValue" type="text" placeholder="이미지 URL" class="value-input" />
              <label class="upload-btn" :class="{ disabled: uploadingKey === config.key }">
                {{ uploadingKey === config.key ? '업로드 중...' : '업로드' }}
                <input type="file" accept="image/*" hidden :disabled="uploadingKey !== null" @change="uploadImage(config.key, $event)" />
              </label>
            </div>
            <img v-if="editValue" :src="editValue" class="preview" alt="미리보기" />
          </div>
          <input v-else v-model="editValue" type="text" class="value-input" />
          <div class="edit-actions">
            <button class="btn-ghost" @click="cancelEdit">취소</button>
            <button class="btn-primary" :disabled="saving" @click="save(config.key)">{{ saving ? '저장 중...' : '저장' }}</button>
          </div>
        </div>

        <div v-else class="value-area">
          <div v-if="IMAGE_KEYS.includes(config.key) && config.value" class="img-preview-row">
            <img :src="config.value" class="preview" alt="" />
            <span class="value-text">{{ config.value }}</span>
          </div>
          <span v-else class="value-text empty">{{ config.value || '(없음)' }}</span>
          <button class="btn-sm" @click="startEdit(config)">편집</button>
        </div>
      </div>
      <div v-if="!configs.length" class="empty">설정 항목이 없습니다.</div>
    </div>
  </div>
</template>

<style scoped>
.loading { color: #888; }
.config-list { display: flex; flex-direction: column; gap: 0.75rem; }
.config-card { background: white; border-radius: 10px; padding: 1.25rem 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.config-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
.config-key { font-family: monospace; font-size: 0.9rem; font-weight: 700; color: #1a1a2e; }
.config-desc { margin-left: 0.75rem; font-size: 0.8rem; color: #888; }
.config-updated { font-size: 0.75rem; color: #aaa; white-space: nowrap; }
.value-area { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.img-preview-row { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0; }
.value-text { font-size: 0.875rem; color: #444; word-break: break-all; flex: 1; min-width: 0; }
.value-text.empty { color: #bbb; }
.edit-area { display: flex; flex-direction: column; gap: 0.5rem; }
.img-edit-row { display: flex; gap: 0.5rem; align-items: center; }
.value-input { flex: 1; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; width: 100%; box-sizing: border-box; }
.preview { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid #eee; flex-shrink: 0; }
.edit-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
.upload-btn { padding: 0.45rem 0.75rem; background: #4a6cf7; color: white; border-radius: 6px; cursor: pointer; font-size: 0.8rem; white-space: nowrap; flex-shrink: 0; }
.upload-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { padding: 0.45rem 1rem; background: #4a6cf7; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
.btn-primary:hover { background: #3a5ce5; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost { padding: 0.45rem 1rem; background: transparent; border: 1px solid #ccc; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
.btn-sm { padding: 0.25rem 0.65rem; background: #f0f2f5; border: 1px solid #e2e8f0; border-radius: 4px; cursor: pointer; font-size: 0.8rem; flex-shrink: 0; }
.btn-sm:hover { background: #e2e8f0; }
.empty { text-align: center; color: #aaa; padding: 2rem; background: white; border-radius: 10px; }
</style>
