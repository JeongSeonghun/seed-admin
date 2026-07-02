import { ref } from 'vue'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8900/api'

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error'

export interface UseAgentStreamOptions {
  onChunk?: (chunk: string) => void
  onDone?: (fullText: string) => void
  onError?: (message: string) => void
}

export function useAgentStream(options: UseAgentStreamOptions = {}) {
  const response = ref('')
  const status = ref<StreamStatus>('idle')
  const errorMessage = ref<string | null>(null)

  let abortController: AbortController | null = null

  async function send(payload: {
    message: string
    sessionId?: string
    agentId?: string
    model?: string
    temperature?: number
  }) {
    // 진행 중 스트림이 있으면 먼저 취소
    stop()

    response.value = ''
    errorMessage.value = null
    status.value = 'streaming'

    abortController = new AbortController()

    const token = localStorage.getItem('access_token')

    let res: Response
    try {
      res = await fetch(`${BASE_URL}/agent/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      })
    } catch (err: any) {
      if (err.name === 'AbortError') {
        status.value = 'idle'
        return
      }
      errorMessage.value = `서버 연결 실패: ${err.message}`
      status.value = 'error'
      options.onError?.(errorMessage.value)
      return
    }

    if (!res.ok) {
      errorMessage.value = `HTTP ${res.status}`
      status.value = 'error'
      options.onError?.(errorMessage.value)
      return
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // SSE 파싱: "data: {json}\n\n" 형식
        // 네트워크 청크가 줄 경계와 일치하지 않을 수 있어 버퍼로 처리
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'chunk') {
              response.value += event.content
              options.onChunk?.(event.content)
            } else if (event.type === 'done') {
              status.value = 'done'
              options.onDone?.(response.value)
            } else if (event.type === 'error') {
              errorMessage.value = event.message
              status.value = 'error'
              options.onError?.(event.message)
            }
          } catch {
            // 불완전 JSON 무시
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        errorMessage.value = `스트림 오류: ${err.message}`
        status.value = 'error'
        options.onError?.(errorMessage.value)
      }
    } finally {
      reader.releaseLock()
      if (status.value === 'streaming') status.value = 'done'
      abortController = null
    }
  }

  function stop() {
    if (abortController) {
      abortController.abort()
      abortController = null
      status.value = 'idle'
    }
  }

  return { response, status, errorMessage, send, stop }
}
