<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/network'

interface ServiceAccess {
  id: number
  name: string
  label: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

interface User {
  id: number
  email: string
  name: string
  phone: string
  isAdultVerified: boolean
  isGuest: boolean
  guestAvailableAt: string | null
  roles: string[]
  services: ServiceAccess[]
}

interface Service {
  id: number
  name: string
  label: string
}

const users = ref<User[]>([])
const services = ref<Service[]>([])
const loading = ref(true)
const errorMsg = ref('')
// 포트폴리오/체험용 게스트 계정 풀은 기본으로 숨겨서 실제 사용자 목록을 깔끔하게 유지한다.
const showGuests = ref(false)

const guestCount = computed(() => users.value.filter(u => u.isGuest).length)
const visibleUsers = computed(() =>
  showGuests.value ? users.value : users.value.filter(u => !u.isGuest),
)

function guestStatus(u: User): { label: string; className: string } {
  if (!u.guestAvailableAt || new Date(u.guestAvailableAt) <= new Date()) {
    return { label: '배정 가능', className: 'badge-gray' }
  }
  const until = new Date(u.guestAvailableAt).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return { label: `사용 중 · ${until}까지`, className: 'badge-yellow' }
}

const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const form = ref({
  id: 0,
  email: '',
  password: '',
  name: '',
  phone: '',
  serviceIds: [] as number[],
})

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [usersRes, svcsRes] = await Promise.all([api.getUsers('user'), api.getServices()])
    users.value = usersRes.data
    services.value = svcsRes.data
  } catch {
    errorMsg.value = '목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openCreate() {
  isEdit.value = false
  form.value = { id: 0, email: '', password: '', name: '', phone: '', serviceIds: [] }
  showModal.value = true
}

function openEdit(u: User) {
  isEdit.value = true
  form.value = {
    id: u.id,
    email: u.email,
    password: '',
    name: u.name ?? '',
    phone: u.phone ?? '',
    serviceIds: u.services.filter(s => s.status === 'APPROVED').map(s => s.id),
  }
  showModal.value = true
}

function toggleService(id: number) {
  const idx = form.value.serviceIds.indexOf(id)
  if (idx >= 0) form.value.serviceIds.splice(idx, 1)
  else form.value.serviceIds.push(id)
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

      for (const svc of services.value) {
        const approved = form.value.serviceIds.includes(svc.id)
        await api.updateServiceAccess(form.value.id, svc.id, approved ? 'APPROVED' : 'REJECTED')
      }
    } else {
      await api.createUser({
        email: form.value.email,
        password: form.value.password,
        name: form.value.name || undefined,
        phone: form.value.phone || undefined,
        roles: ['USER'],
        serviceIds: form.value.serviceIds,
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

async function setServiceStatus(userId: number, serviceId: number, status: 'APPROVED' | 'REJECTED') {
  try {
    await api.updateServiceAccess(userId, serviceId, status)
    await load()
  } catch {
    alert('상태 변경에 실패했습니다.')
  }
}

async function toggleAdultVerified(u: User) {
  try {
    await api.updateUser(u.id, { isAdultVerified: !u.isAdultVerified })
    await load()
  } catch {
    alert('성인인증 변경에 실패했습니다.')
  }
}

const statusLabel: Record<string, string> = { PENDING: '대기', APPROVED: '승인', REJECTED: '거절' }
const statusClass: Record<string, string> = { PENDING: 'badge-yellow', APPROVED: 'badge-green', REJECTED: 'badge-red' }
</script>

<template>
  <div>
    <div class="toolbar">
      <label class="check-label guest-toggle">
        <input type="checkbox" v-model="showGuests" />
        게스트 계정 표시 ({{ guestCount }})
      </label>
      <button class="btn-primary" @click="openCreate">+ 사용자 추가</button>
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
            <th>성인인증</th>
            <th>서비스 접근</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in visibleUsers" :key="u.id">
            <td>{{ u.id }}</td>
            <td>
              {{ u.email }}
              <template v-if="u.isGuest">
                <br />
                <span class="badge badge-guest">게스트</span>
                <span class="badge" :class="guestStatus(u).className">{{ guestStatus(u).label }}</span>
              </template>
            </td>
            <td>{{ u.name || '-' }}</td>
            <td>
              <span class="badge" :class="u.isAdultVerified ? 'badge-adult' : 'badge-gray'">
                {{ u.isAdultVerified ? '인증됨' : '미인증' }}
              </span>
              <button class="btn-xs" :class="u.isAdultVerified ? 'btn-reject' : 'btn-approve'" @click="toggleAdultVerified(u)">
                {{ u.isAdultVerified ? '해제' : '인증' }}
              </button>
            </td>
            <td>
              <div v-if="u.services.length === 0" class="no-svc">없음</div>
              <div v-for="s in u.services" :key="s.id" class="svc-row">
                <span class="badge" :class="statusClass[s.status]">{{ statusLabel[s.status] }}</span>
                <span class="svc-name">{{ s.label }}</span>
                <button v-if="s.status !== 'APPROVED'" class="btn-xs btn-approve" @click="setServiceStatus(u.id, s.id, 'APPROVED')">승인</button>
                <button v-if="s.status !== 'REJECTED'" class="btn-xs btn-reject" @click="setServiceStatus(u.id, s.id, 'REJECTED')">거절</button>
              </div>
            </td>
            <td>
              <button class="btn-sm" @click="openEdit(u)">편집</button>
              <button class="btn-sm btn-danger" @click="remove(u)">삭제</button>
            </td>
          </tr>
          <tr v-if="visibleUsers.length === 0">
            <td colspan="6" class="empty">사용자가 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ isEdit ? '사용자 편집' : '사용자 추가' }}</h3>

        <label>이메일</label>
        <input v-model="form.email" type="email" :disabled="isEdit" placeholder="user@example.com" />

        <label>비밀번호 {{ isEdit ? '(변경 시 입력)' : '' }}</label>
        <input v-model="form.password" type="password" placeholder="6자 이상" />

        <label>이름</label>
        <input v-model="form.name" type="text" placeholder="홍길동" />

        <label>전화번호</label>
        <input v-model="form.phone" type="text" placeholder="010-1234-5678" />

        <label>서비스 접근 (즉시 승인)</label>
        <div class="svc-checks">
          <label v-for="s in services" :key="s.id" class="check-label">
            <input type="checkbox" :checked="form.serviceIds.includes(s.id)" @change="toggleService(s.id)" />
            {{ s.label }}
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
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.guest-toggle { font-size: 0.85rem; color: #555; }
.loading { color: #888; }
.error { color: #e53e3e; }

.table-wrap {
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  overflow: hidden;
}
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.75rem 1rem; text-align: left; font-size: 0.875rem; vertical-align: top; }
th { background: #f7f8fa; font-weight: 600; color: #555; border-bottom: 1px solid #eee; }
td { border-bottom: 1px solid #f0f0f0; color: #333; }
tr:last-child td { border-bottom: none; }
.empty { text-align: center; color: #aaa; padding: 2rem; }

.badge {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-right: 4px;
}
.badge-green { background: #f0fff4; color: #276749; }
.badge-yellow { background: #fffff0; color: #975a16; }
.badge-red { background: #fff5f5; color: #c53030; }
.badge-gray { background: #f0f0f0; color: #888; }
.badge-adult { background: #fff0f0; color: #c53030; }
.badge-guest { background: #ede9fe; color: #6d28d9; }

.svc-row { display: flex; align-items: center; gap: 4px; margin-bottom: 4px; }
.svc-name { font-size: 0.8rem; color: #555; flex: 1; }
.no-svc { font-size: 0.8rem; color: #aaa; }

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
.btn-xs {
  padding: 0.15rem 0.45rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.7rem;
}
.btn-approve { background: #c6f6d5; color: #276749; }
.btn-approve:hover { background: #9ae6b4; }
.btn-reject { background: #fed7d7; color: #c53030; }
.btn-reject:hover { background: #feb2b2; }

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
.svc-checks { display: flex; gap: 1rem; flex-wrap: wrap; }
.check-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
</style>
