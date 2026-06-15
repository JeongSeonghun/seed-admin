<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'

interface BundleItem { bundleId: number; packageId: number }
interface Bundle {
  id: number; name: string; description: string | null
  coinPrice: number; isActive: boolean; items: BundleItem[]
}

const bundles = ref<Bundle[]>([])
const loading = ref(true)
const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const form = ref({
  id: 0, name: '', description: '', coinPrice: 0, isActive: true,
  packageIdsStr: '',
})

async function load() {
  loading.value = true
  try { bundles.value = (await api.getGameBundles()).data }
  finally { loading.value = false }
}
onMounted(load)

function openCreate() {
  isEdit.value = false
  form.value = { id: 0, name: '', description: '', coinPrice: 0, isActive: true, packageIdsStr: '' }
  showModal.value = true
}

function openEdit(b: Bundle) {
  isEdit.value = true
  form.value = {
    id: b.id, name: b.name, description: b.description ?? '',
    coinPrice: b.coinPrice, isActive: b.isActive,
    packageIdsStr: b.items.map((i) => i.packageId).join(', '),
  }
  showModal.value = true
}

function parsePackageIds(): number[] {
  return form.value.packageIdsStr
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0)
}

async function save() {
  saving.value = true
  try {
    const packageIds = parsePackageIds()
    if (!packageIds.length) { alert('패키지 ID를 1개 이상 입력해주세요.'); return }
    const body = { name: form.value.name, description: form.value.description || undefined, coinPrice: form.value.coinPrice, isActive: form.value.isActive, packageIds }
    if (isEdit.value) await api.updateGameBundle(form.value.id, body)
    else await api.createGameBundle(body)
    showModal.value = false
    await load()
  } catch (e: any) { alert(e?.response?.data?.message ?? '저장 실패') }
  finally { saving.value = false }
}

async function remove(b: Bundle) {
  if (!confirm(`"${b.name}" 번들을 삭제하시겠습니까?`)) return
  await api.deleteGameBundle(b.id)
  await load()
}
</script>

<template>
  <div>
    <div class="toolbar">
      <button class="btn-primary" @click="openCreate">+ 번들 추가</button>
    </div>
    <div v-if="loading" class="loading">불러오는 중...</div>
    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr><th>이름</th><th>설명</th><th>코인</th><th>포함 패키지 ID</th><th>활성</th><th>액션</th></tr>
        </thead>
        <tbody>
          <tr v-for="b in bundles" :key="b.id">
            <td>{{ b.name }}</td>
            <td class="desc-cell">{{ b.description ?? '-' }}</td>
            <td>{{ b.coinPrice }}</td>
            <td class="id-cell">{{ b.items.map(i => i.packageId).join(', ') || '-' }}</td>
            <td><span class="badge" :class="b.isActive ? 'badge-green' : 'badge-gray'">{{ b.isActive ? '활성' : '비활성' }}</span></td>
            <td>
              <button class="btn-sm" @click="openEdit(b)">편집</button>
              <button class="btn-sm btn-danger" @click="remove(b)">삭제</button>
            </td>
          </tr>
          <tr v-if="!bundles.length"><td colspan="6" class="empty">번들이 없습니다.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ isEdit ? '번들 편집' : '번들 추가' }}</h3>
        <label>이름 *</label>
        <input v-model="form.name" type="text" placeholder="번들 이름" />
        <label>설명</label>
        <input v-model="form.description" type="text" placeholder="선택 사항" />
        <div class="form-row">
          <div class="form-col">
            <label>코인 가격</label>
            <input v-model.number="form.coinPrice" type="number" min="0" />
          </div>
        </div>
        <label>포함 패키지 ID <span class="hint">쉼표로 구분 (예: 1, 2, 3)</span></label>
        <input v-model="form.packageIdsStr" type="text" placeholder="1, 2, 3" />
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
.toolbar { display: flex; justify-content: flex-end; margin-bottom: 1rem; }
.loading { color: #888; }
.table-wrap { background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.7rem 1rem; text-align: left; font-size: 0.875rem; }
th { background: #f7f8fa; font-weight: 600; color: #555; border-bottom: 1px solid #eee; }
td { border-bottom: 1px solid #f0f0f0; }
tr:last-child td { border-bottom: none; }
.desc-cell { color: #666; font-size: 0.825rem; max-width: 200px; }
.id-cell { font-family: monospace; font-size: 0.8rem; color: #555; }
.empty { text-align: center; color: #aaa; padding: 2rem; }
.badge { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600; }
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
.modal { background: white; border-radius: 12px; padding: 1.75rem 2rem; width: 440px; max-width: 95vw; display: flex; flex-direction: column; gap: 0.5rem; }
.modal h3 { font-size: 1.1rem; color: #1a1a2e; margin-bottom: 0.5rem; }
.form-row { display: flex; gap: 0.75rem; }
.form-col { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; }
.modal label { font-size: 0.8rem; font-weight: 600; color: #555; margin-top: 0.3rem; }
.modal input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; box-sizing: border-box; }
.hint { font-size: 0.75rem; color: #aaa; font-weight: 400; }
.check-row { display: flex; gap: 1rem; margin-top: 0.25rem; }
.check-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; cursor: pointer; font-weight: normal !important; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
</style>
