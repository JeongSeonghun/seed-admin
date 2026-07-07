<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/network'
import type { AgentInfo } from '@/stores/agent'
import type { AgentPromptVersion } from '@/network'

const agents = ref<AgentInfo[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

// 편집 패널 상태
const editing = ref<AgentInfo | null>(null)
const isNew = ref(false)

const form = ref({
  agentId: '',
  name: '',
  systemPrompt: '',
  defaultModel: '',
  temperature: 0.7,
})

// 버전 이력
const versions = ref<AgentPromptVersion[]>([])
const versionsLoading = ref(false)
const expandedVersion = ref<number | null>(null)
const rollingBack = ref<number | null>(null)

onMounted(loadAgents)

async function loadAgents() {
  loading.value = true
  error.value = null
  try {
    const res = await api.getAgents()
    agents.value = res.data
  } catch {
    error.value = 'Agent 목록 로드 실패'
  } finally {
    loading.value = false
  }
}

function openNew() {
  isNew.value = true
  editing.value = null
  versions.value = []
  form.value = { agentId: '', name: '', systemPrompt: '', defaultModel: '', temperature: 0.7 }
}

async function openEdit(agent: AgentInfo) {
  isNew.value = false
  editing.value = agent
  form.value = {
    agentId: agent.agentId,
    name: agent.name,
    systemPrompt: agent.systemPrompt,
    defaultModel: agent.defaultModel ?? '',
    temperature: agent.temperature,
  }
  await loadVersions(agent.agentId)
}

async function loadVersions(agentId: string) {
  versionsLoading.value = true
  expandedVersion.value = null
  try {
    const res = await api.getAgentPromptVersions(agentId)
    versions.value = res.data
  } catch {
    versions.value = []
  } finally {
    versionsLoading.value = false
  }
}

function closePanel() {
  editing.value = null
  isNew.value = false
  versions.value = []
}

async function save() {
  if (!form.value.agentId || !form.value.name || !form.value.systemPrompt) return
  saving.value = true
  error.value = null
  try {
    await api.upsertAgent(form.value.agentId, {
      name: form.value.name,
      systemPrompt: form.value.systemPrompt,
      defaultModel: form.value.defaultModel || undefined,
      temperature: form.value.temperature,
    })
    const agentId = form.value.agentId
    closePanel()
    await loadAgents()
    const saved = agents.value.find((a) => a.agentId === agentId)
    if (saved) await openEdit(saved)
  } catch {
    error.value = '저장 실패'
  } finally {
    saving.value = false
  }
}

async function remove(agentId: string) {
  if (!confirm(`'${agentId}' Agent를 비활성화하시겠습니까?`)) return
  try {
    await api.deleteAgent(agentId)
    await loadAgents()
    if (editing.value?.agentId === agentId) closePanel()
  } catch {
    error.value = '삭제 실패'
  }
}

async function rollback(agentId: string, version: number) {
  if (!confirm(`v${version}로 롤백하시겠습니까? (현재 내용이 새 버전으로 한 번 더 저장됩니다)`)) return
  rollingBack.value = version
  try {
    await api.rollbackAgentPrompt(agentId, version)
    await loadAgents()
    const saved = agents.value.find((a) => a.agentId === agentId)
    if (saved) await openEdit(saved)
  } catch {
    error.value = '롤백 실패'
  } finally {
    rollingBack.value = null
  }
}

function toggleExpand(version: number) {
  expandedVersion.value = expandedVersion.value === version ? null : version
}

function truncate(text: string, max = 60) {
  return text.length > max ? text.slice(0, max) + '…' : text
}
</script>

<template>
  <div class="prompts-layout">

    <!-- 목록 패널 -->
    <div class="list-panel">
      <div class="panel-header">
        <h2 class="panel-title">Agent 목록</h2>
        <button class="btn-primary" @click="openNew">+ 새 Agent</button>
      </div>

      <div v-if="error" class="error-bar">{{ error }}</div>
      <div v-if="loading" class="placeholder">로드 중...</div>

      <div v-else-if="agents.length === 0" class="placeholder">
        등록된 Agent가 없습니다.
      </div>

      <div
        v-for="agent in agents"
        :key="agent.agentId"
        class="agent-card"
        :class="{ active: editing?.agentId === agent.agentId }"
        @click="openEdit(agent)"
      >
        <div class="agent-name">{{ agent.name }}</div>
        <div class="agent-id">
          {{ agent.agentId }}
          <span v-if="agent.currentVersion" class="version-chip">v{{ agent.currentVersion }}</span>
        </div>
        <div class="agent-meta">
          모델: {{ agent.defaultModel ?? '요청 시 지정' }}
          &nbsp;·&nbsp; temperature: {{ agent.temperature }}
        </div>
        <button
          class="btn-delete"
          @click.stop="remove(agent.agentId)"
        >삭제</button>
      </div>
    </div>

    <!-- 편집 패널 -->
    <div v-if="editing !== null || isNew" class="edit-panel">
      <div class="panel-header">
        <h2 class="panel-title">{{ isNew ? '새 Agent 추가' : 'Agent 편집' }}</h2>
        <button class="btn-ghost" @click="closePanel">✕</button>
      </div>

      <div class="form">
        <label class="field-label">Agent ID <span class="required">*</span></label>
        <input
          v-model="form.agentId"
          class="input"
          placeholder="예: customer-support"
          :disabled="!isNew"
        />
        <p class="field-hint">영문/숫자/-만 사용. 한 번 설정 후 변경 불가.</p>

        <label class="field-label">이름 <span class="required">*</span></label>
        <input v-model="form.name" class="input" placeholder="예: 고객 지원 봇" />

        <label class="field-label">기본 모델</label>
        <input v-model="form.defaultModel" class="input" placeholder="예: llama3.2 (비워두면 요청 시 지정)" />

        <label class="field-label">Temperature</label>
        <div class="slider-row">
          <input
            v-model.number="form.temperature"
            type="range"
            min="0" max="2" step="0.1"
            class="slider"
          />
          <span class="slider-value">{{ form.temperature.toFixed(1) }}</span>
        </div>
        <p class="field-hint">0 = 일관성, 2 = 창의성</p>

        <label class="field-label">System Prompt <span class="required">*</span></label>
        <textarea
          v-model="form.systemPrompt"
          class="textarea"
          rows="12"
          placeholder="AI의 역할, 말투, 제약 조건 등을 입력하세요."
        />

        <div class="form-actions">
          <button class="btn-ghost" @click="closePanel">취소</button>
          <button
            class="btn-primary"
            :disabled="saving || !form.agentId || !form.name || !form.systemPrompt"
            @click="save"
          >
            {{ saving ? '저장 중...' : '저장' }}
          </button>
        </div>
      </div>

      <!-- 버전 이력 (기존 Agent 편집 시에만) -->
      <div v-if="!isNew" class="version-section">
        <div class="section-title">버전 이력</div>
        <div v-if="versionsLoading" class="placeholder">로드 중...</div>
        <div v-else-if="versions.length === 0" class="placeholder">이력이 없습니다.</div>
        <div v-else class="version-list">
          <div
            v-for="v in versions"
            :key="v.version"
            class="version-item"
            :class="{ current: v.version === editing?.currentVersion }"
          >
            <div class="version-row" @click="toggleExpand(v.version)">
              <span class="version-badge">v{{ v.version }}</span>
              <span v-if="v.version === editing?.currentVersion" class="current-tag">현재</span>
              <span class="version-preview">{{ truncate(v.systemPrompt) }}</span>
              <span class="version-date">{{ new Date(v.createdAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }}</span>
            </div>
            <div v-if="expandedVersion === v.version" class="version-detail">
              <pre class="pre-box">{{ v.systemPrompt }}</pre>
              <div class="version-detail-meta">
                모델: {{ v.defaultModel ?? '요청 시 지정' }} &nbsp;·&nbsp; temperature: {{ v.temperature }}
              </div>
              <button
                v-if="v.version !== editing?.currentVersion"
                class="btn-outline btn-sm"
                :disabled="rollingBack === v.version"
                @click="rollback(editing!.agentId, v.version)"
              >
                {{ rollingBack === v.version ? '롤백 중...' : `이 버전으로 롤백` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 편집 패널이 없을 때 안내 -->
    <div v-else class="empty-panel">
      Agent를 선택하거나 새 Agent를 추가하세요.
    </div>

  </div>
</template>

<style scoped>
.prompts-layout {
  display: flex;
  gap: 1.25rem;
  height: calc(100vh - 120px);
}

/* 목록 패널 */
.list-panel {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}
.agent-card {
  background: white;
  border-radius: 8px;
  padding: 0.9rem 1rem;
  cursor: pointer;
  border: 2px solid transparent;
  box-shadow: 0 1px 3px rgba(0,0,0,0.07);
  position: relative;
  transition: border-color 0.15s;
}
.agent-card:hover  { border-color: #bee3f8; }
.agent-card.active { border-color: #4a6cf7; }
.agent-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: #2d3748;
}
.agent-id {
  font-size: 0.75rem;
  color: #718096;
  font-family: monospace;
  margin-top: 0.15rem;
}
.agent-meta {
  font-size: 0.75rem;
  color: #a0aec0;
  margin-top: 0.4rem;
}
.btn-delete {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.72rem;
  background: transparent;
  border: 1px solid #fed7d7;
  color: #c53030;
  border-radius: 4px;
  cursor: pointer;
}
.btn-delete:hover { background: #fff5f5; }

/* 편집 패널 */
.edit-panel {
  flex: 1;
  background: white;
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  overflow-y: auto;
}
.empty-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a0aec0;
  font-size: 0.9rem;
  background: white;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

/* 폼 */
.form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.field-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #4a5568;
  margin-top: 0.5rem;
}
.required { color: #e53e3e; }
.field-hint {
  font-size: 0.72rem;
  color: #a0aec0;
  margin: 0;
}
.input, .textarea {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #2d3748;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.input:focus, .textarea:focus {
  outline: none;
  border-color: #4a6cf7;
}
.input:disabled { background: #f7fafc; color: #a0aec0; }
.textarea { resize: vertical; }

.slider-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.slider { flex: 1; }
.slider-value {
  width: 2.5rem;
  text-align: right;
  font-size: 0.9rem;
  font-weight: 600;
  color: #4a6cf7;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
  margin-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
}

/* 공통 버튼 */
.btn-primary {
  padding: 0.55rem 1.1rem;
  background: #4a6cf7;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover:not(:disabled) { background: #3a5ce7; }
.btn-primary:disabled { background: #a0aec0; cursor: not-allowed; }
.btn-ghost {
  padding: 0.55rem 1rem;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #4a5568;
  cursor: pointer;
}
.btn-ghost:hover { background: #f7fafc; }

.placeholder {
  color: #a0aec0;
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem 0;
}
.error-bar {
  background: #fff5f5;
  border: 1px solid #fed7d7;
  color: #c53030;
  padding: 0.6rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

/* 버전 뱃지 (목록 카드) */
.version-chip {
  display: inline-block;
  margin-left: 0.4rem;
  padding: 0.05rem 0.4rem;
  background: #ebf4ff;
  color: #2b6cb0;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  vertical-align: middle;
}

/* 버전 이력 */
.version-section {
  border-top: 1px solid #e2e8f0;
  padding-top: 1rem;
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.section-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #718096;
  text-transform: uppercase;
}
.version-list { display: flex; flex-direction: column; gap: 0.4rem; }
.version-item {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}
.version-item.current { border-color: #4a6cf7; }
.version-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 0.82rem;
}
.version-row:hover { background: #f7fafc; }
.version-badge {
  font-family: monospace;
  font-weight: 700;
  color: #4a5568;
  flex-shrink: 0;
}
.current-tag {
  background: #4a6cf7;
  color: white;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
  flex-shrink: 0;
}
.version-preview {
  flex: 1;
  color: #718096;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.version-date {
  font-size: 0.72rem;
  color: #a0aec0;
  flex-shrink: 0;
}
.version-detail {
  padding: 0.75rem;
  border-top: 1px solid #f0f2f5;
  background: #fafbfc;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.pre-box {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  font-size: 0.82rem;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
}
.version-detail-meta { font-size: 0.75rem; color: #a0aec0; }
.btn-outline {
  align-self: flex-start;
  padding: 0.4rem 0.8rem;
  background: transparent;
  border: 1px solid #4a6cf7;
  color: #4a6cf7;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-outline:hover:not(:disabled) { background: #ebf0ff; }
.btn-outline:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-sm { font-size: 0.78rem; }
</style>
