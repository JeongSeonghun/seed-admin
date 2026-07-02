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
  <div class="layout">
    <aside class="sidebar">
      <div class="logo">SEED Admin</div>
      <nav>
        <router-link :to="{ name: 'dashboard' }" class="nav-item">대시보드</router-link>
        <router-link :to="{ name: 'managers' }" class="nav-item">관리자 관리</router-link>
        <router-link :to="{ name: 'users' }" class="nav-item">사용자 관리</router-link>
        <div class="nav-divider" />
        <router-link :to="{ name: 'services' }" class="nav-item">서비스 관리</router-link>
        <router-link :to="{ name: 'notices' }" class="nav-item">공지사항</router-link>
        <router-link :to="{ name: 'monitor' }" class="nav-item">서버 모니터링</router-link>
        <router-link :to="{ name: 'versions' }" class="nav-item">버전 관리</router-link>
        <div class="nav-divider" />
        <div class="nav-section">게임 관리</div>
        <router-link :to="{ name: 'game-words' }" class="nav-item nav-sub">단어</router-link>
        <router-link :to="{ name: 'game-stages' }" class="nav-item nav-sub">스테이지</router-link>
        <router-link :to="{ name: 'game-scene-packs' }" class="nav-item nav-sub">씬 팩</router-link>
        <router-link :to="{ name: 'game-bundles' }" class="nav-item nav-sub">번들</router-link>
        <router-link :to="{ name: 'game-characters' }" class="nav-item nav-sub">캐릭터</router-link>
        <router-link :to="{ name: 'game-app-config' }" class="nav-item nav-sub">앱 설정</router-link>
        <div class="nav-divider" />
        <router-link :to="{ name: 'push' }" class="nav-item">푸시 알림</router-link>
        <div class="nav-divider" />
        <div class="nav-section">스마트팜</div>
        <router-link :to="{ name: 'smartfarm' }" class="nav-item nav-sub">디바이스 관리</router-link>
        <div class="nav-divider" />
        <div class="nav-section">AI Agent</div>
        <router-link :to="{ name: 'agent' }" class="nav-item nav-sub">Agent 콘솔</router-link>
        <router-link :to="{ name: 'agent-prompts' }" class="nav-item nav-sub">프롬프트 관리</router-link>
        <router-link :to="{ name: 'agent-logs' }" class="nav-item nav-sub">로그 조회</router-link>
        <div class="nav-divider" />
        <router-link :to="{ name: 'my' }" class="nav-item">내 정보</router-link>
      </nav>
    </aside>

    <div class="main">
      <header class="header">
        <span class="page-title">{{ route.meta.title }}</span>
        <button class="logout-btn" @click="logout">로그아웃</button>
      </header>
      <div class="content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}
.sidebar {
  width: 220px;
  background: #1a1a2e;
  color: white;
  padding: 1.5rem 1rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
.logo {
  font-size: 1.2rem;
  font-weight: 700;
  color: #4a6cf7;
  padding: 0 0.5rem;
}
nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.nav-item {
  display: block;
  color: #aab;
  text-decoration: none;
  padding: 0.55rem 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover,
.nav-item.router-link-active {
  background: rgba(74, 108, 247, 0.2);
  color: white;
}
.nav-divider {
  height: 1px;
  background: rgba(255,255,255,0.1);
  margin: 0.5rem 0;
}
.nav-section {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(255,255,255,0.35);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.25rem 0.75rem 0.1rem;
}
.nav-sub {
  padding-left: 1.25rem;
  font-size: 0.85rem;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
  min-width: 0;
}
.header {
  background: white;
  padding: 0.9rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.page-title {
  font-weight: 600;
  font-size: 1rem;
  color: #1a1a2e;
}
.logout-btn {
  padding: 0.35rem 0.9rem;
  background: transparent;
  border: 1px solid #e53e3e;
  color: #e53e3e;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.15s;
}
.logout-btn:hover {
  background: #fff5f5;
}
.content {
  padding: 1.5rem;
  flex: 1;
}
</style>
