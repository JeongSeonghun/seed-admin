<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'

interface Notice {
  id: number
  title: string
  content: string
  serviceTarget: string | null
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

interface Service { id: number; name: string; label: string }

const notices = ref<Notice[]>([])
const services = ref<Service[]>([])
const loading = ref(true)
const errorMsg = ref('')

const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const form = ref({ id: 0, title: '', content: '', serviceTarget: '' as string | null, isPublished: false })

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [noticesRes, svcsRes] = await Promise.all([api.getNotices(), api.getServices()])
    notices.value = noticesRes.data
    services.value = svcsRes.data
  } catch {
    errorMsg.value = '목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function serviceLabel(name: string | null) {
  if (!name) return '전체'
  return services.value.find(s => s.name === name)?.label ?? name
}

function openCreate() {
  isEdit.value = false
  form.value = { id: 0, title: '', content: '', serviceTarget: null, isPublished: false }
  showModal.value = true
}

function openEdit(n: Notice) {
  isEdit.value = true
  form.value = { id: n.id, title: n.title, content: n.content, serviceTarget: n.serviceTarget, isPublished: n.isPublished }
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    const body = {
      title: form.value.title,
      content: form.value.content,
      serviceTarget: form.value.serviceTarget || null,
      isPublished: form.value.isPublished,
    }
    if (isEdit.value) await api.updateNotice(form.value.id, body)
    else await api.createNotice(body)
    showModal.value = false
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message ?? '저장에 실패했습니다.')
  } finally {
    saving.value = false
  }
}

async function remove(n: Notice) {
  if (!confirm(`"${n.title}" 공지사항을 삭제하시겠습니까?`)) return
  try {
    await api.deleteNotice(n.id)
    await load()
  } catch {
    alert('삭제에 실패했습니다.')
  }
}

async function togglePublish(n: Notice) {
  try {
    await api.updateNotice(n.id, { isPublished: !n.isPublished })
    await load()
  } catch {
    alert('상태 변경에 실패했습니다.')
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}
</script>

<template>
  <div>
    <div class="toolbar">
      <button class="btn-primary" @click="openCreate">+ 공지사항 추가</button>
    </div>

    <div v-if="loading" class="loading">불러오는 중...</div>
    <p v-else-if="errorMsg" class="error">{{ errorMsg }}</p>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>제목</th>
            <th>대상</th>
            <th>게시 상태</th>
            <th>최종 수정</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in notices" :key="n.id">
            <td>{{ n.id }}</td>
            <td class="title-cell">{{ n.title }}</td>
            <td>
              <span class="badge" :class="n.serviceTarget ? 'badge-blue' : 'badge-gray'">
                {{ serviceLabel(n.serviceTarget) }}
              </span>
            </td>
            <td>
              <button class="toggle-btn" :class="n.isPublished ? 'on' : 'off'" @click="togglePublish(n)">
                {{ n.isPublished ? '게시 중' : '미게시' }}
              </button>
            </td>
            <td class="date-cell">{{ formatDate(n.updatedAt) }}</td>
            <td>
              <button class="btn-sm" @click="openEdit(n)">편집</button>
              <button class="btn-sm btn-danger" @click="remove(n)">삭제</button>
            </td>
          </tr>
          <tr v-if="notices.length === 0">
            <td colspan="6" class="empty">공지사항이 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ isEdit ? '공지사항 편집' : '공지사항 추가' }}</h3>

        <label>제목</label>
        <input v-model="form.title" type="text" placeholder="공지사항 제목" maxlength="200" />

        <label>내용</label>
        <textarea v-model="form.content" rows="8" placeholder="공지사항 내용을 입력하세요." />

        <label>대상 서비스</label>
        <select v-model="form.serviceTarget">
          <option :value="null">전체 (모든 서비스)</option>
          <option v-for="s in services" :key="s.id" :value="s.name">{{ s.label }} ({{ s.name }})</option>
        </select>

        <label class="check-label">
          <input type="checkbox" v-model="form.isPublished" />
          즉시 게시
        </label>

        <div class="modal-actions">
          <button class="btn-ghost" @click="showModal = false">취소</button>
          <button class="btn-primary" :disabled="saving" @click="save">
            {{ saving ? '저장 중...' : '저장' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar { display: flex; justify-content: flex-end; margin-bottom: 1rem; }
.loading { color: #888; }
.error { color: #e53e3e; }

.table-wrap {
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  overflow: hidden;
}
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.75rem 1rem; text-align: left; font-size: 0.875rem; }
th { background: #f7f8fa; font-weight: 600; color: #555; border-bottom: 1px solid #eee; }
td { border-bottom: 1px solid #f0f0f0; color: #333; }
tr:last-child td { border-bottom: none; }
.empty { text-align: center; color: #aaa; padding: 2rem; }
.title-cell { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.date-cell { color: #888; font-size: 0.8rem; white-space: nowrap; }

.badge { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600; }
.badge-blue { background: #ebf4ff; color: #2b6cb0; }
.badge-gray { background: #f0f0f0; color: #888; }

.toggle-btn {
  padding: 0.25rem 0.65rem;
  border: none;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}
.toggle-btn.on { background: #c6f6d5; color: #276749; }
.toggle-btn.off { background: #f0f2f5; color: #888; }

.btn-primary {
  padding: 0.45rem 1rem;
  background: #4a6cf7;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}
.btn-primary:hover { background: #3a5ce5; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost {
  padding: 0.45rem 1rem;
  background: transparent;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}
.btn-sm {
  padding: 0.25rem 0.65rem;
  background: #f0f2f5;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  margin-right: 4px;
}
.btn-sm:hover { background: #e2e8f0; }
.btn-danger { color: #e53e3e; border-color: #fed7d7; }
.btn-danger:hover { background: #fff5f5; }

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: white;
  border-radius: 12px;
  padding: 1.75rem 2rem;
  width: 560px;
  max-width: 95vw;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.modal h3 { margin-bottom: 0.5rem; font-size: 1.1rem; color: #1a1a2e; }
.modal label { font-size: 0.8rem; font-weight: 600; color: #555; margin-top: 0.4rem; }
.modal input[type="text"],
.modal select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.875rem;
}
.modal textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.875rem;
  resize: vertical;
  font-family: inherit;
}
.check-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; cursor: pointer; font-weight: normal !important; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
</style>
