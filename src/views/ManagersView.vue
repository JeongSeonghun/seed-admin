<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'

interface User {
  id: number
  email: string
  name: string
  phone: string
  roles: string[]
  services: { id: number; name: string; label: string; status: string }[]
}

const users = ref<User[]>([])
const loading = ref(true)
const errorMsg = ref('')

const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const form = ref({ id: 0, email: '', password: '', name: '', phone: '', roles: ['ADMIN'] as string[] })

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await api.getUsers('admin')
    users.value = res.data
  } catch {
    errorMsg.value = '목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openCreate() {
  isEdit.value = false
  form.value = { id: 0, email: '', password: '', name: '', phone: '', roles: ['ADMIN'] }
  showModal.value = true
}

function openEdit(u: User) {
  isEdit.value = true
  form.value = { id: u.id, email: u.email, password: '', name: u.name ?? '', phone: u.phone ?? '', roles: [...u.roles] }
  showModal.value = true
}

function toggleRole(role: string) {
  const idx = form.value.roles.indexOf(role)
  if (idx >= 0) {
    form.value.roles.splice(idx, 1)
  } else {
    form.value.roles.push(role)
  }
}

async function save() {
  saving.value = true
  try {
    if (isEdit.value) {
      const body: Record<string, unknown> = {}
      if (form.value.name) body.name = form.value.name
      if (form.value.phone) body.phone = form.value.phone
      if (form.value.password) body.password = form.value.password
      await api.updateUser(form.value.id, body)
      await api.updateUserRoles(form.value.id, form.value.roles)
    } else {
      await api.createUser({
        email: form.value.email,
        password: form.value.password,
        name: form.value.name || undefined,
        phone: form.value.phone || undefined,
        roles: form.value.roles,
      })
    }
    showModal.value = false
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message ?? '저장에 실패했습니다.')
  } finally {
    saving.value = false
  }
}

async function remove(u: User) {
  if (!confirm(`${u.email} 계정을 삭제하시겠습니까?`)) return
  try {
    await api.deleteUser(u.id)
    await load()
  } catch {
    alert('삭제에 실패했습니다.')
  }
}
</script>

<template>
  <div>
    <div class="toolbar">
      <button class="btn-primary" @click="openCreate">+ 관리자 추가</button>
    </div>

    <div v-if="loading" class="loading">불러오는 중...</div>
    <p v-else-if="errorMsg" class="error">{{ errorMsg }}</p>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>이메일</th>
            <th>이름</th>
            <th>역할</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.id }}</td>
            <td>{{ u.email }}</td>
            <td>{{ u.name || '-' }}</td>
            <td>
              <span v-for="r in u.roles" :key="r" class="badge" :class="r === 'SUPER_ADMIN' ? 'badge-purple' : 'badge-blue'">
                {{ r }}
              </span>
            </td>
            <td>
              <button class="btn-sm" @click="openEdit(u)">편집</button>
              <button class="btn-sm btn-danger" @click="remove(u)">삭제</button>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="5" class="empty">관리자가 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ isEdit ? '관리자 편집' : '관리자 추가' }}</h3>

        <label>이메일</label>
        <input v-model="form.email" type="email" :disabled="isEdit" placeholder="admin@example.com" />

        <label>비밀번호 {{ isEdit ? '(변경 시 입력)' : '' }}</label>
        <input v-model="form.password" type="password" placeholder="6자 이상" />

        <label>이름</label>
        <input v-model="form.name" type="text" placeholder="홍길동" />

        <label>전화번호</label>
        <input v-model="form.phone" type="text" placeholder="010-1234-5678" />

        <label>역할</label>
        <div class="role-checks">
          <label class="check-label">
            <input type="checkbox" :checked="form.roles.includes('ADMIN')" @change="toggleRole('ADMIN')" />
            ADMIN
          </label>
          <label class="check-label">
            <input type="checkbox" :checked="form.roles.includes('SUPER_ADMIN')" @change="toggleRole('SUPER_ADMIN')" />
            SUPER_ADMIN
          </label>
        </div>

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
.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}
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

.badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 4px;
}
.badge-blue { background: #ebf4ff; color: #2b6cb0; }
.badge-purple { background: #faf0ff; color: #6b46c1; }

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
  width: 420px;
  max-width: 95vw;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.modal h3 { margin-bottom: 0.5rem; font-size: 1.1rem; color: #1a1a2e; }
.modal label { font-size: 0.8rem; font-weight: 600; color: #555; margin-top: 0.4rem; }
.modal input[type="email"],
.modal input[type="password"],
.modal input[type="text"] {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.875rem;
}
.modal input:disabled { background: #f7f8fa; color: #888; }
.role-checks { display: flex; gap: 1.5rem; }
.check-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
</style>
