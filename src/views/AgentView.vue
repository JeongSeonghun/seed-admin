<script setup lang="ts">
import { ref, nextTick, onMounted, computed } from 'vue'
import { useAgentStore, type ChatMessage } from '@/stores/agent'
import { useAgentStream } from '@/composables/useAgentStream'
import { renderMarkdown } from '@/composables/useMarkdown'
import api, { type AgentSessionSummary } from '@/network'

const store = useAgentStore()
const inputText = ref('')
const chatContainer = ref<HTMLElement | null>(null)

const sessions = ref<AgentSessionSummary[]>([])
const sessionsLoading = ref(false)

const { status, errorMessage, send, stop } = useAgentStream({
  onChunk(chunk) {
    store.appendToLastAssistantMessage(chunk)
    scrollToBottom()
  },
  onDone() {
    scrollToBottom()
  },
  onError(msg) {
    console.error('Agent error:', msg)
  },
})

const isStreaming = computed(() => status.value === 'streaming')

onMounted(() => {
  store.loadAgentsAndModels()
  loadSessions()
})

async function loadSessions() {
  sessionsLoading.value = true
  try {
    const res = await api.getAgentSessions({ limit: 20 })
    sessions.value = res.data
  } catch {
    sessions.value = []
  } finally {
    sessionsLoading.value = false
  }
}

async function resumeSession(sessionId: string) {
  if (isStreaming.value || sessionId === store.sessionId) return
  try {
    const res = await api.getAgentSessionHistory(sessionId)
    const history: ChatMessage[] = []
    for (const log of res.data) {
      history.push({ role: 'user', content: log.input, timestamp: new Date(log.createdAt).getTime() })
      history.push({ role: 'assistant', content: log.output, timestamp: new Date(log.createdAt).getTime() })
    }
    store.resumeSession(sessionId, history)
    await nextTick()
    scrollToBottom()
  } catch {
    // 세션 히스토리 로드 실패는 조용히 무시 - 콘솔은 그대로 사용 가능
  }
}

async function removeSession(sessionId: string) {
  if (!confirm('이 세션의 진행 중인 대화 컨텍스트를 초기화하시겠습니까? (로그 기록은 남습니다)')) return
  try {
    await api.deleteAgentSession(sessionId)
    if (sessionId === store.sessionId) store.newSession()
    await loadSessions()
  } catch {
    // noop
  }
}

function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function truncate(text: string, max = 36) {
  return text.length > max ? text.slice(0, max) + '…' : text
}

async function submit() {
  const text = inputText.value.trim()
  if (!text || isStreaming.value) return

  inputText.value = ''
  store.addUserMessage(text)
  store.startAssistantMessage()
  await nextTick()
  scrollToBottom()

  await send({
    message: text,
    sessionId: store.sessionId,
    agentId: store.selectedAgentId,
    model: store.selectedModel,
  })

  // SSE의 "done" 이벤트 파싱에 기대지 않고, send()가 끝나면(성공/에러 무관) 항상
  // 세션 목록을 새로고침 — 스트림 종료 타이밍에 따라 onDone이 안 불릴 수 있음.
  await loadSessions()
}

function onKeydown(e: KeyboardEvent) {
  // Shift+Enter: 줄바꿈 / Enter: 전송
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

function newSession() {
  stop()
  store.newSession()
}
</script>

<template>
  <div class="agent-layout">

    <!-- 사이드 패널: 설정 -->
    <aside class="agent-sidebar">
      <div class="panel-title">Agent 설정</div>

      <!-- LLM 상태 -->
      <div class="status-badge" :class="store.llmHealthy === true ? 'ok' : store.llmHealthy === false ? 'err' : 'loading'">
        <span class="dot" />
        {{ store.llmHealthy === true ? 'LLM 연결됨' : store.llmHealthy === false ? 'LLM 연결 끊김' : '확인 중...' }}
      </div>

      <!-- Agent 선택 -->
      <label class="field-label">Agent</label>
      <select v-model="store.selectedAgentId" class="select">
        <option :value="undefined">기본 (프롬프트 없음)</option>
        <option v-for="a in store.agents" :key="a.agentId" :value="a.agentId">
          {{ a.name }}
        </option>
      </select>

      <!-- 모델 선택 -->
      <label class="field-label">모델</label>
      <select v-model="store.selectedModel" class="select">
        <option v-if="store.models.length === 0" value="llama3.2">llama3.2</option>
        <option v-for="m in store.models" :key="m" :value="m">{{ m }}</option>
      </select>

      <!-- 세션 정보 -->
      <div class="session-info">
        <span class="field-label">세션 ID</span>
        <code class="session-id">{{ store.sessionId }}</code>
      </div>

      <button class="btn-outline" @click="newSession">새 대화 시작</button>

      <!-- 최근 세션 목록 -->
      <div class="sessions-panel">
        <span class="field-label">최근 세션</span>
        <div v-if="sessionsLoading" class="loading-sm">로드 중...</div>
        <div v-else-if="sessions.length === 0" class="no-data">세션 없음</div>
        <div v-else class="session-list">
          <div
            v-for="s in sessions"
            :key="s.sessionId"
            class="session-item"
            :class="{ active: s.sessionId === store.sessionId }"
            @click="resumeSession(s.sessionId)"
          >
            <div class="session-item-top">
              <span class="session-item-agent">{{ s.agentId ?? '기본' }}</span>
              <button class="session-item-del" title="세션 초기화" @click.stop="removeSession(s.sessionId)">✕</button>
            </div>
            <div class="session-item-preview">{{ truncate(s.lastMessage) }}</div>
            <div class="session-item-date">{{ formatSessionDate(s.updatedAt) }}</div>
          </div>
        </div>
      </div>
    </aside>

    <!-- 채팅 영역 -->
    <div class="chat-wrap">
      <div class="chat-messages" ref="chatContainer">
        <div v-if="store.messages.length === 0" class="empty-state">
          Agent에게 메시지를 보내보세요
        </div>

        <div
          v-for="(msg, i) in store.messages"
          :key="i"
          class="message-row"
          :class="msg.role"
        >
          <div class="bubble">
            <!-- user: 줄바꿈만 처리 / assistant: 마크다운 렌더링 -->
            <span v-if="msg.role === 'user'" class="text">{{ msg.content }}</span>
            <span
              v-else
              class="md-content"
              v-html="renderMarkdown(msg.content)"
            />
            <span
              v-if="isStreaming && msg.role === 'assistant' && i === store.messages.length - 1"
              class="cursor"
            />
          </div>
          <div class="timestamp">
            {{ new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) }}
          </div>
        </div>
      </div>

      <!-- 에러 배너 -->
      <div v-if="errorMessage" class="error-bar">
        {{ errorMessage }}
      </div>

      <!-- 입력창 -->
      <div class="input-area">
        <textarea
          v-model="inputText"
          class="input-box"
          :placeholder="isStreaming ? '응답 대기 중...' : '메시지 입력 (Enter: 전송 / Shift+Enter: 줄바꿈)'"
          :disabled="isStreaming"
          rows="3"
          @keydown="onKeydown"
        />
        <div class="input-actions">
          <button v-if="isStreaming" class="btn-stop" @click="stop">중단</button>
          <button v-else class="btn-send" :disabled="!inputText.trim()" @click="submit">
            전송
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.agent-layout {
  display: flex;
  height: calc(100vh - 120px);
  gap: 1rem;
}

/* 사이드 패널 */
.agent-sidebar {
  width: 260px;
  flex-shrink: 0;
  background: white;
  border-radius: 10px;
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  min-height: 0;
  overflow: hidden;
}
.panel-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: #1a1a2e;
  margin-bottom: 0.25rem;
}
.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  font-weight: 600;
}
.status-badge.ok   { background: #f0fff4; color: #276749; }
.status-badge.err  { background: #fff5f5; color: #c53030; }
.status-badge.loading { background: #ebf4ff; color: #2b6cb0; }
.dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #718096;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.select {
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.85rem;
  background: white;
  color: #2d3748;
}
.session-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.session-id {
  font-size: 0.7rem;
  background: #f7fafc;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  color: #4a5568;
  word-break: break-all;
}
.btn-outline {
  padding: 0.5rem;
  background: transparent;
  border: 1px solid #4a6cf7;
  color: #4a6cf7;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.15s;
  flex-shrink: 0;
}
.btn-outline:hover { background: #ebf0ff; }

/* 최근 세션 목록 */
.sessions-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  overflow: hidden;
}
.loading-sm, .no-data {
  font-size: 0.78rem;
  color: #a0aec0;
}
.session-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.session-item {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0.5rem 0.6rem;
  cursor: pointer;
  transition: border-color 0.15s;
}
.session-item:hover { border-color: #bee3f8; }
.session-item.active { border-color: #4a6cf7; background: #f5f8ff; }
.session-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}
.session-item-agent {
  font-size: 0.72rem;
  font-family: monospace;
  color: #4a6cf7;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.session-item-del {
  border: none;
  background: transparent;
  color: #a0aec0;
  cursor: pointer;
  font-size: 0.7rem;
  padding: 0 0.2rem;
  flex-shrink: 0;
}
.session-item-del:hover { color: #c53030; }
.session-item-preview {
  font-size: 0.76rem;
  color: #4a5568;
  margin-top: 0.15rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.session-item-date {
  font-size: 0.68rem;
  color: #a0aec0;
  margin-top: 0.15rem;
}

/* 채팅 영역 */
.chat-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  overflow: hidden;
  min-width: 0;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a0aec0;
  font-size: 0.9rem;
}
.message-row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.message-row.user   { align-items: flex-end; }
.message-row.assistant { align-items: flex-start; }

.bubble {
  max-width: 72%;
  padding: 0.65rem 0.9rem;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.user .bubble {
  background: #4a6cf7;
  color: white;
  border-bottom-right-radius: 3px;
}
.assistant .bubble {
  background: #f7f8fa;
  color: #2d3748;
  border-bottom-left-radius: 3px;
  border: 1px solid #e2e8f0;
}

/* 스트리밍 커서 */
.cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: #4a6cf7;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 0.8s step-end infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}

.timestamp {
  font-size: 0.7rem;
  color: #a0aec0;
  padding: 0 0.25rem;
}

/* 에러 */
.error-bar {
  background: #fff5f5;
  border-top: 1px solid #fed7d7;
  color: #c53030;
  padding: 0.6rem 1.25rem;
  font-size: 0.85rem;
}

/* 입력창 */
.input-area {
  border-top: 1px solid #e2e8f0;
  padding: 1rem 1.25rem;
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}
.input-box {
  flex: 1;
  padding: 0.65rem 0.9rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  resize: none;
  outline: none;
  font-family: inherit;
  color: #2d3748;
  transition: border-color 0.15s;
}
.input-box:focus { border-color: #4a6cf7; }
.input-box:disabled { background: #f7fafc; color: #a0aec0; }

.input-actions {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.btn-send, .btn-stop {
  padding: 0.6rem 1.1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  font-weight: 600;
  transition: background 0.15s;
}
.btn-send {
  background: #4a6cf7;
  color: white;
}
.btn-send:hover:not(:disabled) { background: #3a5ce7; }
.btn-send:disabled { background: #bee3f8; cursor: not-allowed; }
.btn-stop {
  background: #fc8181;
  color: white;
}
.btn-stop:hover { background: #f56565; }

/* 마크다운 렌더링 — scoped 안에서 v-html 내부를 스타일링하려면 :deep() 필요 */
.md-content { display: block; }
.md-content :deep(p)          { margin: 0 0 0.6em; line-height: 1.65; }
.md-content :deep(p:last-child) { margin-bottom: 0; }
.md-content :deep(strong)     { font-weight: 700; }
.md-content :deep(em)         { font-style: italic; }
.md-content :deep(ul), .md-content :deep(ol) { padding-left: 1.4em; margin: 0.4em 0; }
.md-content :deep(li)         { margin: 0.2em 0; }
.md-content :deep(blockquote) {
  border-left: 3px solid #4a6cf7; margin: 0.6em 0;
  padding: 0.3em 0.8em; color: #718096; background: #f0f4ff; border-radius: 0 4px 4px 0;
}
.md-content :deep(code) {
  background: #1a1a2e; color: #a8d8a8;
  padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.82em; font-family: monospace;
}
.md-content :deep(.code-block) {
  background: #1a1a2e; border-radius: 8px; margin: 0.6em 0; overflow: hidden;
}
.md-content :deep(.code-lang) {
  padding: 0.3em 0.8em; font-size: 0.72em; color: #718096;
  background: #0d0d1a; font-family: monospace; border-bottom: 1px solid #2d2d4e;
}
.md-content :deep(.code-block pre) {
  margin: 0; padding: 0.8em 1em; overflow-x: auto;
}
.md-content :deep(.code-block code) {
  background: none; padding: 0; color: #a8d8a8; font-size: 0.85em;
}
.md-content :deep(h1), .md-content :deep(h2), .md-content :deep(h3) {
  margin: 0.5em 0 0.3em; font-weight: 700; line-height: 1.3;
}
.md-content :deep(a) { color: #4a6cf7; text-decoration: underline; }
</style>
