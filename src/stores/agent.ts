import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/network'

export interface AgentInfo {
  agentId: string
  name: string
  systemPrompt: string
  defaultModel: string | null
  temperature: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export const useAgentStore = defineStore('agent', () => {
  const agents = ref<AgentInfo[]>([])
  const models = ref<string[]>([])
  const llmHealthy = ref<boolean | null>(null)

  // 현재 선택된 설정
  const selectedAgentId = ref<string | undefined>(undefined)
  const selectedModel = ref<string>('llama3.2')

  // 세션별 대화 히스토리 (UI 표시용, 실제 컨텍스트는 서버 Redis에서 관리)
  const sessionId = ref<string>(generateSessionId())
  const messages = ref<ChatMessage[]>([])

  async function loadAgentsAndModels() {
    try {
      const [agentRes, healthRes] = await Promise.allSettled([
        api.getAgents(),
        api.getAgentHealth(),
      ])

      if (agentRes.status === 'fulfilled') {
        agents.value = agentRes.value.data
      }

      if (healthRes.status === 'fulfilled') {
        const health = healthRes.value.data
        llmHealthy.value = health.healthy
        models.value = health.models
        if (health.models.length && !health.models.includes(selectedModel.value)) {
          selectedModel.value = health.models[0]
        }
      } else {
        llmHealthy.value = false
      }
    } catch {
      llmHealthy.value = false
    }
  }

  function addUserMessage(content: string) {
    messages.value.push({ role: 'user', content, timestamp: Date.now() })
  }

  function startAssistantMessage(): ChatMessage {
    const msg: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now() }
    messages.value.push(msg)
    return msg
  }

  function appendToLastAssistantMessage(chunk: string) {
    const last = messages.value.at(-1)
    if (last?.role === 'assistant') last.content += chunk
  }

  function newSession() {
    sessionId.value = generateSessionId()
    messages.value = []
  }

  return {
    agents,
    models,
    llmHealthy,
    selectedAgentId,
    selectedModel,
    sessionId,
    messages,
    loadAgentsAndModels,
    addUserMessage,
    startAssistantMessage,
    appendToLastAssistantMessage,
    newSession,
  }
})

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
