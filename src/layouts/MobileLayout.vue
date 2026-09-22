<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/network'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

async function logout() {
  try { await api.adminLogout() } catch { /* proceed anyway */ }
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="m-layout">
    <header class="m-header">
      <span class="m-title">{{ route.meta.title ?? 'SEED' }}</span>
      <button class="m-logout" @click="logout">로그아웃</button>
    </header>

    <div class="m-content">
      <router-view />
    </div>

    <nav class="m-tabbar">
      <router-link :to="{ name: 'm-smartfarm' }" class="m-tab">
        <span class="m-tab-icon">🌱</span>
        <span>스마트팜</span>
      </router-link>
      <router-link :to="{ name: 'm-notifications' }" class="m-tab">
        <span class="m-tab-icon">🔔</span>
        <span>알림함</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
.m-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
}

.m-header {
  background: white;
  padding: 0.9rem 1.1rem;
  padding-top: max(0.9rem, env(safe-area-inset-top));
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 10;
}

.m-title {
  font-weight: 700;
  font-size: 1.05rem;
  color: #1a1a2e;
}

.m-logout {
  padding: 0.35rem 0.8rem;
  background: transparent;
  border: 1px solid #e53e3e;
  color: #e53e3e;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
}

.m-content {
  flex: 1;
  padding: 1rem;
  padding-bottom: 5.5rem;
}

.m-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  background: white;
  border-top: 1px solid #e2e5ec;
  padding-bottom: env(safe-area-inset-bottom);
}

.m-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.6rem 0;
  color: #8b91b5;
  text-decoration: none;
  font-size: 0.72rem;
}

.m-tab-icon {
  font-size: 1.25rem;
}

.m-tab.router-link-active {
  color: #4a6cf7;
  font-weight: 600;
}
</style>
