<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/network'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

async function handleLogin() {
  errorMsg.value = ''
  loading.value = true
  try {
    const res = await api.adminLogin({ email: email.value, password: password.value })
    auth.setTokens(res.data.accessToken, res.data.refreshToken)
    router.push({ name: 'dashboard' })
  } catch (e: any) {
    errorMsg.value = e.response?.data?.message ?? '로그인에 실패했습니다.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <div class="login-box">
      <h2>SEED Admin</h2>
      <form @submit.prevent="handleLogin">
        <div class="field">
          <label>이메일</label>
          <input v-model="email" type="email" placeholder="admin@example.com" required />
        </div>
        <div class="field">
          <label>비밀번호</label>
          <input v-model="password" type="password" placeholder="••••••" required />
        </div>
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
        <button type="submit" :disabled="loading">
          {{ loading ? '로그인 중...' : '로그인' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}
.login-box {
  background: white;
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 360px;
}
h2 {
  text-align: center;
  margin: 0 0 2rem;
  color: #1a1a2e;
  font-size: 1.6rem;
}
.field {
  margin-bottom: 1rem;
}
label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
  color: #444;
}
input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
input:focus {
  outline: none;
  border-color: #4a6cf7;
}
.error {
  color: #e53e3e;
  font-size: 0.85rem;
  margin: 0 0 0.5rem;
}
button {
  width: 100%;
  padding: 0.75rem;
  background: #4a6cf7;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: background 0.2s;
}
button:hover:not(:disabled) {
  background: #3a5ce5;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
