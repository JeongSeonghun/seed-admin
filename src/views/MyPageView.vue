<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'

interface Profile {
  id: number
  email: string
  name: string
  phone: string
  roles: string[]
}

const profile = ref<Profile | null>(null)
const loading = ref(true)
const errorMsg = ref('')

const infoForm = ref({ name: '', phone: '' })
const infoSaving = ref(false)
const infoMsg = ref('')

const pwForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const pwSaving = ref(false)
const pwMsg = ref('')
const pwError = ref('')

onMounted(async () => {
  try {
    const res = await api.getMe()
    profile.value = res.data
    infoForm.value.name = res.data.name ?? ''
    infoForm.value.phone = res.data.phone ?? ''
  } catch {
    errorMsg.value = '프로필을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
})

async function saveInfo() {
  infoSaving.value = true
  infoMsg.value = ''
  try {
    await api.updateMe({ name: infoForm.value.name, phone: infoForm.value.phone })
    infoMsg.value = '저장되었습니다.'
  } catch {
    infoMsg.value = '저장에 실패했습니다.'
  } finally {
    infoSaving.value = false
  }
}

async function changePassword() {
  pwMsg.value = ''
  pwError.value = ''

  if (pwForm.value.newPassword !== pwForm.value.confirmPassword) {
    pwError.value = '새 비밀번호가 일치하지 않습니다.'
    return
  }
  if (pwForm.value.newPassword.length < 6) {
    pwError.value = '새 비밀번호는 6자 이상이어야 합니다.'
    return
  }

  pwSaving.value = true
  try {
    await api.changeMyPassword(pwForm.value.currentPassword, pwForm.value.newPassword)
    pwMsg.value = '비밀번호가 변경되었습니다.'
    pwForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (e: any) {
    pwError.value = e?.response?.data?.message ?? '변경에 실패했습니다.'
  } finally {
    pwSaving.value = false
  }
}
</script>

<template>
  <div class="page">
    <div v-if="loading" class="loading">불러오는 중...</div>
    <p v-else-if="errorMsg" class="error">{{ errorMsg }}</p>

    <template v-else-if="profile">
      <!-- 프로필 정보 -->
      <div class="card">
        <h3>계정 정보</h3>
        <div class="field-row">
          <span class="field-label">이메일</span>
          <span class="field-value">{{ profile.email }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">역할</span>
          <span class="field-value">
            <span v-for="r in profile.roles" :key="r" class="badge">{{ r }}</span>
          </span>
        </div>
      </div>

      <!-- 내 정보 수정 -->
      <div class="card">
        <h3>내 정보 수정</h3>
        <label>이름</label>
        <input v-model="infoForm.name" type="text" placeholder="홍길동" />
        <label>전화번호</label>
        <input v-model="infoForm.phone" type="text" placeholder="010-1234-5678" />
        <div class="form-footer">
          <span class="msg-ok" v-if="infoMsg">{{ infoMsg }}</span>
          <button class="btn-primary" :disabled="infoSaving" @click="saveInfo">
            {{ infoSaving ? '저장 중...' : '저장' }}
          </button>
        </div>
      </div>

      <!-- 비밀번호 변경 -->
      <div class="card">
        <h3>비밀번호 변경</h3>
        <label>현재 비밀번호</label>
        <input v-model="pwForm.currentPassword" type="password" />
        <label>새 비밀번호</label>
        <input v-model="pwForm.newPassword" type="password" placeholder="6자 이상" />
        <label>새 비밀번호 확인</label>
        <input v-model="pwForm.confirmPassword" type="password" />
        <div class="form-footer">
          <span class="msg-ok" v-if="pwMsg">{{ pwMsg }}</span>
          <span class="msg-err" v-if="pwError">{{ pwError }}</span>
          <button class="btn-primary" :disabled="pwSaving" @click="changePassword">
            {{ pwSaving ? '변경 중...' : '비밀번호 변경' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 1.25rem; max-width: 520px; }
.loading { color: #888; }
.error { color: #e53e3e; }

.card {
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.card h3 { font-size: 1rem; color: #1a1a2e; margin-bottom: 0.4rem; }

.field-row { display: flex; align-items: center; gap: 1rem; font-size: 0.875rem; }
.field-label { width: 60px; color: #888; font-weight: 600; flex-shrink: 0; }
.field-value { color: #333; }

.badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #faf0ff;
  color: #6b46c1;
  margin-right: 4px;
}

label { font-size: 0.8rem; font-weight: 600; color: #555; margin-top: 0.25rem; }
input[type="text"],
input[type="password"] {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
.msg-ok { font-size: 0.825rem; color: #276749; }
.msg-err { font-size: 0.825rem; color: #e53e3e; }

.btn-primary {
  padding: 0.45rem 1.1rem;
  background: #4a6cf7;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}
.btn-primary:hover { background: #3a5ce5; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
