import { marked } from 'marked'
import DOMPurify from 'dompurify'

// 코드블록에 언어 표시를 위한 renderer 설정
const renderer = new marked.Renderer()

renderer.code = ({ text, lang }) => {
  const language = lang ?? ''
  return `<div class="code-block"><div class="code-lang">${language}</div><pre><code>${escapeHtml(text)}</code></pre></div>`
}

marked.setOptions({ renderer, breaks: true })

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// LLM 응답 텍스트를 안전한 HTML로 변환
// DOMPurify: <script>, onerror 등 XSS 벡터 제거
export function renderMarkdown(text: string): string {
  const raw = marked.parse(text) as string
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'blockquote', 'a', 'div', 'span'],
    ALLOWED_ATTR: ['href', 'class', 'target'],
  })
}
